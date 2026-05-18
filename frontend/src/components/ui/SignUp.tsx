/**
 * @fileoverview SignUp.tsx — Componente de Registro de Nuevo Usuario de VennQuest.
 *
 * Vista dedicada para crear un nuevo perfil de jugador con nombre de usuario
 * y contraseña. Incluye:
 *   - Formulario de registro con validación básica (longitud de contraseña, etc.).
 *   - Manejo del error 409 (nombre ya en uso) con sugerencias clickeables vía SweetAlert2.
 *   - Feedback visual de éxito/error con alertas SweetAlert2 (tema dark).
 *   - Animaciones decorativas de fondo.
 *
 * @module components/ui/SignUp
 */

import { useState, KeyboardEvent } from "react";
import { createUser } from "../../utils/api";
import { ApiError } from "../../utils/api";
import {
  showError,
  showSuccess,
  showUsernameTakenAlert,
} from "../../utils/alerts";
import type { UserState } from "../../types";

// ======================================================================
// INTERFACES
// ======================================================================

/**
 * Propiedades del componente SignUp.
 */
interface SignUpProps {
  /**
   * Callback ejecutado cuando se crea el usuario con éxito y ya está listo
   * para jugar. Pasa el estado del nuevo usuario al orquestador (`App.tsx`).
   *
   * @param {UserState} user — Datos del usuario recién registrado.
   */
  onUserReady: (user: UserState) => void;

  /**
   * Callback para navegar a la pantalla de login (`SignIn`).
   * Se invoca cuando el usuario hace clic en "¿Ya tienes cuenta? Inicia sesión".
   */
  onGoToSignIn: () => void;
}

// ======================================================================
// CONSTANTES DE VALIDACIÓN
// ======================================================================

/** Longitud mínima permitida para la contraseña. */
const MIN_PASSWORD_LENGTH = 6;

/** Longitud máxima permitida para el nombre de usuario. */
const MAX_USERNAME_LENGTH = 20;

// ======================================================================
// COMPONENTE
// ======================================================================

/**
 * Componente de pantalla de registro.
 *
 * Flujo principal:
 * 1. El usuario ingresa nombre de usuario y contraseña.
 * 2. Al hacer clic en "Crear cuenta", se validan los campos localmente.
 * 3. Se llama a `createUser` del módulo `api.ts`.
 * 4a. Si el registro es exitoso, se muestra alerta de bienvenida y se llama `onUserReady`.
 * 4b. Si el nombre ya existe (ApiError con sugerencias), se muestra la alerta especial
 *     con botones para auto-completar el input con una sugerencia.
 * 4c. Para otros errores, se muestra una alerta de error genérica.
 *
 * @param {SignUpProps} props — Props del componente.
 * @returns {JSX.Element} Formulario de registro renderizado.
 */
