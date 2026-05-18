/**
 * @fileoverview ChangeUsernameModal.tsx — Modal para cambiar el nombre de usuario.
 *
 * Componente de overlay (modal) que permite al usuario actualizar su nombre
 * de usuario. Incluye:
 * - Campo de texto con el nombre actual pre-cargado.
 * - Llamada al endpoint `PUT /api/users/update-username`.
 * - Manejo del error 409 (nombre ya en uso) con sugerencias clickeables.
 * - Feedback de éxito/error con alertas SweetAlert2.
 * - Cierre con Escape o clic en el backdrop.
 *
 * @module components/ui/ChangeUsernameModal
 */

import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { updateUsername, ApiError } from "../../utils/api";
import { showSuccess, showError, showUsernameTakenAlert } from "../../utils/alerts";
import type { UserState } from "../../types";

// ======================================================================
// INTERFACES
// ======================================================================

/**
 * Propiedades del componente ChangeUsernameModal.
 */
interface ChangeUsernameModalProps {
  /**
   * Estado actual del usuario (necesario para el `userId` y el nombre actual).
   */
  user: UserState;

  /**
   * Callback ejecutado cuando el nombre se actualiza con éxito.
   * Transmite el usuario con el nombre actualizado para que el padre
   * actualice el estado global.
   *
   * @param {UserState} updated — Usuario con el nuevo nombre de usuario.
   */
  onSuccess: (updated: UserState) => void;

  /**
   * Callback para cerrar el modal sin hacer cambios.
   */
  onClose: () => void;
}

// ======================================================================
// CONSTANTES
// ======================================================================

/** Longitud máxima del nombre de usuario. */
const MAX_LENGTH = 20;

// ======================================================================
// COMPONENTE
// ======================================================================

/**
 * Modal de cambio de nombre de usuario.
 *
 * Flujo:
 * 1. Se renderiza con el nombre actual en el input.
 * 2. El usuario modifica el nombre y hace clic en "Guardar".
 * 3. Se llama a `updateUsername(user.id, newUsername)`.
 * 4a. Éxito: toast de confirmación + callback `onSuccess`.
 * 4b. Nombre duplicado (ApiError con sugerencias): alerta con botones sugeridos.
 * 4c. Otro error: alerta de error.
 *
 * @param {ChangeUsernameModalProps} props — Props del componente.
 * @returns {JSX.Element} El modal renderizado como overlay.
 */
export function ChangeUsernameModal({
  user,
  onSuccess,
  onClose,
}: ChangeUsernameModalProps) {
  const [newUsername, setNewUsername] = useState(user.username);
  const [isLoading, setIsLoading]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Foca el input al montar el modal para mejor UX */
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  /**
   * Maneja el cierre del modal con la tecla Escape.
   *
   * @param {KeyboardEvent} e — Evento de teclado.
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter")  handleSave();
  };

  /**
   * Envía la solicitud de cambio de nombre al backend.
   * Gestiona los tres escenarios posibles de respuesta.
   */
  const handleSave = async () => {
    const trimmed = newUsername.trim();

    if (!trimmed) {
      await showError("Campo vacío", "El nombre de usuario no puede estar vacío.");
      return;
    }
    if (trimmed === user.username) {
      onClose(); // Sin cambios, simplemente cerrar
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      await showError(
        "Nombre muy largo",
        `Máximo ${MAX_LENGTH} caracteres permitidos.`,
      );
      return;
    }

    setIsLoading(true);
    try {
      const { user: updated } = await updateUsername(user.id, trimmed);
      await showSuccess(
        "¡Nombre actualizado!",
        `Tu nuevo nombre de usuario es "${updated.username}".`,
      );
      onSuccess(updated);
    } catch (err) {
      if (err instanceof ApiError && err.suggestions.length > 0) {
        // Nombre duplicado → mostrar sugerencias interactivas
        const chosen = await showUsernameTakenAlert(err.suggestions);
        if (chosen) setNewUsername(chosen);
      } else {
        const msg = err instanceof Error ? err.message : "Error al actualizar";
        await showError("No se pudo actualizar", msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Backdrop semitransparente con desenfoque
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Tarjeta del modal */}
      <div className="w-full max-w-sm border shadow-2xl rounded-2xl bg-zinc-900 border-white/8 shadow-black/60 animate-slide-up">

        {/* ── Encabezado ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white font-display">
            ✏️ Cambiar nombre
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

        {/* ── Cuerpo ── */}
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Nuevo nombre de usuario
            </label>
            <input
              ref={inputRef}
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_LENGTH}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
            <p className="text-xs text-right text-zinc-600">
              {newUsername.length}/{MAX_LENGTH}
            </p>
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
            disabled={!newUsername.trim() || isLoading}
            className="flex-1 py-2.5 text-sm font-bold transition-all rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
