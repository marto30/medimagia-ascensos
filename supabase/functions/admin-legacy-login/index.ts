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

async function hashAdminPassword(pwd: string): Promise<string> {
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
    const { password, role = "admin" } = await req.json() as { password: string; role?: "admin" | "superadmin" };
    if (!password || !["admin", "superadmin"].includes(role)) {
      return new Response(JSON.stringify({ error: "password y role (admin/superadmin) requeridos" }), { status: 400, headers: CORS_HEADERS });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: adminCreds, error: credError } = await supabaseAdmin
      .from("admin_legacy_credentials")
      .select("*")
      .eq("role", role)
      .single();

    if (credError || !adminCreds) {
      console.log(`[admin-legacy-login] Credenciales no encontradas para ${role}`);
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), { status: 401, headers: CORS_HEADERS });
    }

    const receivedHash = await hashAdminPassword(password);
    if (!constantTimeCompare(receivedHash, (adminCreds as any).password_hash_sha256)) {
      console.log(`[admin-legacy-login] Hash incorrecto para ${role}`);
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), { status: 401, headers: CORS_HEADERS });
    }

    console.log(`[admin-legacy-login] Credenciales válidas para ${role}`);

    if ((adminCreds as any).auth_user_id && (adminCreds as any).migrated_at) {
      console.log(`[admin-legacy-login] ${role} ya está migrado`);
      return new Response(
        JSON.stringify({ success: true, userId: (adminCreds as any).auth_user_id, role }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    console.log(`[admin-legacy-login] Migrando ${role} a auth.users...`);
    const emailSynthetic = `${role}@medimagia.local`;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailSynthetic,
      password: password,
      email_confirm: true,
      user_metadata: { role, migrated_from: "firestore_sha256" }
    });

    if (createError) {
      if (createError.message?.includes("already exists") || createError.message?.includes("duplicate")) {
        console.log(`[admin-legacy-login] Usuario auth ya existe`);
        return new Response(JSON.stringify({ success: true, role }), { status: 200, headers: CORS_HEADERS });
      }
      console.error(`[admin-legacy-login] Error creando auth user:`, createError);
      return new Response(JSON.stringify({ error: "Error en migración de admin" }), { status: 500, headers: CORS_HEADERS });
    }

    if (!newUser?.user?.id) {
      return new Response(JSON.stringify({ error: "Error en migración de admin" }), { status: 500, headers: CORS_HEADERS });
    }

    const authUserId = newUser.user.id;
    console.log(`[admin-legacy-login] Nuevo usuario auth creado: ${authUserId}`);

    await supabaseAdmin.from("admin_legacy_credentials").update({ auth_user_id: authUserId, migrated_at: new Date().toISOString() }).eq("id", (adminCreds as any).id);
    await supabaseAdmin.from("profiles").upsert({ id: authUserId, username: role, display_name: role === "superadmin" ? "Super Admin" : "Admin", role }, { onConflict: "id" });

    console.log(`[admin-legacy-login] ✅ ${role} migrado exitosamente`);
    return new Response(
      JSON.stringify({ success: true, userId: authUserId, role }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[admin-legacy-login] Error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500, headers: CORS_HEADERS });
  }
};
