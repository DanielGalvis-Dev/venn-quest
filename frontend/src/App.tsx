/**
 * @fileoverview App.tsx — Componente raíz y orquestador de VennQuest.
 *
 * Actúa como una "Máquina de Estados" (State Machine) que controla qué
 * pantalla se renderiza según el estado global de la aplicación.
 *
 * Estados posibles de la aplicación:
 * - `signin`  : Pantalla de inicio de sesión (`SignIn`).
 * - `signup`  : Pantalla de registro de nuevo usuario (`SignUp`).
 * - `loading` : Pantalla de carga mientras se obtiene el problema del backend.
 * - `playing` : Pantalla principal del juego (`GameScreen` + `Header`).
 * - `error`   : Pantalla de error de red o servidor.
 *
 * Responsabilidades:
 * 1. Gestionar la sesión del usuario (con persistencia en `localStorage`).
 * 2. Orquestar la navegación entre pantallas.
 * 3. Cargar problemas desde el backend.
 * 4. Propagar actualizaciones del usuario hacia abajo en el árbol.
 */

import { useState, useCallback, useEffect } from "react";
import { Header }          from "./components/ui/Header";
import { SignIn }          from "./components/ui/SignIn";
import { SignUp }          from "./components/ui/SignUp";
import { GameScreen }      from "./components/game/GameScreen";
import { LoadingScreen, ErrorScreen } from "./components/ui/LoadingScreen";
import { fetchProblem, fetchUser } from "./utils/api";
import type { Problem, UserState }  from "./types";

// ======================================================================
// TIPOS
// ======================================================================

/**
 * Define todos los posibles estados globales de la aplicación.
 *
 * La transición es análoga a las pantallas de una máquina de videojuego:
 * - `signin`  → pantalla de login
 * - `signup`  → pantalla de registro
 * - `loading` → spinner de carga
 * - `playing` → juego activo
 * - `error`   → pantalla de fallo
 */
type AppState = "signin" | "signup" | "loading" | "playing" | "error";

// ======================================================================
// COMPONENTE RAÍZ
// ======================================================================

/**
 * Componente raíz de VennQuest.
 *
 * @returns {JSX.Element} La estructura principal de la SPA.
 */
