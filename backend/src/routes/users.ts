/**
 * @fileoverview users.ts — Router de Usuarios para la API de VennQuest.
 *
 * Maneja todos los endpoints relacionados con la gestión de usuarios:
 * - Obtención de usuarios (GET)
 * - Registro con contraseña encriptada (POST)
 * - Inicio de sesión (POST /login)
 * - Recuperación de contraseña por email (POST /forgot-password)
 * - Cambio de nombre de usuario con sugerencias (PUT /update-username)
 * - Cambio de contraseña verificando la actual (PUT /update-password)
 *
 * @module routes/users
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { query, get, run, persistDb } from "../db/database";

const router = Router();

// ======================================================================
// INTERFACES INTERNAS
// ======================================================================

/**
 * Representa la fila de un usuario en la base de datos.
 * Incluye el `password_hash` para las operaciones que lo necesitan.
 */
interface UserRow {
  id: number;
  username: string;
  password_hash?: string;
  email?: string;
  current_level: number;
  experience_points: number;
}

// ======================================================================
// CONFIGURACIÓN DE NODEMAILER
// ======================================================================

/**
 * Crea y retorna un transporter de Nodemailer configurado con las
 * variables de entorno del servidor.
 *
 * Variables de entorno requeridas en `.env`:
 * - `EMAIL_HOST` : Servidor SMTP          (ej. "smtp.gmail.com")
 * - `EMAIL_PORT` : Puerto SMTP            (ej. 587 para TLS, 465 para SSL)
 * - `EMAIL_USER` : Dirección del remitente (ej. "tu@gmail.com")
 * - `EMAIL_PASS` : App Password de Google  (NO la contraseña normal de Gmail)
 * - `EMAIL_FROM` : Nombre visible en "De:" (ej. "VennQuest <tu@gmail.com>")
 *
 * IMPORTANTE — Gmail requiere "App Password":
 *   1. Activar verificación en 2 pasos en tu cuenta Google.
 *   2. Ir a myaccount.google.com/apppasswords.
 *   3. Crear una App Password para "Correo" y copiarla en EMAIL_PASS.
 *   La contraseña normal de Gmail NO funciona con nodemailer.
 *
 * @returns {nodemailer.Transporter} Transporter listo para usar.
 * @throws  {Error} Si EMAIL_USER o EMAIL_PASS están vacíos.
 */
function createMailTransporter(): nodemailer.Transporter {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  /**
   * Validación temprana: falla inmediatamente con mensaje claro
   * en lugar de dejar que nodemailer falle con un error críptico de SMTP.
   * Analogía: verificar que tienes las llaves antes de llegar a la puerta.
   */
  if (!user || !pass) {
    console.error(
      "❌ [nodemailer] EMAIL_USER o EMAIL_PASS no están definidos en .env\n" +
        "   Agrega estas variables y reinicia el servidor.",
    );
    throw new Error(
      "El servidor no está configurado para enviar correos. Contacta al administrador.",
    );
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    /**
     * `secure: true` solo para puerto 465 (SSL directo).
     * Puerto 587 usa STARTTLS → secure debe ser false.
     */
    secure: process.env.EMAIL_PORT === "465",
    auth: { user, pass },
  });
}

// ======================================================================
// FUNCIONES AUXILIARES
// ======================================================================

/**
 * Diccionario de umbrales de XP por nivel.
 * Centralizado aquí para evitar repetición en los endpoints.
 */
const XP_THRESHOLDS: Record<number, number> = {
  1: 400,
  2: 900,
  3: 9999,
};

/**
 * Genera un array de hasta 3 sugerencias de nombres de usuario que
 * NO existen en la base de datos, basadas en el nombre solicitado.
 *
 * Estrategia: agrega sufijos numéricos aleatorios de 2 dígitos al nombre base
 * hasta encontrar 3 que estén disponibles (máximo 10 intentos totales).
 *
 * Analogía: como cuando intentas registrar un dominio .com que ya existe
 * y el registrador te sugiere variantes disponibles.
 *
 * @param {string} baseUsername — El nombre de usuario ya existente.
 * @returns {Promise<string[]>} Array de 1-3 nombres disponibles sugeridos.
 */
