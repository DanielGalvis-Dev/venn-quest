/**
 * Representa la estructura de un problema o nivel dentro del juego.
 */
export interface Problem {
  /** Identificador único del problema en la base de datos. */
  id: number;
  /** Nivel de dificultad (1: Dos conjuntos, 2: Tres conjuntos, 3: Cuatro conjuntos). */
  level: number;
  /** Título corto o temática del problema. */
  title: string;
  /** Enunciado descriptivo completo que explica el problema al usuario. */
  statement: string;
  /** Arreglo con todos los elementos (fichas) que el usuario deberá arrastrar y distribuir. */
  universe: string[];
  /** Etiqueta visual para el conjunto A (ej. "Fútbol"). */
  setALabel: string;
  /** Etiqueta visual para el conjunto B (ej. "Baloncesto"). */
  setBLabel: string;
  /** Etiqueta visual para el conjunto C (si aplica, null en niveles básicos). */
  setCLabel: string | null;
  /**
   * Etiqueta visual para el conjunto D (solo en nivel 3 — 4 conjuntos).
   * Proviene del campo `hints_json.d` de la base de datos, o null si no aplica.
   */
  setDLabel: string | null;
  /** Bandera booleana rápida para saber si el problema usa 3 o más conjuntos. */
  isThreeSet: boolean;
  /** Cantidad de Puntos de Experiencia (XP) que el usuario gana al resolverlo. */
  xpReward: number;
}

/**
 * Representa el estado actual, progreso y estadísticas del jugador.
 */
export interface UserState {
  /** ID único del usuario en la base de datos. */
  id: number;
  /** Nombre público del usuario. */
  username: string;
  /** Nivel actual alcanzado basado en su experiencia. */
  current_level: number;
  /** Total de puntos de experiencia acumulados. */
  experience_points: number;
  /** (Opcional) Puntos de experiencia requeridos para subir al siguiente nivel. */
  xpForNextLevel?: number;
  /** (Opcional) Bandera que indica si el usuario acaba de subir de nivel tras una respuesta. */
  leveledUp?: boolean;
  /** (Opcional) Cantidad total de problemas únicos que ha resuelto con éxito. */
  solvedProblems?: number;
}

/**
 * Identificadores válidos para cada "Drop Zone" (zona de caída) en el tablero.
 *
 * Nomenclatura:
 *   - `onlyX`            : Zona exclusiva del conjunto X (no pertenece a ningún otro).
 *   - `intersectionXY`   : Zona compartida únicamente por los conjuntos indicados.
 *   - `none`             : Fuera de todos los conjuntos (el universo externo).
 *   - `bank`             : Banco inicial de fichas (origen antes de ser colocadas).
 *
 * Uso por nivel:
 *   - Nivel 1 (2 conjuntos) : onlyA, onlyB, intersectionAB, none, bank
 *   - Nivel 2 (3 conjuntos) : + onlyC, intersectionAC, intersectionBC, intersectionABC
 *   - Nivel 3 (4 conjuntos) : + onlyD, intersectionBD, intersectionCD,
 *                               intersectionABD, intersectionACD, intersectionBCD,
 *                               intersectionABCD
 *
 * Zonas que NO existen en el diagrama de 4 conjuntos:
 *   - `intersectionAD` : A y D son diagonalmente opuestos → no se solapan.
 *   - `intersectionBC` : B y C son diagonalmente opuestos → no se solapan.
 *     (El ID `intersectionBC` se reserva para el nivel 2, donde sí representa B∩C.)
 */
export type ZoneId =
  // ── Zonas exclusivas ──────────────────────────────────────────────
  | "onlyA" // Solo en el Conjunto A
  | "onlyB" // Solo en el Conjunto B
  | "onlyC" // Solo en el Conjunto C (niveles 2 y 3)
  | "onlyD" // Solo en el Conjunto D (nivel 3)

  // ── Intersecciones de 2 conjuntos ─────────────────────────────────
  | "intersectionAB" // A ∩ B  — solapamiento superior central   (niveles 1, 2 y 3)
  | "intersectionAC" // A ∩ C  — solapamiento izquierdo central  (niveles 2 y 3)
  | "intersectionBC" // B ∩ C  — solapamiento derecho (nivel 2) / no existe en nivel 3
  | "intersectionBD" // B ∩ D  — solapamiento derecho central    (nivel 3)
  | "intersectionCD" // C ∩ D  — solapamiento inferior central   (nivel 3)

  // ── Intersecciones de 3 conjuntos ─────────────────────────────────
  | "intersectionABC" // A ∩ B ∩ C — cuadrante superior izquierdo del centro (niveles 2 y 3)
  | "intersectionABD" // A ∩ B ∩ D — cuadrante superior derecho del centro   (nivel 3)
  | "intersectionACD" // A ∩ C ∩ D — cuadrante inferior izquierdo del centro (nivel 3)
  | "intersectionBCD" // B ∩ C ∩ D — cuadrante inferior derecho del centro   (nivel 3)

  // ── Intersección total ────────────────────────────────────────────
  | "intersectionABCD" // A ∩ B ∩ C ∩ D — centro absoluto del diagrama        (nivel 3)

  // ── Zonas especiales ──────────────────────────────────────────────
  | "none" // Fuera de todos los conjuntos (universo externo)
  | "bank"; // Banco inicial: origen de las fichas antes de ser colocadas