export default function App() {
  // ──── Estado global de la app ─────────────────────────────────────
  /** Estado de navegación actual (qué pantalla mostrar) */
  const [appState, setAppState] = useState<AppState>("signin");
  /** Datos del usuario autenticado, o `null` si no hay sesión */
  const [user,    setUser]    = useState<UserState | null>(null);
  /** Problema actual del juego cargado desde el backend */
  const [problem, setProblem] = useState<Problem | null>(null);
  /** Mensaje de error para la pantalla `ErrorScreen` */
  const [errorMsg, setErrorMsg] = useState("");

  // ──── Handlers de estado ──────────────────────────────────────────

  /**
   * Carga un nuevo problema desde el backend para el usuario dado.
   * Maneja internamente las transiciones `loading → playing | error`.
   *
   * @param {number} userId — ID del usuario que solicita el problema.
   */
  const loadProblem = useCallback(async (userId: number) => {
    setAppState("loading");
    setErrorMsg("");
    try {
      const data = await fetchProblem(userId);
      setProblem(data.problem);
      // Sincroniza el estado del usuario con los datos más recientes del servidor
      setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
      setAppState("playing");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "No se pudo cargar el problema",
      );
      setAppState("error");
    }
  }, []);

  /**
   * Callback ejecutado desde `SignIn` o `SignUp` cuando la autenticación
   * es exitosa. Guarda el usuario en el estado global y carga su primer problema.
   *
   * @param {UserState} newUser — Datos del usuario autenticado/registrado.
   */
  const handleUserReady = useCallback(
    (newUser: UserState) => {
      setUser(newUser);
      loadProblem(newUser.id);
    },
    [loadProblem],
  );

  /**
   * Actualiza el estado global del usuario.
   * Se llama después de que el backend evalúa una respuesta (XP + nivel).
   *
   * @param {UserState} updated — Estado actualizado del usuario.
   */
  const handleUserUpdate = useCallback((updated: UserState) => {
    setUser(updated);
  }, []);

  /**
   * Solicita el siguiente problema al backend.
   * Se llama desde `GameScreen` cuando el usuario completa un problema.
   */
  const handleNextProblem = useCallback(() => {
    if (user) loadProblem(user.id);
  }, [user, loadProblem]);

  /**
   * Intenta recuperarse de un estado de error.
   * - Si hay usuario activo: intenta recargar el problema.
   * - Si no hay usuario: vuelve a la pantalla de Sign In.
   */
  const handleRetry = useCallback(() => {
    if (user) loadProblem(user.id);
    else setAppState("signin");
  }, [user, loadProblem]);

  /**
   * Cierra la sesión del usuario actual.
   * Limpia el estado global y vuelve a la pantalla de Sign In.
   * El localStorage ya fue limpiado desde el componente `Header`.
   */
  const handleSignOut = useCallback(() => {
    setUser(null);
    setProblem(null);
    setAppState("signin");
  }, []);

  // ──── Efectos ─────────────────────────────────────────────────────

  /**
   * Efecto de Montaje — Se ejecuta una sola vez al abrir la app.
   *
   * Comprueba si hay una sesión guardada en `localStorage`.
   * Si la hay, recupera al usuario "silenciosamente" y entra al juego
   * sin mostrar la pantalla de login (como el "recuérdame" de una web).
   */
  useEffect(() => {
    const stored = localStorage.getItem("vennquest_userId");
    if (stored) {
      const id = parseInt(stored);
      if (!isNaN(id)) {
        fetchUser(id)
          .then(({ user: u }) => {
            setUser(u);
            loadProblem(u.id);
          })
          .catch(() => {
            // La sesión expiró o el usuario fue borrado → limpiar y mostrar login
            localStorage.removeItem("vennquest_userId");
          });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Efecto de Persistencia de Sesión.
   * Cada vez que `user` cambia, persiste su ID en `localStorage`
   * para recuperar la sesión al recargar la página.
   */
  useEffect(() => {
    if (user) {
      localStorage.setItem("vennquest_userId", String(user.id));
    }
  }, [user]);

  // ──── Render principal ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* El Header solo aparece cuando el usuario está jugando (estado `playing`) */}
      {appState === "playing" && user && (
        <Header
          user={user}
          onUserUpdate={handleUserUpdate}
          onSignOut={handleSignOut}
        />
      )}

      <main>
        {/* ── Pantalla de Sign In ── */}
        {appState === "signin" && (
          <SignIn
            onUserReady={handleUserReady}
            onGoToSignUp={() => setAppState("signup")}
          />
        )}

        {/* ── Pantalla de Sign Up ── */}
        {appState === "signup" && (
          <SignUp
            onUserReady={handleUserReady}
            onGoToSignIn={() => setAppState("signin")}
          />
        )}

        {/* ── Pantalla de carga ── */}
        {appState === "loading" && (
          <LoadingScreen message="Preparando el problema..." />
        )}

        {/* ── Pantalla de error ── */}
        {appState === "error" && (
          <ErrorScreen message={errorMsg} onRetry={handleRetry} />
        )}

        {/* ── Pantalla de juego ── */}
        {appState === "playing" && problem && user && (
          <GameScreen
            /**
             * Usar `key={problem.id}` fuerza a React a destruir y reconstruir
             * el componente completamente cuando cambia el problema,
             * reseteando todos los estados internos de forma limpia.
             */
            key={problem.id}
            problem={problem}
            user={user}
            onUserUpdate={handleUserUpdate}
            onNextProblem={handleNextProblem}
          />
        )}
      </main>
    </div>
  );
}
