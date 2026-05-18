/**
 * @fileoverview api.ts — Capa de comunicación Frontend ↔ Backend de VennQuest.
 *
 * Centraliza todas las llamadas HTTP a la API REST del backend de Express.
 * Cada función lanza un `Error` si la respuesta no es OK (status >= 400),
 * para que los componentes puedan capturarlo con `try/catch`.
 *
 * @module utils/api
 */

import type {
  VennDistribution,
  EvaluateResponse,
  Problem,
  UserState,
} from "../types";

/**
 * Ruta base para todas las llamadas a la API del backend.
 * El proxy de Vite (`vite.config.ts`) redirige `/api` → `http://localhost:3001`.
 */
const BASE = "/api";

// ======================================================================
// HELPERS INTERNOS
// ======================================================================

/**
 * Extrae el mensaje de error de una respuesta HTTP fallida.
 * Intenta parsear el JSON del cuerpo; si falla, devuelve "Network error".
 *
 * @param {Response} res — La respuesta fetch con status >= 400.
 * @returns {Promise<string>} El mensaje de error legible.
 */
async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status} — Network error`;
  }
}

// ======================================================================
// ENDPOINTS DE PROBLEMAS
// ======================================================================

/**
 * Obtiene un problema aleatorio desde el backend para un usuario específico,
 * asegurándose de no repetir problemas que el usuario ya haya resuelto correctamente.
 *
 * @param {number} userId — El ID único del usuario actual.
 * @returns {Promise<{ problem: Problem; user: UserState }>}
 *   Objeto que contiene los datos del problema y el estado sincronizado del usuario.
 * @throws {Error} Si ocurre un error en la red o el servidor devuelve >= 400.
 */
export async function fetchProblem(
  userId: number,
): Promise<{ problem: Problem; user: UserState }> {
  const res = await fetch(`${BASE}/problem?userId=${userId}`);
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

/**
 * Envía la distribución final de las fichas en el diagrama de Venn al backend
 * para ser evaluada por la lógica matemática y calificada por la IA (Gemini).
 *
 * @param {number}           userId      — El ID del usuario que está respondiendo.
 * @param {number}           problemId   — El ID del problema que se está resolviendo.
 * @param {VennDistribution} distribution — Mapa de zonas con los elementos colocados.
 * @returns {Promise<EvaluateResponse>}
 *   Evaluación completa con feedback de IA y actualización de XP.
 * @throws {Error} Si la conexión falla o los parámetros son inválidos.
 */
export async function evaluateAnswer(
  userId: number,
  problemId: number,
  distribution: VennDistribution,
): Promise<EvaluateResponse> {
  const res = await fetch(`${BASE}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, problemId, distribution }),
  });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

// ======================================================================
// ENDPOINTS DE USUARIOS
// ======================================================================

/**
 * Recupera el progreso y la información completa de un usuario existente por ID.
 * Útil para la auto-recuperación de sesión al cargar la app.
 *
 * @param {number} userId — El ID numérico del usuario a buscar.
 * @returns {Promise<{ user: UserState }>} Datos del usuario (nivel, XP, username).
 * @throws {Error} Si la petición falla o el usuario no existe (404).
 */