/**
 * Estructura de datos que representa cómo el usuario distribuyó las fichas.
 * Cada clave (zona) contiene un arreglo con los IDs/nombres de las fichas soltadas allí.
 */
export interface VennDistribution {
  // ── Nivel 1+ — siempre presentes ────────────────────────────────
  /** Fichas colocadas exclusivamente en el Conjunto A. */
  onlyA: string[];
  /** Fichas colocadas exclusivamente en el Conjunto B. */
  onlyB: string[];
  /** Fichas en la intersección A ∩ B (solapamiento superior central). */
  intersectionAB: string[];
  /** Fichas fuera de todos los conjuntos (universo externo). */
  none: string[];

  // ── Nivel 2+ (3 conjuntos) ───────────────────────────────────────
  /** Fichas colocadas exclusivamente en el Conjunto C. */
  onlyC?: string[];
  /** Fichas en la intersección A ∩ C (solapamiento izquierdo central). */
  intersectionAC?: string[];
  /**
   * Fichas en la intersección B ∩ C.
   * Usado en nivel 2 (solapamiento derecho).
   * No existe en nivel 3 (B y C son diagonalmente opuestos).
   */
  intersectionBC?: string[];
  /** Fichas en la intersección A ∩ B ∩ C (cuadrante superior izquierdo del centro). */
  intersectionABC?: string[];

  // ── Nivel 3 (4 conjuntos) ────────────────────────────────────────
  /** Fichas colocadas exclusivamente en el Conjunto D. */
  onlyD?: string[];
  /** Fichas en la intersección B ∩ D (solapamiento derecho central). */
  intersectionBD?: string[];
  /** Fichas en la intersección C ∩ D (solapamiento inferior central). */
  intersectionCD?: string[];
  /** Fichas en la intersección A ∩ B ∩ D (cuadrante superior derecho del centro). */
  intersectionABD?: string[];
  /** Fichas en la intersección A ∩ C ∩ D (cuadrante inferior izquierdo del centro). */
  intersectionACD?: string[];
  /** Fichas en la intersección B ∩ C ∩ D (cuadrante inferior derecho del centro). */
  intersectionBCD?: string[];
  /** Fichas en la intersección total A ∩ B ∩ C ∩ D (centro absoluto del diagrama). */
  intersectionABCD?: string[];
}

/**
 * Estructura de la respuesta enviada por el backend tras evaluar un intento de solución.
 */
export interface EvaluateResponse {
  /** Mensaje de texto generado por la Inteligencia Artificial (Gemini) con feedback pedagógico. */
  feedback: string;
  /** Indica si la distribución de fichas del usuario fue 100% correcta matemáticamente. */
  isCorrect: boolean;
  /** Estado actualizado del usuario tras la evaluación (para repintar barras de XP y niveles). */
  user: {
    current_level: number;
    experience_points: number;
    leveledUp: boolean;
    xpForNextLevel: number;
  };
}

/**
 * Diccionario visual para mapear el número de nivel a un Título/Rango atractivo.
 */
export const LEVEL_LABELS: Record<number, string> = {
  1: "Aprendiz",
  2: "Explorador",
  3: "Maestro",
};

/**
 * Diccionario de colores (hex/Tailwind-like) asociado a cada nivel para estilizar UI dinámica.
 */
export const LEVEL_COLORS: Record<number, string> = {
  1: "#06b6d4", // Cyan
  2: "#a78bfa", // Purple Claro
  3: "#fbbf24", // Amber/Gold
};

/**
 * Umbrales de Puntos de Experiencia (XP) definidos para el juego.
 * La clave representa el nivel actual, y el valor el XP necesario para alcanzar el *siguiente* nivel.
 * (Ej: Para pasar del Nivel 1 al 2, se requieren 400 XP).
 */
export const XP_FOR_LEVEL: Record<number, number> = {
  1: 400,
  2: 900,
  3: 9999, // Límite arbitrario para el nivel máximo (Maestro)
};
