/**
 * @fileoverview evaluate.ts — Endpoint de evaluación de respuestas de VennQuest.
 *
 * Recibe la distribución de fichas del usuario, la compara contra la solución
 * almacenada en BD, genera feedback pedagógico con Gemini y actualiza el XP/nivel.
 *
 * @module routes/evaluate
 */

import { Router, Request, Response } from "express";
// import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { get, run, persistDb } from "../db/database";

const router = Router();

// ======================================================================
// INTERFACES
// ======================================================================

/**
 * Distribución de fichas enviada por el frontend al momento de evaluar.
 * Cada clave es un ZoneId y su valor es el array de etiquetas (números como strings)
 * colocados por el usuario en esa zona.
 *
 * Campos obligatorios: presentes en todos los niveles.
 * Campos opcionales:   solo aplican en niveles superiores.
 */
interface VennDistribution {
  // ── Nivel 1+ ──────────────────────────────────────────────────────
  onlyA: string[];
  onlyB: string[];
  intersectionAB: string[];
  none: string[];
  // ── Nivel 2+ ──────────────────────────────────────────────────────
  onlyC?: string[];
  intersectionAC?: string[];
  intersectionBC?: string[];
  intersectionABC?: string[];
  // ── Nivel 3 ───────────────────────────────────────────────────────
  onlyD?: string[];
  intersectionBD?: string[];
  intersectionCD?: string[];
  intersectionABD?: string[];
  intersectionACD?: string[];
  intersectionBCD?: string[];
  intersectionABCD?: string[];
}

/**
 * Fila de problema tal como la devuelve MySQL.
 * `solution_json` puede venir como string (SQLite) o como objeto (MySQL con JSON).
 */
interface ProblemRow {
  id: number;
  level: number;
  statement: string;
  solution_json: any;
  xp_reward: number;
}

/**
 * Fila de usuario necesaria para calcular XP y nivel tras una evaluación correcta.
 */
interface UserRow {
  id: number;
  current_level: number;
  experience_points: number;
}

// ======================================================================
// CONSTANTES DE PROGRESIÓN
// ======================================================================

/**
 * Umbrales de XP acumulado necesarios para alcanzar cada nivel.
 * Analogía: son como los "puntos de experiencia" de un videojuego RPG —
 * cuando el XP total supera el umbral, el jugador sube de nivel.
 */
const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 500 },
  { level: 3, xp: 1700 },
];

/**
 * Calcula el nivel correspondiente a una cantidad de XP acumulada.
 *
 * @param {number} xp — XP total acumulado del usuario.
 * @returns {number} Nivel calculado (mínimo 1, máximo 3).
 */
function calcLevel(xp: number): number {
  let lvl = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xp) lvl = t.level;
  }
  return Math.min(lvl, 3);
}

/**
 * Devuelve el XP necesario para alcanzar el siguiente nivel.
 * Si ya está en el nivel máximo, devuelve 9999 como techo simbólico.
 *
 * @param {number} level — Nivel actual del usuario.
 * @returns {number} XP requerido para el siguiente nivel.
 */
function xpForNext(level: number): number {
  const next = LEVEL_THRESHOLDS.find((t) => t.level === level + 1);
  return next ? next.xp : 9999;
}

// ======================================================================
// LÓGICA DE VALIDACIÓN
// ======================================================================

/**
 * Verifica si la distribución del usuario coincide exactamente con la solución.
 *
 * Principio de validación por zona:
 *   - Cada zona debe contener exactamente UNA ficha con el valor numérico correcto.
 *   - Si el valor correcto es 0, la zona puede estar vacía O contener la ficha "0".
 *   - Si `correctValue` es `undefined`, la zona no aplica para este nivel → se ignora.
 *
 * Las claves del `solution_json` son idénticas a los ZoneId del frontend
 * (onlyA, intersectionAB, none, etc.) gracias a la migración SQL ejecutada.
 *
 * @param {ProblemRow}       p — El problema con su solución en BD.
 * @param {VennDistribution} d — La distribución enviada por el usuario.
 * @returns {boolean} `true` si todas las zonas relevantes son correctas.
 */
