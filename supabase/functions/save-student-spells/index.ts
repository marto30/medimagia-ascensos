import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS_HEADERS });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }

    const callerEmail = callerData.user.email || "";
    const callerRole  = (callerData.user.user_metadata as any)?.role;
    const isAdmin     = ["admin", "superadmin"].includes(callerRole);

    const body = await req.json();
    const { studentName, spells, action } = body;

    // ── ACTION: DELETE STUDENT ──
    if (action === "deleteStudent") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS_HEADERS });
      }
      if (!studentName) {
        return new Response(JSON.stringify({ error: "Falta studentName" }), { status: 400, headers: CORS_HEADERS });
      }

      const { data: student, error: findErr } = await supabaseAdmin
        .from("students")
        .select("id, username")
        .eq("name", studentName)
        .single();

      if (findErr || !student) {
        return new Response(JSON.stringify({ error: "Alumno no encontrado" }), { status: 404, headers: CORS_HEADERS });
      }

      // Borrar usuario de Supabase Auth si tiene username
      if (student.username) {
        const email = `${(student.username as string).toLowerCase().replace(/[^a-z0-9]/g, "")}@medimagia.test`;
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const authUser = (usersData?.users || []).find((u: any) => u.email === email);
        if (authUser) {
          await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        }
      }

      // Borrar el alumno con service_role (bypassa RLS, CASCADE elimina student_spells, infractions, etc.)
      const { error: deleteErr } = await supabaseAdmin
        .from("students")
        .delete()
        .eq("id", student.id);

      if (deleteErr) throw deleteErr;

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
    }

    // ── ACTION: LOAD (devuelve hechizos de todos los alumnos para el cliente) ──
    if (action === "load") {
      if (!isAdmin && !callerEmail.toLowerCase().endsWith("@medimagia.test")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS_HEADERS });
      }
      const { data: allSpells, error: loadErr } = await supabaseAdmin
        .from("student_spells")
        .select("student_id, source_spell_name, learned");
      if (loadErr) throw loadErr;
      return new Response(JSON.stringify({ success: true, spells: allSpells || [] }), { status: 200, headers: CORS_HEADERS });
    }

    // ── ACTION: SAVE (guardar hechizos) ──
    if (!studentName || !spells || typeof spells !== "object") {
      return new Response(JSON.stringify({ error: "Faltan datos (studentName, spells)" }), { status: 400, headers: CORS_HEADERS });
    }

    let studentId: string;

    if (isAdmin) {
      const { data: student, error: studentErr } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("name", studentName)
        .single();
      if (studentErr || !student) {
        return new Response(JSON.stringify({ error: "Alumno no encontrado" }), { status: 404, headers: CORS_HEADERS });
      }
      studentId = student.id;
    } else {
      if (!callerEmail.toLowerCase().endsWith("@medimagia.test")) {
        return new Response(JSON.stringify({ error: "Cuenta no válida" }), { status: 403, headers: CORS_HEADERS });
      }
      const callerNorm = callerEmail.replace(/@medimagia\.test$/i, "").toLowerCase().replace(/[^a-z0-9]/g, "");

      const { data: student, error: studentErr } = await supabaseAdmin
        .from("students")
        .select("id, username")
        .eq("name", studentName)
        .single();

      if (studentErr || !student) {
        return new Response(JSON.stringify({ error: `Alumno no encontrado: ${studentName}` }), { status: 404, headers: CORS_HEADERS });
      }

      const dbNorm = (student.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      if (dbNorm && callerNorm && dbNorm !== callerNorm) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS_HEADERS });
      }

      if (!student.username && callerNorm) {
        await supabaseAdmin.from("students").update({ username: callerNorm }).eq("id", student.id);
      }

      studentId = student.id;
    }

    // Traer hechizos existentes en tabla spells
    const spellNames = Object.keys(spells);
    const { data: existingSpells, error: spellsErr } = await supabaseAdmin
      .from("spells")
      .select("id, name")
      .in("name", spellNames);
    if (spellsErr) throw spellsErr;

    const spellMap: Record<string, string> = {};
    for (const row of existingSpells || []) spellMap[row.name] = row.id;

    // Auto-crear los hechizos que no existen en la tabla spells
    const missingNames = spellNames.filter(n => !spellMap[n]);
    if (missingNames.length > 0) {
      const inserts = missingNames.map(n => ({ name: n, source_rank_name: n }));
      const { data: created, error: createErr } = await supabaseAdmin
        .from("spells")
        .upsert(inserts, { onConflict: "name" })
        .select("id, name");
      if (createErr) throw createErr;
      for (const row of created || []) spellMap[row.name] = row.id;
    }

    const upserts = spellNames
      .filter(name => spellMap[name])
      .map(name => ({
        student_id: studentId,
        spell_id:   spellMap[name],
        learned:    !!spells[name],
        source_spell_name: name
      }));

    if (upserts.length) {
      const { error: upsertErr } = await supabaseAdmin
        .from("student_spells")
        .upsert(upserts, { onConflict: "student_id,spell_id" });
      if (upsertErr) throw upsertErr;
    }

    return new Response(JSON.stringify({ success: true, saved: upserts.length }), { status: 200, headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[save-student-spells] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
