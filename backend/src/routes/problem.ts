import { Router, Request, Response } from "express";
import { query, get } from "../db/database";

const router = Router();

// Ajustamos la interfaz para que coincida con tu base de datos MySQL actual
interface UserRow {
  id: number;
  username: string;
  current_level: number;
  experience_points: number;
}
interface ProblemRow {
  id: number;
  level: number;
  title: string;
  statement: string;
  solution_json: any;
  /**
   * JSON almacenado en BD con las pistas/etiquetas por conjunto.
   * Estructura esperada: `{ a: string, b: string, ab?: string, c?: string, d?: string }`
   * Ejemplo: `{ "a": "¿Cuántos pidieron Pizza?", "b": "¿Cuántos pidieron Hamburguesa?" }`
   */
  hints_json: string | null;
  xp_reward: number;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.query.userId as string);
    if (isNaN(userId))
      return res.status(400).json({ error: "userId is required" });

    const user = await get<UserRow>("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    if (!user)
      return res.status(404).json({ error: `User ${userId} not found` });

    const solved = await query<{ problem_id: number }>(
      "SELECT DISTINCT problem_id FROM user_progress WHERE user_id = ?",
      [userId],
    );
    const solvedIds = solved.map((r) => r.problem_id);

    let problem: ProblemRow | undefined;

    if (solvedIds.length > 0) {
      const ph = solvedIds.map(() => "?").join(",");
      const rows = await query<ProblemRow>(
        `SELECT * FROM problems WHERE level = ? AND id NOT IN (${ph}) ORDER BY RAND() LIMIT 1`,
        [user.current_level, ...solvedIds],
      );
      problem = rows[0];
    } else {
      const rows = await query<ProblemRow>(
        "SELECT * FROM problems WHERE level = ? ORDER BY RAND() LIMIT 1",
        [user.current_level],
      );
      problem = rows[0];
    }

    if (!problem) {
      return res.json({
        completedLevel: true,
        message:
          "¡Felicidades! Has completado todos los problemas de este nivel.",
        user: {
          id: user.id,
          username: user.username,
          current_level: user.current_level,
          experience_points: user.experience_points,
        },
      });
    }

    // ==========================================
    // MAGIA: Generar las fichas a partir del JSON
    // ==========================================
    const sol =
      typeof problem.solution_json === "string"
        ? JSON.parse(problem.solution_json)
        : problem.solution_json;

    // Extraemos los valores (ej: 15, 10, 5, 5), los pasamos a texto y los desordenamos
    const universeArray = Object.values(sol)
      .map(String)
      .sort(() => Math.random() - 0.5);

    /**
     * Parsear hints_json para usar las preguntas de la BD como etiquetas de los conjuntos.
     * Si el campo no existe o es inválido, se usan etiquetas genéricas como fallback.
     *
     * Analogía: hints_json es como las instrucciones de un molde — si las tienes,
     * el diagrama sabe qué pregunta mostrar en cada círculo; si no, usa nombres genéricos.
     *
     * Estructura esperada del JSON:
     * { "a": "¿Cuántos pidieron Pizza?", "b": "¿Cuántos pidieron Hamburguesa?", "c": "...", "d": "..." }
     */
    let hints: Record<string, string> = {};
    if (problem.hints_json) {
      try {
        hints =
          typeof problem.hints_json === "string"
            ? JSON.parse(problem.hints_json)
            : problem.hints_json;
      } catch {
        // JSON malformado: hints queda vacío y se usan los fallbacks genéricos
        console.warn(`hints_json malformado en problema id=${problem.id}`);
      }
    }

    return res.json({
      completedLevel: false,
      problem: {
        id: problem.id,
        level: problem.level,
        title: problem.title,
        statement: problem.statement,
        universe: universeArray,

        // Etiquetas dinámicas desde hints_json; fallback a nombres genéricos si no existen
        setALabel: hints.a ?? "Conjunto A",
        setBLabel: hints.b ?? "Conjunto B",
        setCLabel: problem.level >= 2 ? (hints.c ?? "Conjunto C") : null,
        setDLabel: problem.level === 3 ? (hints.d ?? "Conjunto D") : null,

        isThreeSet: problem.level >= 2,
        xpReward: problem.xp_reward,
      },
      user: {
        id: user.id,
        username: user.username,
        current_level: user.current_level,
        experience_points: user.experience_points,
      },
    });
  } catch (err) {
    console.error("GET /api/problem error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