export function SignUp({ onUserReady, onGoToSignIn }: SignUpProps) {
  // ──── Estado del formulario ────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  /** Controla estado de carga para spinner y deshabilitar inputs */
  const [isLoading, setIsLoading] = useState(false);

  // ──── Helpers de validación ───────────────────────────────────────

  /**
   * Expresión regular para validar formato básico de email.
   * Verifica que exista un "@" con texto a ambos lados y un dominio con punto.
   * No es RFC 5322 completa — es suficiente para validación de entrada de usuario.
   */
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Valida los campos del formulario antes de enviar.
   * Muestra alertas de SweetAlert2 si encuentra errores.
   *
   * @returns {boolean} `true` si todos los campos son válidos.
   */
  const validateForm = async (): Promise<boolean> => {
    if (!username.trim()) {
      await showError(
        "Nombre requerido",
        "El nombre de usuario no puede estar vacío.",
      );
      return false;
    }
    if (username.trim().length > MAX_USERNAME_LENGTH) {
      await showError(
        "Nombre muy largo",
        `El nombre de usuario no puede superar ${MAX_USERNAME_LENGTH} caracteres.`,
      );
      return false;
    }

    // ── Validación de email (solo si fue ingresado, ya que es opcional) ──
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      await showError(
        "Correo inválido",
        "El formato del correo electrónico no es válido. Ejemplo: usuario@dominio.com",
      );
      return false;
    }

    if (!password) {
      await showError(
        "Contraseña requerida",
        "Por favor ingresa una contraseña.",
      );
      return false;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      await showError(
        "Contraseña muy corta",
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return false;
    }
    if (password !== confirmPassword) {
      await showError(
        "Contraseñas no coinciden",
        "La contraseña y su confirmación deben ser iguales.",
      );
      return false;
    }
    return true;
  };

  // ──── Handlers ────────────────────────────────────────────────────

  /**
   * Maneja el proceso completo de registro de usuario.
   *
   * Gestiona tres escenarios distintos:
   * - Éxito: bienvenida + transición al juego.
   * - Nombre duplicado (ApiError): muestra sugerencias con botones interactivos.
   * - Otro error: alerta genérica de error.
   */
  const handleSignUp = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setIsLoading(true);

    try {
      const { user } = await createUser(
        username.trim(),
        password,
        email.trim() || undefined,
      );

      // ── Éxito: bienvenida y transición ──
      await showSuccess(
        "¡Bienvenido a VennQuest! 🎉",
        `Tu perfil "${user.username}" ha sido creado. ¡Que empiece el juego!`,
      );
      onUserReady(user);
    } catch (err) {
      if (err instanceof ApiError && err.suggestions.length > 0) {
        /**
         * Caso especial: nombre en uso con sugerencias.
         * `showUsernameTakenAlert` muestra los nombres sugeridos como botones
         * y devuelve el elegido, o null si el usuario cerró sin elegir.
         *
         * Analogía: como cuando GitHub te dice "@usuario ya existe,
         * ¿qué tal @usuario_42?" con botones de un clic.
         */
        const chosen = await showUsernameTakenAlert(err.suggestions);
        if (chosen) {
          // Auto-completar el input con el nombre elegido
          setUsername(chosen);
        }
      } else {
        // Error genérico (red, validación del servidor, etc.)
        const msg =
          err instanceof Error ? err.message : "Error al crear la cuenta";
        await showError("No se pudo crear la cuenta", msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Permite enviar el formulario con la tecla Enter desde el último campo.
   *
   * @param {KeyboardEvent} e — Evento de teclado.
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleSignUp();
  };

  /** Indica si el botón de registro debe estar habilitado. */
  const canSubmit =
    username.trim() && password && confirmPassword && !isLoading;

  // ──── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950">
      {/* ── Fondos decorativos animados ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full border border-emerald-500/10 animate-[spin_22s_linear_infinite]" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full border border-amber-500/8 animate-[spin_17s_linear_infinite_reverse]" />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full border border-purple-500/5 animate-[spin_30s_linear_infinite]" />
      </div>

      {/* ── Contenedor principal ── */}
      <div className="relative z-10 w-full max-w-sm">
        {/* ── Logotipo y título ── */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 shadow-lg rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-500 shadow-emerald-900/40 animate-float">
            <span className="text-4xl">⊙</span>
          </div>
          <h1 className="mb-1 text-5xl text-white font-display">VennQuest</h1>
          <p className="text-sm text-zinc-500">Crea tu perfil de jugador</p>
        </div>

        {/* ── Tarjeta del formulario ── */}
        <div className="p-6 space-y-4 border shadow-xl rounded-2xl bg-zinc-900 border-white/7">
          <h2 className="text-xl text-center text-white font-display">
            Nuevo Estudiante ✨
          </h2>

          {/* Campo: Nombre de usuario */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Nombre de usuario
            </label>
            <input
              type="text"
              placeholder="mi_nombre_genial"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={MAX_USERNAME_LENGTH}
              autoFocus
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
            {/* Contador de caracteres */}
            <p className="text-xs text-right text-zinc-600">
              {username.length}/{MAX_USERNAME_LENGTH}
            </p>
          </div>

          {/* Campo: Email (opcional, para recuperación de contraseña) */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Correo electrónico{" "}
              <span className="font-normal normal-case text-zinc-600">
                (opcional)
              </span>
            </label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
            <p className="text-xs text-zinc-600">
              Solo se usa para recuperar tu contraseña
            </p>
          </div>

          {/* Campo: Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
            {password && password.length < MIN_PASSWORD_LENGTH && (
              <p className="text-xs text-rose-400">
                Mínimo {MIN_PASSWORD_LENGTH} caracteres
              </p>
            )}
          </div>

          {/* Campo: Confirmar contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Confirmar contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
            {/* Indicador de coincidencia en tiempo real */}
            {confirmPassword && (
              <p
                className={`text-xs ${password === confirmPassword ? "text-emerald-400" : "text-rose-400"}`}
              >
                {password === confirmPassword
                  ? "✓ Las contraseñas coinciden"
                  : "✗ Las contraseñas no coinciden"}
              </p>
            )}
          </div>

          {/* Botón principal de registro */}
          <button
            type="button"
            onClick={handleSignUp}
            disabled={!canSubmit}
            className="w-full py-3.5 mt-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Creando perfil...
              </span>
            ) : (
              "Crear y Jugar 🎮"
            )}
          </button>
        </div>

        {/* ── Características de la app ── */}
        <div className="grid grid-cols-3 gap-3 mt-5 text-center">
          {[
            { icon: "🧩", label: "Drag & Drop" },
            { icon: "🤖", label: "Feedback IA" },
            { icon: "🏆", label: "Niveles XP" },
          ].map((f) => (
            <div
              key={f.label}
              className="p-3 border rounded-xl bg-zinc-900 border-white/5"
            >
              <div className="mb-1 text-2xl">{f.icon}</div>
              <div className="text-xs text-zinc-500">{f.label}</div>
            </div>
          ))}
        </div>

        {/* ── Navegación a Sign In ── */}
        <p className="mt-5 text-sm text-center text-zinc-500">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={onGoToSignIn}
            className="font-bold transition-colors text-emerald-500 hover:text-emerald-400 hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}