function checkAnswer(p: ProblemRow, d: VennDistribution): boolean {
  const sol: Record<string, number> =
    typeof p.solution_json === "string"
      ? JSON.parse(p.solution_json)
      : p.solution_json;

  /**
   * Lee un valor del solution_json intentando primero la clave normalizada
   * y luego la clave legada como fallback.
   * Niveles 1 y 2 tienen claves viejas en BD (solo_a, ab_solo, etc.).
   * Nivel 3 ya tiene claves nuevas (onlyA, intersectionAB, etc.).
   *
   * @param {string}           newKey — Clave normalizada (ej. "onlyA")
   * @param {string | undefined} oldKey — Clave legada   (ej. "solo_a")
   * @returns {number | undefined}
   */
  const solVal = (newKey: string, oldKey?: string): number | undefined => {
    if (sol[newKey] !== undefined) return sol[newKey];
    if (oldKey && sol[oldKey] !== undefined) return sol[oldKey];
    return undefined;
  };

  /**
   * Verifica que una zona contenga exactamente la ficha con el valor correcto.
   * Si correctValue es undefined, la zona no aplica para este nivel → retorna true.
   *
   * @param {string[] | undefined} zoneData     — Fichas del usuario en esta zona.
   * @param {number  | undefined}  correctValue — Valor esperado según la solución.
   * @returns {boolean}
   */
  const checkZone = (
    zoneData: string[] | undefined,
    correctValue: number | undefined,
  ): boolean => {
    if (correctValue === undefined) return true;
    const arr = zoneData ?? [];
    if (correctValue === 0) {
      return arr.length === 0 || (arr.length === 1 && arr[0] === "0");
    }
    return arr.length === 1 && arr[0] === String(correctValue);
  };

  // ── Nivel 1: 2 conjuntos, 4 zonas ─────────────────────────────────
  if (p.level === 1) {
    return (
      checkZone(d.onlyA, solVal("onlyA", "solo_a")) &&
      checkZone(d.onlyB, solVal("onlyB", "solo_b")) &&
      checkZone(
        d.intersectionAB,
        solVal("intersectionAB", "interseccion_ab"),
      ) &&
      checkZone(d.none, solVal("none", "ninguno"))
    );
  }

  // ── Nivel 2: 3 conjuntos, 8 zonas ─────────────────────────────────
  if (p.level === 2) {
    return (
      checkZone(d.onlyA, solVal("onlyA", "solo_a")) &&
      checkZone(d.onlyB, solVal("onlyB", "solo_b")) &&
      checkZone(d.onlyC, solVal("onlyC", "solo_c")) &&
      checkZone(d.intersectionAB, solVal("intersectionAB", "ab_solo")) &&
      checkZone(d.intersectionAC, solVal("intersectionAC", "ac_solo")) &&
      checkZone(d.intersectionBC, solVal("intersectionBC", "bc_solo")) &&
      checkZone(d.intersectionABC, solVal("intersectionABC", "los_tres")) &&
      checkZone(d.none, solVal("none", "ninguno"))
    );
  }

  // ── Nivel 3: 4 conjuntos, 14 zonas ────────────────────────────────
  // BD ya tiene claves normalizadas — no necesita fallback.
  if (p.level === 3) {
    return (
      checkZone(d.onlyA, sol.onlyA) &&
      checkZone(d.onlyB, sol.onlyB) &&
      checkZone(d.onlyC, sol.onlyC) &&
      checkZone(d.onlyD, sol.onlyD) &&
      checkZone(d.intersectionAB, sol.intersectionAB) &&
      checkZone(d.intersectionAC, sol.intersectionAC) &&
      checkZone(d.intersectionBD, sol.intersectionBD) &&
      checkZone(d.intersectionCD, sol.intersectionCD) &&
      checkZone(d.intersectionABC, sol.intersectionABC) &&
      checkZone(d.intersectionABD, sol.intersectionABD) &&
      checkZone(d.intersectionACD, sol.intersectionACD) &&
      checkZone(d.intersectionBCD, sol.intersectionBCD) &&
      checkZone(d.intersectionABCD, sol.intersectionABCD) &&
      checkZone(d.none, sol.none)
    );
  }

  return false;
}

// ======================================================================
// CONSTRUCCIÓN DEL PROMPT PARA GEMINI
// ======================================================================

/**
 * Construye el prompt pedagógico enviado a la IA para generar el feedback.
 *
 * El prompt es adaptativo según el nivel del problema: describe las zonas
 * relevantes tanto del intento del estudiante como de la solución correcta,
 * para que la IA pueda dar retroalimentación específica y útil.
 *
 * @param {ProblemRow}       p — El problema que se evaluó.
 * @param {VennDistribution} d — La distribución enviada por el usuario.
 * @returns {string} El prompt completo listo para enviar a Gemini.
 */
