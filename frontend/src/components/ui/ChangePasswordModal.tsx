/**
 * @fileoverview ChangePasswordModal.tsx — Modal para cambiar la contraseña del usuario.
 *
 * Componente de overlay (modal) que permite al usuario actualizar su contraseña.
 * Incluye:
 * - Campo para la contraseña actual (verificación de identidad).
 * - Campo para la nueva contraseña con indicador de fortaleza.
 * - Campo de confirmación con validación de coincidencia en tiempo real.
 * - Llamada al endpoint `PUT /api/users/update-password`.
 * - Feedback de éxito/error con alertas SweetAlert2.
 * - Cierre con Escape o clic en el backdrop.
 *
 * @module components/ui/ChangePasswordModal
 */

import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { updatePassword } from "../../utils/api";
import { showSuccess, showError } from "../../utils/alerts";
import type { UserState } from "../../types";

// ======================================================================
// INTERFACES
// ======================================================================

/**
 * Propiedades del componente ChangePasswordModal.
 */
interface ChangePasswordModalProps {
  /**
   * Estado actual del usuario, necesario para el `userId` al llamar al API.
   */
  user: UserState;

  /**
   * Callback ejecutado cuando la contraseña se actualiza con éxito.
   * El padre puede usar esto para cerrar el modal.
   */
  onSuccess: () => void;

  /**
   * Callback para cerrar el modal sin realizar cambios.
   */
  onClose: () => void;
}

// ======================================================================
// CONSTANTES DE VALIDACIÓN
// ======================================================================

/** Longitud mínima requerida para la nueva contraseña. */
const MIN_PASSWORD_LENGTH = 6;

// ======================================================================
// COMPONENTE
// ======================================================================

/**
 * Modal de cambio de contraseña.
 *
 * Flujo:
 * 1. El usuario ingresa su contraseña actual (para verificar identidad).
 * 2. El usuario ingresa y confirma la nueva contraseña.
 * 3. Al hacer clic en "Cambiar contraseña", se llama a `updatePassword`.
 * 4a. Éxito: toast de confirmación + callback `onSuccess`.
 * 4b. Contraseña actual incorrecta (401): alerta de error específica.
 * 4c. Otro error: alerta genérica.
 *
 * @param {ChangePasswordModalProps} props — Props del componente.
 * @returns {JSX.Element} El modal renderizado como overlay.
 */
export function ChangePasswordModal({
  user,
  onSuccess,
  onClose,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading,       setIsLoading]       = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  /** Foca el primer campo al montar el modal */
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  /**
   * Evalúa la "fortaleza" de la contraseña nueva para el indicador visual.
   * Escala de 0 a 3 basada en longitud y tipos de caracteres usados.
   * Analogía: como los semáforos de seguridad (rojo → amarillo → verde).
   *
   * @param {string} pwd — La contraseña a evaluar.
   * @returns {0 | 1 | 2 | 3} Nivel de fortaleza (0 = sin contraseña, 3 = fuerte).
   */
  const getPasswordStrength = (pwd: string): 0 | 1 | 2 | 3 => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= MIN_PASSWORD_LENGTH) score++;
    if (pwd.length >= 10)                   score++;
    if (/[A-Z]/.test(pwd) || /[^a-zA-Z0-9]/.test(pwd)) score++;
    return score as 0 | 1 | 2 | 3;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthLabels = ["", "Débil", "Media", "Fuerte"];
  const strengthColors = [
    "",
    "bg-rose-500",
    "bg-amber-400",
    "bg-emerald-500",
  ];

  /**
   * Cierra el modal al presionar Escape.
   *
   * @param {KeyboardEvent} e — Evento de teclado.
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  /**
   * Envía la solicitud de cambio de contraseña al backend con validaciones previas.
   */
  const handleSave = async () => {
    // ── Validaciones locales ──
    if (!currentPassword) {
      await showError("Campo vacío", "Ingresa tu contraseña actual.");
      return;
    }
    if (!newPassword) {
      await showError("Campo vacío", "Ingresa tu nueva contraseña.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      await showError(
        "Contraseña muy corta",
        `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      await showError(
        "No coinciden",
        "La nueva contraseña y su confirmación no son iguales.",
      );
      return;
    }
    if (currentPassword === newPassword) {
      await showError(
        "Sin cambios",
        "La nueva contraseña debe ser diferente a la actual.",
      );
      return;
    }

    // ── Llamada al backend ──
    setIsLoading(true);
    try {
      await updatePassword(user.id, currentPassword, newPassword);
      await showSuccess(
        "¡Contraseña actualizada!",
        "Tu contraseña ha sido cambiada exitosamente.",
      );
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar";
      await showError("Error al cambiar contraseña", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Backdrop semitransparente
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Tarjeta del modal */}
      <div className="w-full max-w-sm border shadow-2xl rounded-2xl bg-zinc-900 border-white/8 shadow-black/60 animate-slide-up">

        {/* ── Encabezado ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white font-display">
            🔒 Cambiar contraseña
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Cuerpo del formulario ── */}
        <div className="p-5 space-y-4" onKeyDown={handleKeyDown}>

          {/* Campo: Contraseña actual */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Contraseña actual
            </label>
            <input
              ref={firstInputRef}
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
          </div>

          {/* Campo: Nueva contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Nueva contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
            {/* ── Indicador de fortaleza de contraseña ── */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        strength >= level
                          ? strengthColors[strength]
                          : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${strengthColors[strength].replace("bg-", "text-")}`}>
                  {strengthLabels[strength]}
                </p>
              </div>
            )}
          </div>

          {/* Campo: Confirmar nueva contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
            {/* Indicador de coincidencia en tiempo real */}
            {confirmPassword && (
              <p
                className={`text-xs ${
                  newPassword === confirmPassword
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {newPassword === confirmPassword
                  ? "✓ Las contraseñas coinciden"
                  : "✗ No coinciden"}
              </p>
            )}
          </div>
        </div>

        {/* ── Pie de página con botones ── */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-bold transition-all border rounded-xl text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              !currentPassword || !newPassword || !confirmPassword || isLoading
            }
            className="flex-1 py-2.5 text-sm font-bold transition-all rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
