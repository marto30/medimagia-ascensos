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

    // Verificar que el caller es admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }

    const callerRole = (callerData.user.user_metadata as any)?.role;
    if (!["admin", "superadmin"].includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS_HEADERS });
    }

    const { studentName } = await req.json();
    if (!studentName) {
      return new Response(JSON.stringify({ error: "Falta studentName" }), { status: 400, headers: CORS_HEADERS });
    }

    // Buscar el alumno
    const { data: student, error: findErr } = await supabaseAdmin
      .from("students")
      .select("id, username")
      .eq("name", studentName)
      .single();

    if (findErr || !student) {
      return new Response(JSON.stringify({ error: "Alumno no encontrado" }), { status: 404, headers: CORS_HEADERS });
    }

    // Borrar usuario de Supabase Auth si existe
    if (student.username) {
      const email = `${student.username.toLowerCase().replace(/[^a-z0-9]/g, "")}@medimagia.test`;
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const authUser = (usersData?.users || []).find((u: any) => u.email === email);
      if (authUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }
    }

    // Borrar el alumno con service_role — bypassa RLS, las FKs con CASCADE se borran solas
    const { error: deleteErr } = await supabaseAdmin
      .from("students")
      .delete()
      .eq("id", student.id);

    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[delete-student] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
