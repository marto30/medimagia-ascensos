// =====================================================================
// EDGE FUNCTION: legacy-login
// Autenticación heredada para estudiantes (SHA-256 + migration)
// =====================================================================
// POST /functions/v1/legacy-login
// Body: { username: string, password: string }
// Response: { success: boolean, userId?: string, studentId?: string, error?: string }
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

// Tipos
interface RequestBody {
  username: string;
  password: string;
}

interface LegacyCredential {
  id: string;
  username: string;
  student_id: string;
  password_hash_sha256: string;
  auth_user_id: string | null;
  migrated_at: string | null;
}

interface Student {
  id: string;
  name: string;
  username: string;
}

interface LoginResponse {
  success: boolean;
  userId?: string;
  studentId?: string;
  message?: string;
  error?: string;
}

// SHA-256 helper (same as frontend)
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

// Hash de contraseña de estudiante (idéntico al frontend)
async function hashStudentPassword(pwd: string): Promise<string> {
  const salt = decodeS("bWVkaW1hZ2lh", "X3N0dWRlbnRf", "djFf");
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
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parsear request
    const body = (await req.json()) as RequestBody;
    const { username, password } = body;

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "username y password requeridos" }),
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
    const { data: legacyCreds, error: credError } = await supabaseAdmin
      .from("legacy_credentials")
      .select("*")
      .eq("username", username.toLowerCase())
      .single();

    if (credError || !legacyCreds) {
      // Usuario no encontrado o error
      console.log(`[legacy-login] Usuario no encontrado: ${username}`);
      return new Response(
        JSON.stringify({ error: "Credenciales inválidas" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calcular hash del password recibido
    const receivedHash = await hashStudentPassword(password);

    // Comparación timing-safe
    if (!constantTimeCompare(receivedHash, legacyCreds.password_hash_sha256)) {
      console.log(`[legacy-login] Hash incorrecto para ${username}`);
      return new Response(
        JSON.stringify({ error: "Credenciales inválidas" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // ÉXITO: Credenciales válidas
    console.log(`[legacy-login] Credenciales válidas para ${username}`);

    // Si ya está migrado, devolver directamente
    if (legacyCreds.auth_user_id && legacyCreds.migrated_at) {
      console.log(`[legacy-login] ${username} ya está migrado`);
      return new Response(
        JSON.stringify({
          success: true,
          userId: legacyCreds.auth_user_id,
          studentId: legacyCreds.student_id,
          message: "Usuario ya migrado, usa login normal"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Si NO está migrado, crear usuario en auth.users
    console.log(`[legacy-login] Migrando ${username} a auth.users...`);

    // Email sintético único y estable
    const emailSynthetic = `${username.replace(/[^a-z0-9.]/g, "_")}@medimagia.local`;

    let authUserId: string;

    // Intentar crear usuario directamente (más rápido que listUsers)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailSynthetic,
      password: password, // Usar la contraseña en claro recibida
      email_confirm: true, // Ya confirmar el email
      user_metadata: {
        username: username,
        student_id: legacyCreds.student_id,
        role: "student",
        migrated_from: "firestore_sha256"
      }
    });

    if (createError) {
      // Si el usuario ya existe (email duplicate), es ok
      if (createError.message?.includes("already exists") || createError.message?.includes("duplicate")) {
        console.log(`[legacy-login] Usuario auth ya existe`);
        // No podemos obtener el ID fácilmente, usar el student_id como aproximación
        // En este caso, el usuario ya está migrado
        return new Response(
          JSON.stringify({
            success: true,
            studentId: legacyCreds.student_id,
            message: "Usuario ya migrado"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      console.error(`[legacy-login] Error creando auth user:`, createError);
      return new Response(
        JSON.stringify({ error: "Error en migración de usuario" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!newUser?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Error en migración de usuario" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    authUserId = newUser.user.id;
    console.log(`[legacy-login] Nuevo usuario auth creado: ${authUserId}`);

    // Actualizar legacy_credentials con auth_user_id
    const { error: updateError } = await supabaseAdmin
      .from("legacy_credentials")
      .update({
        auth_user_id: authUserId,
        migrated_at: new Date().toISOString()
      })
      .eq("id", legacyCreds.id);

    if (updateError) {
      console.error(`[legacy-login] Error actualizando legacy_credentials:`, updateError);
    }

    // Actualizar students profile_id
    const { error: studentError } = await supabaseAdmin
      .from("students")
      .update({
        profile_id: authUserId
      })
      .eq("id", legacyCreds.student_id);

    if (studentError) {
      console.error(`[legacy-login] Error actualizando student:`, studentError);
    }

    // Crear profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          username: username,
          display_name: username,
          role: "student"
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error(`[legacy-login] Error creando profile:`, profileError);
    }

    console.log(`[legacy-login] ✅ ${username} migrado exitosamente`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: authUserId,
        studentId: legacyCreds.student_id,
        message: "Usuario migrado a Supabase Auth"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[legacy-login] Error no manejado:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