async function generateUsernameSuggestions(
  baseUsername: string,
): Promise<string[]> {
  const suggestions: string[] = [];
  const MAX_ATTEMPTS = 12;
  let attempts = 0;

  // Truncamos si el base es muy largo para dejar espacio a los números
  const truncated = baseUsername.slice(0, 16);

  while (suggestions.length < 3 && attempts < MAX_ATTEMPTS) {
    attempts++;
    const suffix = Math.floor(Math.random() * 90 + 10); // 10-99
    const candidate = `${truncated}${suffix}`;

    // Verificar disponibilidad en la base de datos
    const existing = await get<{ id: number }>(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(?)",
      [candidate],
    );

    if (!existing) {
      suggestions.push(candidate);
    }
  }

  return suggestions;
}

/**
 * Genera una contraseña temporal segura y legible.
 * Usa letras y números para que sea fácil de ingresar manualmente.
 *
 * @param {number} [length=10] — Longitud de la contraseña generada.
 * @returns {string} Contraseña temporal en texto plano.
 */
function generateTemporaryPassword(length = 10): string {
  // Caracteres que excluyen confusiones visuales (0, O, l, 1, I)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length },
    () => chars[crypto.randomInt(0, chars.length)],
  ).join("");
}

// ======================================================================
// ENDPOINTS
// ======================================================================

/**
 * GET /api/users
 * Retorna la lista de todos los usuarios registrados.
 * Útil para un ranking/leaderboard público.
 */
router.get("/", async (_req, res) => {
  const users = await query<UserRow>(
    "SELECT id, username, current_level, experience_points FROM users",
  );
  return res.json({ users });
});

/**
 * GET /api/users/:id
 * Retorna la información completa de un usuario por ID,
 * incluyendo la cantidad de problemas resueltos y el umbral de XP para subir de nivel.
 *
 * @param {string} req.params.id — ID numérico del usuario.
 * @returns {200} Objeto `{ user }` con datos del usuario y sus estadísticas.
 * @returns {404} Si el usuario no existe.
 */
router.get("/:id", async (req: Request, res: Response) => {
  const user = await get<UserRow>("SELECT * FROM users WHERE id = ?", [
    parseInt(req.params.id as string),
  ]);
  if (!user) return res.status(404).json({ error: "User not found" });

  const row = await get<{ c: number }>(
    "SELECT COUNT(DISTINCT problem_id) as c FROM user_progress WHERE user_id = ?",
    [user.id],
  );
  const solved = row?.c ?? 0;

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      current_level: user.current_level,
      experience_points: user.experience_points,
      xpForNextLevel: XP_THRESHOLDS[user.current_level] ?? 9999,
      solvedProblems: solved,
    },
  });
});

/**
 * POST /api/users
 * Registra un nuevo usuario con contraseña encriptada (bcrypt).
 *
 * Si el nombre de usuario ya está en uso, devuelve HTTP 409 con un array
 * de 3 sugerencias de nombres alternativos disponibles.
 *
 * @body {string} username — Nombre de usuario (requerido, único).
 * @body {string} password — Contraseña en texto plano (requerida).
 *
 * @returns {201} `{ user }` con datos del usuario recién creado.
 * @returns {400} Si falta username o password.
 * @returns {409} `{ error, suggestions: string[] }` si el nombre ya existe.
 * @returns {500} Error interno del servidor.
 */
