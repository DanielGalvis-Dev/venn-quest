import type { EvaluateResponse } from "../../types";
import { XP_FOR_LEVEL } from "../../types";

/**
 * Propiedades esperadas para el componente FeedbackModal.
 */
interface FeedbackModalProps {
  /** * Indica si la aplicación está actualmente esperando la respuesta del servidor (evaluando).
   * Cuando es `true`, muestra una animación de carga.
   */
  isLoading: boolean;
  /** * El resultado de la evaluación devuelto por el backend.
   * Contiene la validación matemática, el texto de la IA y el nuevo estado del usuario.
   * Es `null` si aún no se ha evaluado.
   */
  response: EvaluateResponse | null;
  /** * Mensaje de error en caso de que la conexión o la petición al servidor falle.
   * Es `null` si no hay errores.
   */
  error: string | null;
  /** * Función callback que se ejecuta cuando el usuario decide avanzar al siguiente problema.
   */
  onNextProblem: () => void;
  /** * Función callback que se ejecuta cuando el usuario hace clic en "Reintentar"
   * tras un error de red o de servidor.
   */
  onRetry: () => void;
  /** * Función callback que cierra el modal, permitiendo al usuario corregir las
   * fichas en el diagrama de Venn actual.
   */
  onClose: () => void;
}

/**
 * Componente modal superpuesto (Overlay) que maneja el ciclo de vida de la retroalimentación.
 * Muestra transiciones fluidas entre el estado de "Carga", "Error" y la visualización
 * del feedback final generado por la IA (Gemini), además de animaciones de subida de nivel.
 * * @param {FeedbackModalProps} props - Propiedades del modal.
 * @returns {JSX.Element} El modal renderizado con los resultados de la jugada.
 */
export function FeedbackModal({
  isLoading,
  response,
  error,
  onNextProblem,
  onRetry,
  onClose,
}: FeedbackModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo oscurecido (Backdrop). Si está cargando, deshabilita el cierre al hacer clic fuera */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Contenedor principal del Modal */}
      <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        {/* ================= ESTADO DE CARGA ================= */}
        {isLoading && (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 rounded-full border-purple-600/30" />
                <div className="absolute inset-0 border-4 rounded-full border-t-purple-400 animate-spin" />
                <div
                  className="absolute border-4 rounded-full inset-2 border-t-cyan-400 animate-spin"
                  style={{
                    animationDirection: "reverse",
                    animationDuration: "0.8s",
                  }}
                />
              </div>
            </div>
            <p className="mb-1 text-2xl text-purple-300 font-display">
              Analizando...
            </p>
            <p className="text-sm text-white/50">
              El profesor IA está revisando tu respuesta
            </p>
          </div>
        )}

        {/* ================= ESTADO DE ERROR ================= */}
        {!isLoading && error && (
          <div className="p-6">
            <div className="mb-4 text-center">
              <div className="mb-2 text-4xl">⚠️</div>
              <h3 className="text-xl text-red-400 font-display">
                Error de conexión
              </h3>
            </div>
            <p className="mb-6 text-sm text-center text-white/60">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all text-sm font-bold"
              >
                Cerrar
              </button>
              <button
                onClick={onRetry}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ================= ESTADO DE RESULTADO (EXITOSO) ================= */}
        {!isLoading && !error && response && (
          <div className="p-6">
            {/* Cabecera del Resultado (Acierto o Fallo) */}
            <div
              className={`text-center mb-5 p-4 rounded-xl ${
                response.isCorrect
                  ? "bg-green-500/10 border border-green-400/30"
                  : "bg-red-500/10 border border-red-400/30"
              }`}
            >
              <div className="mb-2 text-5xl">
                {response.isCorrect ? "🎉" : "🤔"}
              </div>
              <h3
                className={`font-display text-2xl ${response.isCorrect ? "text-green-400" : "text-red-400"}`}
              >
                {response.isCorrect ? "¡Correcto!" : "Casi..."}
              </h3>

              {/* Insignia de XP Ganados (Solo visible si es correcto) */}
              {response.isCorrect && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 rounded-full px-3 py-1">
                  <span className="text-sm text-amber-400">⭐</span>
                  <span className="text-sm font-bold text-amber-300">
                    +XP ganados
                  </span>
                </div>
              )}
            </div>

            {/* Banner de Subida de Nivel (Level Up) */}
            {response.user.leveledUp && (
              <div className="p-4 mb-4 text-center border rounded-xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border-amber-400/40 animate-level-up">
                <div className="mb-1 text-3xl">🏆</div>
                <p className="text-xl font-display text-amber-300">
                  ¡Subiste de Nivel!
                </p>
                <p className="text-sm text-white/60">
                  Ahora eres Nivel {response.user.current_level}
                </p>
              </div>
            )}

            {/* Cuadro de Retroalimentación del Profesor IA */}
            <div className="p-4 mb-5 border bg-white/5 rounded-xl border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🤖</span>
                <span className="text-xs font-bold tracking-wider uppercase text-white/60">
                  Feedback del Profesor
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/85">
                {response.feedback}
              </p>
            </div>

            {/* Barra de Progreso de Experiencia (XP) */}
            <div className="mb-5">
              <div className="flex justify-between mb-1 text-xs text-white/50">
                <span>Nivel {response.user.current_level}</span>
                <span>
                  {response.user.experience_points} /{" "}
                  {XP_FOR_LEVEL[response.user.current_level] || "∞"} XP
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full transition-all duration-1000 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                  style={{
                    width: `${Math.min(100, (response.user.experience_points / (XP_FOR_LEVEL[response.user.current_level] || 900)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Botones de Acción Finales */}
            <div className="flex gap-3">
              {/* Solo permite reintentar si la respuesta fue incorrecta */}
              {!response.isCorrect && (
                <button
                  onClick={onClose}
                  className="flex-1 py-3 text-sm font-bold transition-all border rounded-xl border-white/20 text-white/70 hover:text-white hover:border-white/40"
                >
                  Intentar de nuevo
                </button>
              )}
              {/* Avanzar o Saltar problema (varía estilísticamente si fue correcto o no) */}
              <button
                onClick={onNextProblem}
                className={`${response.isCorrect ? "flex-1" : "flex-[1.5]"} py-3 rounded-xl font-bold text-sm transition-all
                  ${
                    response.isCorrect
                      ? "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg"
                      : "bg-purple-700/50 hover:bg-purple-700 text-white/70 hover:text-white"
                  }`}
              >
                {response.isCorrect
                  ? "➡️ Siguiente Problema"
                  : "⏩ Saltar Problema"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