function buildPrompt(p: ProblemRow, d: VennDistribution): string {
  const sol: Record<string, number> =
    typeof p.solution_json === "string"
      ? JSON.parse(p.solution_json)
      : p.solution_json;

  const fmt = (arr: string[] | undefined) => arr?.join(", ") || "vacío";

  /**
   * Lee un valor con soporte para claves legadas y normalizadas.
   * Necesario para que Gemini reciba los valores correctos en niveles 1 y 2,
   * cuya BD aún tiene claves viejas (solo_a, ab_solo, etc.).
   */
  const sv = (newKey: string, oldKey?: string): number | string => {
    if (sol[newKey] !== undefined) return sol[newKey];
    if (oldKey && sol[oldKey] !== undefined) return sol[oldKey];
    return "?";
  };

  let userAns: string;
  let correctAns: string;

  if (p.level === 1) {
    userAns = [
      `Solo A: ${fmt(d.onlyA)}`,
      `Solo B: ${fmt(d.onlyB)}`,
      `A∩B: ${fmt(d.intersectionAB)}`,
      `Ninguno: ${fmt(d.none)}`,
    ].join(" | ");

    correctAns = [
      `Solo A: ${sv("onlyA", "solo_a")}`,
      `Solo B: ${sv("onlyB", "solo_b")}`,
      `A∩B: ${sv("intersectionAB", "interseccion_ab")}`,
      `Ninguno: ${sv("none", "ninguno")}`,
    ].join(" | ");
  } else if (p.level === 2) {
    userAns = [
      `Solo A: ${fmt(d.onlyA)}`,
      `Solo B: ${fmt(d.onlyB)}`,
      `Solo C: ${fmt(d.onlyC)}`,
      `A∩B: ${fmt(d.intersectionAB)}`,
      `A∩C: ${fmt(d.intersectionAC)}`,
      `B∩C: ${fmt(d.intersectionBC)}`,
      `A∩B∩C: ${fmt(d.intersectionABC)}`,
      `Ninguno: ${fmt(d.none)}`,
    ].join(" | ");

    correctAns = [
      `Solo A: ${sv("onlyA", "solo_a")}`,
      `Solo B: ${sv("onlyB", "solo_b")}`,
      `Solo C: ${sv("onlyC", "solo_c")}`,
      `A∩B: ${sv("intersectionAB", "ab_solo")}`,
      `A∩C: ${sv("intersectionAC", "ac_solo")}`,
      `B∩C: ${sv("intersectionBC", "bc_solo")}`,
      `A∩B∩C: ${sv("intersectionABC", "los_tres")}`,
      `Ninguno: ${sv("none", "ninguno")}`,
    ].join(" | ");
  } else {
    // Nivel 3 — BD ya tiene claves normalizadas
    userAns = [
      `Solo A: ${fmt(d.onlyA)}`,
      `Solo B: ${fmt(d.onlyB)}`,
      `Solo C: ${fmt(d.onlyC)}`,
      `Solo D: ${fmt(d.onlyD)}`,
      `A∩B: ${fmt(d.intersectionAB)}`,
      `A∩C: ${fmt(d.intersectionAC)}`,
      `B∩D: ${fmt(d.intersectionBD)}`,
      `C∩D: ${fmt(d.intersectionCD)}`,
      `A∩B∩C: ${fmt(d.intersectionABC)}`,
      `A∩B∩D: ${fmt(d.intersectionABD)}`,
      `A∩C∩D: ${fmt(d.intersectionACD)}`,
      `B∩C∩D: ${fmt(d.intersectionBCD)}`,
      `A∩B∩C∩D: ${fmt(d.intersectionABCD)}`,
      `Ninguno: ${fmt(d.none)}`,
    ].join(" | ");

    correctAns = [
      `Solo A: ${sol.onlyA}`,
      `Solo B: ${sol.onlyB}`,
      `Solo C: ${sol.onlyC}`,
      `Solo D: ${sol.onlyD}`,
      `A∩B: ${sol.intersectionAB}`,
      `A∩C: ${sol.intersectionAC}`,
      `B∩D: ${sol.intersectionBD}`,
      `C∩D: ${sol.intersectionCD}`,
      `A∩B∩C: ${sol.intersectionABC}`,
      `A∩B∩D: ${sol.intersectionABD}`,
      `A∩C∩D: ${sol.intersectionACD}`,
      `B∩C∩D: ${sol.intersectionBCD}`,
      `A∩B∩C∩D: ${sol.intersectionABCD}`,
      `Ninguno: ${sol.none}`,
    ].join(" | ");
  }

  return `Eres un profesor de matemáticas amigable que enseña teoría de conjuntos a estudiantes de secundaria. Responde SIEMPRE en español con tono cálido y pedagógico.

PROBLEMA: "${p.statement}"

- Valores colocados por el estudiante:
${userAns}

- Respuesta matemática correcta:
${correctAns}

Instrucciones:
1. Si es CORRECTO: felicita con entusiasmo y refuerza el concepto en 1-2 oraciones.
2. Si es INCORRECTO: señala qué zonas están mal (sin revelar todos los valores), explica el porqué con un ejemplo concreto del enunciado, y da una pista clara.
3. Máximo 4 oraciones. Usa emojis con moderación.`;
}

