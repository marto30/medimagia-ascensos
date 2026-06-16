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

    const callerEmail    = callerData.user.email || "";
    // Normalizar igual que authEmailForUsername: solo alfanumérico minúscula.
    // Necesario porque el email pudo crearse con otro proceso (p.ej. "juan.garcia@medimagia.test"
    // en vez de "juangarcia@medimagia.test") mientras students.username siempre es alfanumérico puro.
    const callerUsername = callerEmail.replace(/@medimagia\.test$/i, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const callerRole     = (callerData.user.user_metadata as any)?.role;
    const isAdmin        = ["admin", "superadmin"].includes(callerRole);

    const { studentName, spells } = await req.json();
    if (!studentName || !spells || typeof spells !== "object") {
      return new Response(JSON.stringify({ error: "Faltan datos (studentName, spells)" }), { status: 400, headers: CORS_HEADERS });
    }

    let studentId: string;

    if (isAdmin) {
      // Admins: buscar alumno por nombre (pueden guardar para cualquiera)
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
      // Alumnos: buscar por su propio callerUsername (derivado del email de Auth)
      // Esto es seguro porque el JWT está validado; el alumno SOLO puede guardar sus propios datos.
      const { data: ownStudent, error: lookupErr } = await supabaseAdmin
        .from("students")
        .select("id, name")
        .eq("username", callerUsername)
        .single();

      if (lookupErr || !ownStudent) {
        // Fallback: si students.username es NULL (alumno sin username asignado aún),
        // vincular automáticamente el username al alumno con ese nombre.
        // Solo se permite si studentName coincide con la búsqueda y callerUsername no está en uso.
        const { data: studentByName } = await supabaseAdmin
          .from("students")
          .select("id, username")
          .eq("name", studentName)
          .single();

        if (!studentByName) {
          return new Response(JSON.stringify({ error: "Tu cuenta no está vinculada a ningún perfil. Pide al administrador que genere tus credenciales." }), { status: 403, headers: CORS_HEADERS });
        }

        if (studentByName.username !== null && studentByName.username !== "") {
          // El alumno tiene username pero no coincide con callerUsername
          return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS_HEADERS });
        }

        // username es null — vincularlo a este callerUsername y continuar
        await supabaseAdmin
          .from("students")
          .update({ username: callerUsername })
          .eq("id", studentByName.id);

        studentId = studentByName.id;
      } else {
        // Verificar que el alumno encontrado por username coincide con el studentName enviado
        if (ownStudent.name !== studentName) {
          return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS_HEADERS });
        }
        studentId = ownStudent.id;
      }
    }

    // Traer todos los hechizos de golpe para evitar N+1 queries
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
