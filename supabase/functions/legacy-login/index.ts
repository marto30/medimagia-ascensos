import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

async function sha256(str: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function decodeS(a: string, b: string, c: string): string {
  return atob(a) + atob(b) + atob(c);
}

async function hashStudentPassword(pwd: string): Promise<string> {
  const salt = decodeS("bWVkaW1hZ2lh", "X3N0dWRlbnRf", "djFf");
  return await sha256(salt + pwd);
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS_HEADERS });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { username, password } = await req.json() as { username: string; password: string };
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "username y password requeridos" }), { status: 400, headers: CORS_HEADERS });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: legacyCreds, error: credError } = await supabaseAdmin
      .from("legacy_credentials")
      .select("*")
      .eq("username", username.toLowerCase())
      .single();

    if (credError || !legacyCreds) {
      console.log(`[legacy-login] Usuario no encontrado: ${username}`);
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), { status: 401, headers: CORS_HEADERS });
    }

    const receivedHash = await hashStudentPassword(password);
    if (!constantTimeCompare(receivedHash, (legacyCreds as any).password_hash_sha256)) {
      console.log(`[legacy-login] Hash incorrecto para ${username}`);
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), { status: 401, headers: CORS_HEADERS });
    }

    console.log(`[legacy-login] Credenciales válidas para ${username}`);

    if ((legacyCreds as any).auth_user_id && (legacyCreds as any).migrated_at) {
      console.log(`[legacy-login] ${username} ya está migrado`);
      return new Response(
        JSON.stringify({ success: true, userId: (legacyCreds as any).auth_user_id, studentId: (legacyCreds as any).student_id }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    console.log(`[legacy-login] Migrando ${username} a auth.users...`);
    const emailSynthetic = `${username.replace(/[^a-z0-9.]/g, "_")}@medimagia.local`;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailSynthetic,
      password: password,
      email_confirm: true,
      user_metadata: { username, student_id: (legacyCreds as any).student_id, role: "student", migrated_from: "firestore_sha256" }
    });

    if (createError) {
      if (createError.message?.includes("already exists") || createError.message?.includes("duplicate")) {
        console.log(`[legacy-login] Usuario auth ya existe`);
        return new Response(JSON.stringify({ success: true, studentId: (legacyCreds as any).student_id }), { status: 200, headers: CORS_HEADERS });
      }
      console.error(`[legacy-login] Error creando auth user:`, createError);
      return new Response(JSON.stringify({ error: "Error en migración de usuario" }), { status: 500, headers: CORS_HEADERS });
    }

    if (!newUser?.user?.id) {
      return new Response(JSON.stringify({ error: "Error en migración de usuario" }), { status: 500, headers: CORS_HEADERS });
    }

    const authUserId = newUser.user.id;
    console.log(`[legacy-login] Nuevo usuario auth creado: ${authUserId}`);

    await supabaseAdmin.from("legacy_credentials").update({ auth_user_id: authUserId, migrated_at: new Date().toISOString() }).eq("id", (legacyCreds as any).id);
    await supabaseAdmin.from("students").update({ profile_id: authUserId }).eq("id", (legacyCreds as any).student_id);
    await supabaseAdmin.from("profiles").upsert({ id: authUserId, username, display_name: username, role: "student" }, { onConflict: "id" });

    console.log(`[legacy-login] ✅ ${username} migrado exitosamente`);
    return new Response(
      JSON.stringify({ success: true, userId: authUserId, studentId: (legacyCreds as any).student_id }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[legacy-login] Error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500, headers: CORS_HEADERS });
  }
};
