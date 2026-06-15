import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

function authEmailForUsername(username: string): string {
  return `${String(username || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "")}@medimagia.test`;
}

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

    // Validar que quien llama es admin/superadmin
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
      return new Response(JSON.stringify({ error: "Forbidden - admin access required" }), { status: 403, headers: CORS_HEADERS });
    }

    const { name, username, password } = await req.json();
    if (!name || !username || !password) {
      return new Response(JSON.stringify({ error: "Faltan datos (name, username, password)" }), { status: 400, headers: CORS_HEADERS });
    }

    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .select("id, username")
      .eq("name", name)
      .single();

    if (studentErr || !student) {
      return new Response(JSON.stringify({ error: "Alumno no encontrado" }), { status: 404, headers: CORS_HEADERS });
    }

    const email = authEmailForUsername(username);

    // Buscar si ya existe un usuario de Auth con ese email
    const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;
    let authUser = listData?.users?.find(u => u.email === email) || null;

    if (authUser) {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password,
        user_metadata: { role: "student", name, username }
      });
      if (updateErr) throw updateErr;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "student", name, username }
      });
      if (createErr) throw createErr;
      authUser = created.user;
    }

    if (student.username !== username) {
      const { error: updErr } = await supabaseAdmin
        .from("students")
        .update({ username })
        .eq("id", student.id);
      if (updErr) throw updErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        username,
        auth_user_id: authUser?.id || null,
        credentials_updated_at: new Date().toISOString()
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("[create-student-user] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Error interno del servidor" }), { status: 500, headers: CORS_HEADERS });
  }
});
