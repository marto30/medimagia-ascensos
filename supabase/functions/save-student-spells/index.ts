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

    const { studentName, spells } = await req.json();
    if (!studentName || !spells || typeof spells !== "object") {
      return new Response(JSON.stringify({ error: "Faltan datos (studentName, spells)" }), { status: 400, headers: CORS_HEADERS });
    }

    let studentId: string;

    if (isAdmin) {
      // Admins: pueden guardar para cualquier alumno
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
      // Alumnos: deben tener email @medimagia.test
      if (!callerEmail.toLowerCase().endsWith("@medimagia.test")) {
        return new Response(JSON.stringify({
          error: `Cuenta no válida. Email: ${callerEmail}`
        }), { status: 403, headers: CORS_HEADERS });
      }

      // Buscar el alumno por nombre (el nombre viene del cliente autenticado)
      const { data: student, error: studentErr } = await supabaseAdmin
        .from("students")
        .select("id, username")
        .eq("name", studentName)
        .single();

      if (studentErr || !student) {
        return new Response(JSON.stringify({
          error: `Alumno no encontrado: ${studentName}`
        }), { status: 404, headers: CORS_HEADERS });
      }

      // Verificación de propiedad: el email del caller debe corresponder al username del alumno.
      // Normalizamos ambos lados (solo alfanumérico minúscula) para tolerar formatos distintos.
      const callerEmailUser   = callerEmail.replace(/@medimagia\.test$/i, "");
      const callerNorm        = callerEmailUser.toLowerCase().replace(/[^a-z0-9]/g, "");
      const studentUsernameDB = (student.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      if (studentUsernameDB && callerNorm && studentUsernameDB !== callerNorm) {
        // Hay username en BD y no coincide con el email del caller → acceso denegado
        return new Response(JSON.stringify({
          error: `Forbidden: email_prefix=${callerNorm} no coincide con username=${studentUsernameDB}`
        }), { status: 403, headers: CORS_HEADERS });
      }

      // Si username en BD está vacío/null, vincular automáticamente
      if (!student.username && callerNorm) {
        await supabaseAdmin
          .from("students")
          .update({ username: callerNorm })
          .eq("id", student.id);
      }

      studentId = student.id;
    }

    // Traer todos los hechizos de golpe
    const spellNames = Object.keys(spells);
    const { data: spellRows, error: spellsErr } = await supabaseAdmin
      .from("spells")
      .select("id, name")
      .in("name", spellNames);
    if (spellsErr) throw spellsErr;

    const spellMap: Record<string, string> = {};
    for (const row of spellRows || []) spellMap[row.name] = row.id;

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

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[save-student-spells] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