// ======================================================================
// ENDPOINT POST /api/evaluate
// ======================================================================

/**
 * POST /api/evaluate
 *
 * Evalúa el intento del estudiante, genera feedback con Gemini y actualiza
 * el progreso del usuario (XP + nivel) si la respuesta es correcta.
 *
 * Flujo:
 * 1. Valida parámetros de entrada.
 * 2. Obtiene usuario y problema desde la BD.
 * 3. Compara la distribución contra `solution_json` con `checkAnswer`.
 * 4. Llama a Gemini para generar feedback pedagógico adaptativo.
 * 5. Si es correcto: registra progreso, suma XP (completo si es primera vez, /4 si repite).
 * 6. Recalcula nivel y devuelve el estado actualizado del usuario.
 *
 * @body {number}           userId       — ID del usuario que responde.
 * @body {number}           problemId    — ID del problema que se está evaluando.
 * @body {VennDistribution} distribution — Mapa de zonas con fichas colocadas por el usuario.
 *
 * @returns {200} `{ feedback, isCorrect, user }` con el estado actualizado.
 * @returns {400} Si faltan parámetros requeridos.
 * @returns {404} Si el usuario o problema no existen.
 * @returns {500} Error interno del servidor.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      problemId,
      distribution,
    }: { userId: number; problemId: number; distribution: VennDistribution } =
      req.body;

    if (!userId || !problemId || !distribution)
      return res.status(400).json({ error: "Faltan parámetros requeridos" });

    const user = await get<UserRow>("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const problem = await get<ProblemRow>(
      "SELECT * FROM problems WHERE id = ?",
      [problemId],
    );
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const isCorrect = checkAnswer(problem, distribution);

    // ── Generar feedback con Gemini ──────────────────────────────────
    let feedback = "";
    try {
      // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      // const model = genAI.getGenerativeModel({
      //   model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      // });
      // const result = await model.generateContent(
      //   buildPrompt(problem, distribution),
      // );
      // feedback = result.response.text();
      
      /**
       * Genera feedback pedagógico usando GPT-4o-mini de OpenAI.
       * max_tokens 300: suficiente para 3-4 oraciones de feedback
       * y reduce costo al mínimo por evaluación (~$0.0001).
       */
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          { role: "user", content: buildPrompt(problem, distribution) },
        ],
      });
      feedback = completion.choices[0]?.message?.content ?? "";
    } catch (aiErr) {
      // Fallback si Gemini no está disponible: mensaje genérico
      console.error("Gemini error:", aiErr);
      feedback = isCorrect
        ? "🎉 ¡Excelente! Tu respuesta es completamente correcta."
        : "🤔 Revisa tu respuesta. Algunas fichas no están en la zona correcta. ¡Inténtalo de nuevo!";
    }

    // ── Actualizar progreso y XP si la respuesta es correcta ─────────
    let leveledUp = false;
    let newXp = user.experience_points;
    let newLevel = user.current_level;

    if (isCorrect) {
      const alreadySolved = await get(
        "SELECT id FROM user_progress WHERE user_id = ? AND problem_id = ?",
        [userId, problemId],
      );

      if (!alreadySolved) {
        // Primera vez que resuelve este problema: XP completo
        await run(
          "INSERT INTO user_progress (user_id, problem_id) VALUES (?, ?)",
          [userId, problemId],
        );
        newXp = user.experience_points + problem.xp_reward;
      } else {
        // Ya lo había resuelto antes: XP reducido (25%) por reintento
        await run(
          "UPDATE user_progress SET attempts = attempts + 1 WHERE user_id = ? AND problem_id = ?",
          [userId, problemId],
        );
        newXp = user.experience_points + Math.floor(problem.xp_reward / 4);
      }

      newLevel = calcLevel(newXp);
      leveledUp = newLevel > user.current_level;

      await run(
        "UPDATE users SET experience_points = ?, current_level = ? WHERE id = ?",
        [newXp, newLevel, userId],
      );
      await persistDb();
    }

    return res.json({
      feedback,
      isCorrect,
      user: {
        current_level: newLevel,
        experience_points: newXp,
        leveledUp,
        xpForNextLevel: xpForNext(newLevel),
      },
    });
  } catch (err) {
    console.error("POST /api/evaluate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
