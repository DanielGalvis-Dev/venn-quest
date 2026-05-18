/**
 * @fileoverview SignIn.tsx — Componente de Inicio de Sesión de VennQuest.
 *
 * Vista dedicada para autenticar usuarios existentes con nombre de usuario
 * y contraseña. Incluye:
 *   - Formulario de login con validación básica.
 *   - Flujo de "¿Olvidaste tu contraseña?" mediante modal de SweetAlert2.
 *   - Feedback visual de errores con alertas SweetAlert2 (tema dark).
 *   - Animaciones decorativas de fondo (círculos giratorios).
 *
 * @module components/ui/SignIn
 */

import { useState, KeyboardEvent } from "react";
import { loginUser, requestPasswordReset } from "../../utils/api";
import { showError, showInputModal, showSuccess } from "../../utils/alerts";
import type { UserState } from "../../types";

// ======================================================================
// INTERFACES
// ======================================================================

/**
 * Propiedades del componente SignIn.
 */
interface SignInProps {
  /**
   * Callback ejecutado cuando el usuario se autentica con éxito.
   * Transmite el estado del usuario al orquestador (`App.tsx`).
   *
   * @param {UserState} user — Datos del usuario autenticado.
   */
  onUserReady: (user: UserState) => void;

  /**
   * Callback para navegar a la pantalla de registro (`SignUp`).
   * Se invoca cuando el usuario hace clic en "¿No tienes cuenta? Regístrate".
   */
  onGoToSignUp: () => void;
}

// ======================================================================
// COMPONENTE
// ======================================================================

/**
 * Componente de pantalla de inicio de sesión.
 *
 * Flujo principal:
 * 1. El usuario ingresa su nombre de usuario y contraseña.
 * 2. Al hacer clic en "Entrar" (o presionar Enter), se llama a `loginUser`.
 * 3. Si el login es exitoso, se llama a `onUserReady` con los datos del usuario.
 * 4. Si falla, se muestra una alerta de SweetAlert2 con el mensaje de error.
 *
 * Flujo "¿Olvidaste tu contraseña?":
 * 1. Al hacer clic, se abre un modal de SweetAlert2 con un campo de texto.
 * 2. El usuario ingresa su nombre de usuario o correo.
 * 3. Se llama a `requestPasswordReset` que hace POST al backend.
 * 4. El backend genera contraseña temporal, la hashea y la envía por email.
 * 5. Se muestra alerta de éxito o error según la respuesta.
 *
 * @param {SignInProps} props — Props del componente.
 * @returns {JSX.Element} Formulario de inicio de sesión renderizado.
 */
export function SignIn({ onUserReady, onGoToSignUp }: SignInProps) {
  // ──── Estado del formulario ────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  /** Controla el estado de carga para deshabilitar el botón y mostrar spinner */
  const [isLoading, setIsLoading] = useState(false);

  // ──── Handlers ────────────────────────────────────────────────────

  /**
   * Maneja el envío del formulario de login.
   * Valida los campos, llama a la API y gestiona la respuesta.
   */
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      await showError(
        "Campos incompletos",
        "Por favor ingresa tu usuario y contraseña.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await loginUser(username.trim(), password.trim());
      onUserReady(user);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al iniciar sesión";
      await showError("Credenciales incorrectas", msg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Permite enviar el formulario presionando la tecla Enter
   * desde cualquier campo de texto.
   *
   * @param {KeyboardEvent} e — Evento de teclado capturado.
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  /**
   * Maneja el flujo completo de recuperación de contraseña olvidada.
   *
   * Flujo:
   * 1. Abre modal pidiendo el username o email registrado.
   * 2. Llama a `requestPasswordReset` → POST /api/users/forgot-password.
   * 3. El backend valida, genera contraseña temporal y la envía al email del usuario.
   * 4. Muestra alerta de éxito o error según la respuesta.
   *
   * Caso especial: si el usuario existe pero no registró correo, el backend
   * devuelve 400 con un mensaje específico que se muestra con instrucciones claras.
   */
  const handleForgotPassword = async () => {
    // Paso 1: Solicitar identificador (username o email)
    const identifier = await showInputModal(
      "¿Olvidaste tu contraseña?",
      "Usuario o correo electrónico",
      "Ingresa tu usuario o email registrado...",
      "Enviar contraseña temporal",
    );

    // El usuario canceló — no hacemos nada
    if (!identifier) return;

    // Paso 2: Llamar al backend
    setIsLoading(true);
    try {
      const { message } = await requestPasswordReset(identifier);
      await showSuccess(
        "¡Correo enviado! 📬",
        message ||
          "Revisa tu bandeja de entrada. Recibirás una contraseña temporal.",
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo procesar la solicitud";

      /**
       * Caso especial: el usuario existe pero no tiene correo registrado.
       * Le indicamos que puede cambiar su contraseña desde el perfil si recuerda
       * la contraseña actual, o que debe contactar al administrador.
       */
      if (msg.includes("no tiene un correo registrado")) {
        await showError(
          "Sin correo registrado",
          "Este usuario no tiene un correo asociado. Si recuerdas tu contraseña actual, puedes cambiarla desde tu perfil una vez que ingreses.",
        );
      } else {
        await showError("Error al recuperar contraseña", msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ──── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950">
      {/* ── Fondos decorativos animados ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full border border-emerald-500/10 animate-[spin_22s_linear_infinite]" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full border border-purple-500/10 animate-[spin_16s_linear_infinite_reverse]" />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full border border-cyan-500/5 animate-[spin_28s_linear_infinite]" />
      </div>

      {/* ── Contenedor principal ── */}
      <div className="relative z-10 w-full max-w-sm">
        {/* ── Logotipo y título ── */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 shadow-lg rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-500 shadow-emerald-900/40 animate-float">
            <span className="text-4xl">⊙</span>
          </div>
          <h1 className="mb-1 text-5xl text-white font-display">VennQuest</h1>
          <p className="text-sm text-zinc-500">Bienvenido de nuevo</p>
        </div>

        {/* ── Tarjeta del formulario ── */}
        <div className="p-6 space-y-4 border shadow-xl rounded-2xl bg-zinc-900 border-white/7">
          <h2 className="text-xl text-center text-white font-display">
            Iniciar Sesión
          </h2>

          {/* Campo: Usuario */}
          <div className="space-y-1">
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500">
              Usuario
            </label>
            <input
              type="text"
              placeholder="tu_nombre_de_usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
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
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm text-white transition-all border rounded-xl bg-zinc-800 border-zinc-700 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
            />
          </div>

          {/* Enlace: ¿Olvidaste tu contraseña? */}
          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isLoading}
              className="text-xs transition-colors text-emerald-500 hover:text-emerald-400 hover:underline disabled:opacity-40"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Botón principal de login */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={!username.trim() || !password.trim() || isLoading}
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
                Verificando...
              </span>
            ) : (
              "Entrar 🚀"
            )}
          </button>
        </div>

        {/* ── Navegación a Sign Up ── */}
        <p className="mt-5 text-sm text-center text-zinc-500">
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            onClick={onGoToSignUp}
            className="font-bold transition-colors text-emerald-500 hover:text-emerald-400 hover:underline"
          >
            Regístrate aquí
          </button>
        </p>
      </div>
    </div>
  );
}