export async function fetchUser(userId: number): Promise<{ user: UserState }> {
  const res = await fetch(`${BASE}/users/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

/**
 * Crea un nuevo perfil de estudiante en la base de datos con nombre, contraseña y email.
 * El backend inicia al usuario en Nivel 1 con 0 XP y encripta la contraseña.
 *
 * Si el nombre de usuario ya existe, el backend devuelve HTTP 409 junto con
 * un array de sugerencias alternativas. En ese caso, este función lanza un
 * `ApiError` con las sugerencias adjuntas.
 *
 * @param {string} username  — Nombre elegido para el nuevo jugador.
 * @param {string} password  — Contraseña en texto plano (el backend la encriptará).
 * @param {string} [email]   — Correo electrónico opcional para recuperación de contraseña.
 * @returns {Promise<{ user: UserState }>} Datos del usuario recién creado.
 * @throws {ApiError} Con `suggestions` adjuntas si el nombre ya está en uso (409).
 * @throws {Error}    Para otros errores de red o servidor.
 */
export async function createUser(
  username: string,
  password?: string,
  email?: string,
): Promise<{ user: UserState }> {
  const res = await fetch(`${BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Network error" }));

    if (res.status === 409 && body.suggestions) {
      const err = new ApiError(
        body.error || "El nombre de usuario ya está en uso",
        body.suggestions as string[],
      );
      throw err;
    }

    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Inicia sesión verificando las credenciales del usuario en el backend.
 *
 * @param {string} username — Nombre del usuario.
 * @param {string} password — Contraseña ingresada (texto plano).
 * @returns {Promise<{ user: UserState }>} Datos del usuario autenticado.
 * @throws {Error} Si las credenciales son incorrectas (401) u otro error.
 */
export async function loginUser(
  username: string,
  password?: string,
): Promise<{ user: UserState }> {
  const res = await fetch(`${BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(body.error || "Credenciales incorrectas");
  }

  return res.json();
}

/**
 * Solicita al backend que envíe una contraseña temporal al correo/usuario indicado.
 * El backend genera una contraseña aleatoria, la hashea y la envía por nodemailer.
 *
 * @param {string} usernameOrEmail — Nombre de usuario o correo electrónico registrado.
 * @returns {Promise<{ message: string }>} Mensaje de confirmación del backend.
 * @throws {Error} Si el usuario no existe o si falla el envío del correo.
 */
export async function requestPasswordReset(
  usernameOrEmail: string,
): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/users/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernameOrEmail }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(body.error || "No se pudo procesar la solicitud");
  }

  return res.json();
}

/**
 * Actualiza el nombre de usuario de un jugador autenticado.
 *
 * @param {number} userId      — ID del usuario que realiza el cambio.
 * @param {string} newUsername — El nuevo nombre de usuario deseado.
 * @returns {Promise<{ user: UserState }>} Usuario con el nombre actualizado.
 * @throws {ApiError} Con sugerencias si el nuevo nombre ya existe (409).
 * @throws {Error}    Para otros errores de validación o red.
 */
export async function updateUsername(
  userId: number,
  newUsername: string,
): Promise<{ user: UserState }> {
  const res = await fetch(`${BASE}/users/update-username`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, newUsername }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Network error" }));

    if (res.status === 409 && body.suggestions) {
      throw new ApiError(
        body.error || "El nombre de usuario ya está en uso",
        body.suggestions as string[],
      );
    }

    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Actualiza la contraseña de un usuario, verificando primero la contraseña actual.
 *
 * @param {number} userId          — ID del usuario que cambia su contraseña.
 * @param {string} currentPassword — Contraseña actual para verificación.
 * @param {string} newPassword     — Nueva contraseña deseada.
 * @returns {Promise<{ message: string }>} Confirmación de actualización.
 * @throws {Error} Si la contraseña actual es incorrecta (401) u otro error.
 */
export async function updatePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/users/update-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ======================================================================
// CLASES DE ERROR ENRIQUECIDAS
// ======================================================================

/**
 * Error extendido que incluye un array de sugerencias de nombres de usuario.
 * Se lanza desde `createUser` y `updateUsername` cuando el backend devuelve
 * HTTP 409 (Conflict) con sugerencias de nombres alternativos disponibles.
 *
 * La analogía: es como un formulario de registro de dominio que, al estar
 * ocupado el nombre, te ofrece variantes alternativas disponibles.
 */
export class ApiError extends Error {
  /**
   * Nombres de usuario disponibles sugeridos por el backend.
   * Puede estar vacío si el backend no devolvió sugerencias.
   */
  public suggestions: string[];

  /**
   * @param {string}   message     — Mensaje descriptivo del error.
   * @param {string[]} suggestions — Sugerencias de nombres disponibles.
   */
  constructor(message: string, suggestions: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.suggestions = suggestions;
  }
}