router.post("/", async (req: Request, res: Response) => {
  const { username, password, email } = req.body;

  if (!username || typeof username !== "string" || !password) {
    return res
      .status(400)
      .json({ error: "Usuario y contraseña son requeridos" });
  }

  try {
    // 1. Verificar si el nombre ya existe antes del INSERT (para poder dar sugerencias)
    const existing = await get<{ id: number }>(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(?)",
      [username.trim()],
    );

    if (existing) {
      // Generar sugerencias de nombres disponibles
      const suggestions = await generateUsernameSuggestions(username.trim());
      return res.status(409).json({
        error: "El nombre de usuario ya está en uso",
        suggestions,
      });
    }

    // 2. Encriptar contraseña y crear usuario
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    /**
     * Incluimos `email` en el INSERT solo si fue proporcionado.
     * El campo es opcional en el registro (usado exclusivamente para recuperación de contraseña).
     * La BD tiene UNIQUE KEY en `email`, por lo que dos usuarios no pueden compartir correo.
     */
    const emailValue =
      email && typeof email === "string" && email.trim() ? email.trim() : null;

    await run(
      "INSERT INTO users (username, password_hash, email, current_level, experience_points) VALUES (?, ?, ?, 1, 0)",
      [username.trim(), passwordHash, emailValue],
    );
    await persistDb();

    // 3. Recuperar usuario recién creado (sin hash por seguridad)
    const user = await get<UserRow>(
      "SELECT id, username, current_level, experience_points FROM users WHERE username = ?",
      [username.trim()],
    );
    return res.status(201).json({ user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Fallback por si el UNIQUE constraint del DB falla a pesar del pre-check
    if (msg.includes("UNIQUE") || msg.includes("Duplicate")) {
      const suggestions = await generateUsernameSuggestions(username.trim());
      return res.status(409).json({
        error: "El nombre de usuario ya está en uso",
        suggestions,
      });
    }
    console.error("Error al crear usuario:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * POST /api/users/login
 * Autentica a un usuario verificando su contraseña contra el hash almacenado.
 *
 * @body {string} username — Nombre de usuario.
 * @body {string} password — Contraseña en texto plano.
 *
 * @returns {200} `{ user }` con datos seguros del usuario (sin hash).
 * @returns {400} Si falta username o password.
 * @returns {401} Si las credenciales son incorrectas.
 * @returns {500} Error interno del servidor.
 */
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Usuario y contraseña son requeridos" });
  }

  try {
    const user = await get<UserRow>("SELECT * FROM users WHERE username = ?", [
      username.trim(),
    ]);

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Devolver solo datos seguros (sin hash)
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        current_level: user.current_level,
        experience_points: user.experience_points,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * POST /api/users/forgot-password
 * Recuperación de contraseña: genera una contraseña temporal, la hashea
 * en la base de datos y la envía por correo electrónico al usuario.
 *
 * Flujo:
 * 1. Busca al usuario por username o email.
 * 2. Genera una contraseña temporal legible.
 * 3. Hashea la contraseña temporal y actualiza la DB.
 * 4. Envía un correo con la contraseña temporal usando nodemailer.
 *
 * @body {string} usernameOrEmail — Nombre de usuario o correo del usuario.
 *
 * @returns {200} `{ message }` de confirmación (siempre, para no revelar existencia).
 * @returns {400} Si falta el campo `usernameOrEmail`.
 * @returns {500} Si el envío del correo falla.
 */
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { usernameOrEmail } = req.body;

  if (!usernameOrEmail || typeof usernameOrEmail !== "string") {
    return res
      .status(400)
      .json({ error: "Por favor ingresa tu usuario o correo electrónico" });
  }

  try {
    // Buscar por username o email (insensible a mayúsculas)
    const user = await get<UserRow>(
      "SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)",
      [usernameOrEmail.trim(), usernameOrEmail.trim()],
    );

    /**
     * Respuesta genérica por seguridad: no revelar si el usuario existe o no.
     * (Prevención de "user enumeration attacks").
     */
    if (!user) {
      return res.json({
        message:
          "Si el usuario existe, recibirás una contraseña temporal en tu correo.",
      });
    }

    // Verificar que el usuario tenga correo registrado
    if (!user.email) {
      return res.status(400).json({
        error:
          "Este usuario no tiene un correo registrado. Contacta al administrador.",
      });
    }

    // 1. Generar contraseña temporal
    const tempPassword = generateTemporaryPassword();

    // 2. Hashear y actualizar en la base de datos
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await run("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      user.id,
    ]);
    await persistDb();

    // 3. Enviar correo con la contraseña temporal al email del usuario
    const transporter = createMailTransporter();

    /**
     * `to` usa el email guardado en la BD del usuario — nunca una variable
     * de entorno fija, ya que cada usuario tiene su propio correo.
     */
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"VennQuest" <${process.env.EMAIL_USER}>`,
      to: user.email, // ← Correo dinámico del usuario, no una env var
      subject: "🔑 Tu contraseña temporal de VennQuest",
      text: `
Hola ${user.username},

Recibimos una solicitud para restablecer tu contraseña en VennQuest.

Tu contraseña temporal es: ${tempPassword}

Por seguridad, te recomendamos cambiarla una vez que ingreses.

Si no solicitaste este cambio, puedes ignorar este correo.

— El equipo de VennQuest
  `.trim(),
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="background:#09090B;color:#e4e4e7;font-family:'Nunito',sans-serif;padding:32px 0;margin:0;">
  <div style="max-width:480px;margin:0 auto;background:#18181B;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#059669,#0891b2);padding:24px 32px;text-align:center;">
      <h1 style="margin:0;font-size:28px;color:#fff;letter-spacing:0.02em;">⊙ VennQuest</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:15px;">Hola <strong>${user.username}</strong>,</p>
      <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;">
        Recibimos una solicitud para restablecer tu contraseña.
        Aquí está tu contraseña temporal:
      </p>
      <div style="background:#27272A;border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:16px 24px;text-align:center;margin-bottom:24px;">
        <code style="font-size:22px;font-weight:bold;color:#10B981;letter-spacing:0.1em;">${tempPassword}</code>
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:#71717a;">
        ⚠️ Por seguridad, cambia esta contraseña tan pronto como ingreses desde tu perfil.
      </p>
      <p style="margin:0;font-size:13px;color:#52525b;">
        Si no solicitaste este cambio, puedes ignorar este correo.
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
      <p style="margin:0;font-size:12px;color:#52525b;">— El equipo de VennQuest</p>
    </div>
  </div>
</body>
</html>
  `.trim(),
    });

    return res.json({
      message:
        "¡Listo! Revisa tu bandeja de entrada. Te enviamos una contraseña temporal.",
    });
  } catch (err) {
    console.error("Error en forgot-password:", err);
    return res.status(500).json({
      error:
        "No se pudo enviar el correo. Por favor intenta de nuevo más tarde.",
    });
  }
});

/**
 * PUT /api/users/update-username
 * Actualiza el nombre de usuario de un jugador autenticado.
 *
 * Si el nuevo nombre ya está en uso, devuelve HTTP 409 con sugerencias
 * de nombres alternativos disponibles.
 *
 * @body {number} userId      — ID del usuario que realiza el cambio.
 * @body {string} newUsername — El nuevo nombre de usuario deseado.
 *
 * @returns {200} `{ user }` con los datos actualizados del usuario.
 * @returns {400} Si falta `userId` o `newUsername`.
 * @returns {404} Si el usuario no existe.
 * @returns {409} `{ error, suggestions }` si el nombre ya está en uso.
 * @returns {500} Error interno del servidor.
 */
router.put("/update-username", async (req: Request, res: Response) => {
  const { userId, newUsername } = req.body;

  if (!userId || !newUsername || typeof newUsername !== "string") {
    return res
      .status(400)
      .json({ error: "userId y newUsername son requeridos" });
  }

  const trimmedUsername = newUsername.trim();

  if (!trimmedUsername || trimmedUsername.length > 20) {
    return res
      .status(400)
      .json({ error: "El nombre debe tener entre 1 y 20 caracteres" });
  }

  try {
    // 1. Verificar que el usuario existe
    const currentUser = await get<UserRow>("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    if (!currentUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // 2. Si el nombre es igual al actual, no hacemos nada
    if (currentUser.username.toLowerCase() === trimmedUsername.toLowerCase()) {
      return res.json({
        user: {
          id: currentUser.id,
          username: currentUser.username,
          current_level: currentUser.current_level,
          experience_points: currentUser.experience_points,
        },
      });
    }

    // 3. Verificar disponibilidad del nuevo nombre
    const existingUser = await get<{ id: number }>(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?",
      [trimmedUsername, userId],
    );

    if (existingUser) {
      const suggestions = await generateUsernameSuggestions(trimmedUsername);
      return res.status(409).json({
        error: "El nombre de usuario ya está en uso",
        suggestions,
      });
    }

    // 4. Actualizar el nombre en la base de datos
    await run("UPDATE users SET username = ? WHERE id = ?", [
      trimmedUsername,
      userId,
    ]);
    await persistDb();

    const updatedUser = await get<UserRow>(
      "SELECT id, username, current_level, experience_points FROM users WHERE id = ?",
      [userId],
    );

    return res.json({ user: updatedUser });
  } catch (err) {
    console.error("Error al actualizar username:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * PUT /api/users/update-password
 * Actualiza la contraseña de un usuario, verificando primero la contraseña actual.
 *
 * @body {number} userId          — ID del usuario.
 * @body {string} currentPassword — Contraseña actual del usuario (para verificación).
 * @body {string} newPassword     — La nueva contraseña deseada.
 *
 * @returns {200} `{ message }` de confirmación.
 * @returns {400} Si falta algún campo o la nueva contraseña es muy corta.
 * @returns {401} Si la contraseña actual es incorrecta.
 * @returns {404} Si el usuario no existe.
 * @returns {500} Error interno del servidor.
 */
router.put("/update-password", async (req: Request, res: Response) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "userId, currentPassword y newPassword son requeridos" });
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
  }

  try {
    // 1. Obtener usuario con hash
    const user = await get<UserRow>("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    if (!user || !user.password_hash) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // 2. Verificar la contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ error: "La contraseña actual es incorrecta" });
    }

    // 3. Hashear y guardar la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await run("UPDATE users SET password_hash = ? WHERE id = ?", [
      newHash,
      userId,
    ]);
    await persistDb();

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Error al actualizar contraseña:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
