// =====================================================================
// EDGE FUNCTION: admin-legacy-login
// Autenticación heredada para admin/superadmin (SHA-256 + migration)
// =====================================================================
// POST /functions/v1/admin-legacy-login
// Body: { password: string, role: "admin" | "superadmin" }
// Response: { success: boolean, userId?: string, role?: string, error?: string }
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

interface RequestBody {
  password: string;
  role?: "admin" | "superadmin"; // Si no especifica, asumir admin
}

interface AdminLegacyCredential {
  id: string;
  role: "admin" | "superadmin";
  password_hash_sha256: string;
  auth_user_id: string | null;
  migrated_at: string | null;
}

interface LoginResponse {
  success: boolean;
  userId?: string;
  role?: string;
  message?: string;
  error?: string;
}

// SHA-256 helper
async function sha256(str: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Decodificar base64 (como _s() del frontend)
function decodeS(a: string, b: string, c: string): string {
  return atob(a) + atob(b) + atob(c);
}

// Hash de contraseña de admin (idéntico al frontend)
async function hashAdminPassword(pwd: string): Promise<string> {
  const salt = decodeS("bWVkaW1hZ2lh", "X3N0dWRlbnRf", "djFf"); // Mismo salt que estudiantes
  const fullStr = salt + pwd;
  return await sha256(fullStr);
}

// Timing-safe comparison
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default async (req: Request): Promise<Response> => {
  try {
    // CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parsear request
    const body = (await req.json()) as RequestBody;
    const { password, role = "admin" } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ error: "password requerida" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "superadmin"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "rol inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Inicializar cliente Supabase con service_role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Buscar credenciales legacy en tabla privada
    const { data: adminCreds, error: credError } = await supabaseAdmin
      .from("admin_legacy_credentials")
      .select("*")
      .eq("role", role)
      .single();

    if (credError || !adminCreds) {
      console.log(`[admin-legacy-login] Credenciales no encontradas para ${role}`);
      return new Response(
        JSON.stringify({ error: "Credenciales inválidas" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calcular hash del password recibido
    const receivedHash = await hashAdminPassword(password);

    // Comparación timing-safe
    if (!constantTimeCompare(receivedHash, adminCreds.password_hash_sha256)) {
      console.log(`[admin-legacy-login] Hash incorrecto para ${role}`);
      return new Response(
        JSON.stringify({ error: "Credenciales inválidas" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // ÉXITO: Credenciales válidas
    console.log(`[admin-legacy-login] Credenciales válidas para ${role}`);

    // Si ya está migrado, devolver directamente
    if (adminCreds.auth_user_id && adminCreds.migrated_at) {
      console.log(`[admin-legacy-login] ${role} ya está migrado`);
      return new Response(
        JSON.stringify({
          success: true,
          userId: adminCreds.auth_user_id,
          role: role,
          message: "Admin ya migrado, usa login normal"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Si NO está migrado, crear usuario en auth.users
    console.log(`[admin-legacy-login] Migrando ${role} a auth.users...`);

    // Email sintético único (admin o superadmin)
    const emailSynthetic = `${role}@medimagia.local`;

    let authUserId: string;

    // Buscar si ya existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === emailSynthetic);

    if (userExists) {
      authUserId = userExists.id;
      console.log(`[admin-legacy-login] Usuario auth ya existe: ${authUserId}`);
    } else {
      // Crear nuevo usuario en auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: emailSynthetic,
        password: password, // Usar la contraseña en claro recibida
        email_confirm: true,
        user_metadata: {
          role: role,
          migrated_from: "firestore_sha256"
        }
      });

      if (createError || !newUser?.user?.id) {
        console.error(`[admin-legacy-login] Error creando auth user:`, createError);
        return new Response(
          JSON.stringify({ error: "Error en migración de admin" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      authUserId = newUser.user.id;
      console.log(`[admin-legacy-login] Nuevo usuario auth creado: ${authUserId}`);
    }

    // Actualizar admin_legacy_credentials
    const { error: updateError } = await supabaseAdmin
      .from("admin_legacy_credentials")
      .update({
        auth_user_id: authUserId,
        migrated_at: new Date().toISOString()
      })
      .eq("id", adminCreds.id);

    if (updateError) {
      console.error(`[admin-legacy-login] Error actualizando legacy_credentials:`, updateError);
    }

    // Crear profile para admin
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          username: role,
          display_name: role === "superadmin" ? "Super Admin" : "Admin",
          role: role
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error(`[admin-legacy-login] Error creando profile:`, profileError);
    }

    console.log(`[admin-legacy-login] ✅ ${role} migrado exitosamente`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: authUserId,
        role: role,
        message: "Admin migrado a Supabase Auth"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[admin-legacy-login] Error no manejado:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
