/**
 * @fileoverview Header.tsx — Encabezado principal con menú de perfil de VennQuest.
 *
 * Componente de navegación superior (`sticky`) que muestra:
 * - Logotipo de la aplicación.
 * - Perfil del usuario: nombre, insignia de nivel, barra de XP.
 * - Menú desplegable (dropdown) al hacer clic en el nombre de usuario con:
 *     · "Cambiar nombre de usuario" → abre el modal `ChangeUsernameModal`.
 *     · "Cambiar contraseña" → abre el modal `ChangePasswordModal`.
 * - Botón de "Sign Out" que limpia el `localStorage` y devuelve al Sign In.
 *
 * @module components/ui/Header
 */

import { useState, useRef, useEffect } from "react";
import type { UserState } from "../../types";
import { LEVEL_LABELS, XP_FOR_LEVEL } from "../../types";
import { ChangeUsernameModal } from "./ChangeUsernameModal";
import { ChangePasswordModal } from "./ChangePasswordModal";

// ======================================================================
// INTERFACES
// ======================================================================

/**
 * Propiedades del componente Header.
 */
interface HeaderProps {
  /**
   * Datos del usuario autenticado actualmente.
   * `null` cuando no hay sesión activa (aunque el Header normalmente
   * solo se renderiza con usuario válido).
   */
  user: UserState | null;

  /**
   * Callback ejecutado cuando el usuario actualiza su nombre de usuario.
   * Permite que `App.tsx` actualice el estado global del usuario.
   *
   * @param {UserState} updated — Estado del usuario con el nombre actualizado.
   */
  onUserUpdate: (updated: UserState) => void;

  /**
   * Callback ejecutado cuando el usuario cierra sesión ("Sign Out").
   * Limpia la sesión y navega de vuelta a la pantalla de Sign In.
   */
  onSignOut: () => void;
}

// ======================================================================
// COMPONENTE
// ======================================================================

/**
 * Encabezado sticky de la aplicación con gestión de perfil integrada.
 *
 * Lógica del dropdown:
 * - El estado `dropdownOpen` controla la visibilidad del menú.
 * - Un `useEffect` con listener `mousedown` cierra el dropdown si el usuario
 *   hace clic fuera del área del menú (patrón "click outside").
 * - Al seleccionar una opción del menú, se activa el modal correspondiente.
 *
 * @param {HeaderProps} props — Props del componente.
 * @returns {JSX.Element} El encabezado renderizado.
 */
export function Header({ user, onUserUpdate, onSignOut }: HeaderProps) {
  // ──── Cálculos de progreso ─────────────────────────────────────────
  const level = user?.current_level ?? 1;
  const xp    = user?.experience_points ?? 0;
  const maxXp = XP_FOR_LEVEL[level] ?? 9999;
  const xpPct = Math.min(100, Math.round((xp / maxXp) * 100));

  // ──── Estado del dropdown ──────────────────────────────────────────
  /** Controla si el menú contextual del perfil está abierto */
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ──── Estado de los modales ────────────────────────────────────────
  /** Controla si el modal "Cambiar nombre" está visible */
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  /** Controla si el modal "Cambiar contraseña" está visible */
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // ──── Efecto: cerrar dropdown al hacer clic fuera ─────────────────
  /**
   * Patrón "Click Outside": detecta clics fuera del dropdown para cerrarlo
   * automáticamente. Como cuando un menú real se cierra al tocar otra parte
   * de la pantalla.
   */
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ──── Handlers ────────────────────────────────────────────────────

  /**
   * Abre el modal de "Cambiar nombre de usuario" y cierra el dropdown.
   */
  const handleOpenUsernameModal = () => {
    setDropdownOpen(false);
    setShowUsernameModal(true);
  };

  /**
   * Abre el modal de "Cambiar contraseña" y cierra el dropdown.
   */
  const handleOpenPasswordModal = () => {
    setDropdownOpen(false);
    setShowPasswordModal(true);
  };

  /**
   * Maneja la acción de cerrar sesión.
   * Limpia el identificador de sesión de `localStorage` y notifica a `App.tsx`
   * para que regrese a la pantalla de autenticación.
   */
  const handleSignOut = () => {
    localStorage.removeItem("vennquest_userId");
    onSignOut();
  };

  // ──── Colores dinámicos de la insignia por nivel ──────────────────
  const levelBadgeClass =
    level === 1
      ? "bg-cyan-500/10 border-cyan-400/30 text-cyan-300"
      : level === 2
      ? "bg-purple-500/10 border-purple-400/30 text-purple-300"
      : "bg-amber-500/10 border-amber-400/30 text-amber-300";

  const levelIcon = level === 1 ? "🌱" : level === 2 ? "🔮" : "👑";

  // ──── Render ──────────────────────────────────────────────────────

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-zinc-950/80 backdrop-blur-md border-white/5">
        <div className="flex items-center max-w-4xl gap-4 px-4 py-3 mx-auto">

          {/* ── Logotipo ── */}
          <div className="flex items-center gap-2 mr-auto">
            <div className="flex items-center justify-center w-8 h-8 text-sm rounded-lg bg-gradient-to-br from-emerald-600 to-cyan-500 shadow-lg shadow-emerald-900/30">
              ⊙
            </div>
            <span className="hidden text-xl text-white font-display sm:block">
              VennQuest
            </span>
          </div>

          {/* ── Sección de usuario ── */}
          {user && (
            <>
              {/* ── Insignia de nivel ── */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${levelBadgeClass}`}
              >
                <span>{levelIcon}</span>
                <span>Nv. {level}</span>
                <span className="hidden text-white/40 sm:inline">
                  — {LEVEL_LABELS[level]}
                </span>
              </div>

              {/* ── Barra de progreso XP ── */}
              <div className="items-center hidden gap-2 sm:flex">
                <span className="text-xs font-bold text-zinc-500">{xp} XP</span>
                <div className="w-24 sm:w-32 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-700 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-600">{maxXp}</span>
              </div>

              {/* ── Dropdown de perfil ── */}
              <div className="relative" ref={dropdownRef}>
                {/**
                 * Botón del nombre de usuario — actúa como "toggle" del menú.
                 * Al hacer clic se alterna `dropdownOpen`.
                 */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold transition-all rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <span className="text-zinc-500">👤</span>
                  <span className="max-w-[120px] truncate">{user.username}</span>
                  {/* Chevron que rota al abrirse */}
                  <svg
                    className={`w-3 h-3 transition-transform text-zinc-500 ${dropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ── Menú desplegable ── */}
                {dropdownOpen && (
                  <div className="absolute right-0 z-50 w-52 mt-2 overflow-hidden border shadow-xl rounded-xl bg-zinc-900 border-white/8 shadow-black/50 animate-slide-up">

                    {/* Separador con el nombre del usuario */}
                    <div className="px-4 py-2.5 border-b border-white/5">
                      <p className="text-xs text-zinc-500">Sesión activa como</p>
                      <p className="text-sm font-bold text-zinc-200 truncate">{user.username}</p>
                    </div>

                    {/* Opción: Cambiar nombre de usuario */}
                    <button
                      type="button"
                      onClick={handleOpenUsernameModal}
                      className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left transition-colors text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <span className="text-base">✏️</span>
                      Cambiar nombre
                    </button>

                    {/* Opción: Cambiar contraseña */}
                    <button
                      type="button"
                      onClick={handleOpenPasswordModal}
                      className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left transition-colors text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <span className="text-base">🔒</span>
                      Cambiar contraseña
                    </button>

                    {/* Separador */}
                    <div className="border-t border-white/5" />

                    {/* Opción: Cerrar sesión */}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left transition-colors text-rose-400 hover:bg-rose-600/10 hover:text-rose-300"
                    >
                      <span className="text-base">🚪</span>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>

              {/* ── Botón de Sign Out directo (visible en pantallas grandes) ── */}
              <button
                type="button"
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-600/10 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Modales de gestión de perfil ── */}
      {user && showUsernameModal && (
        <ChangeUsernameModal
          user={user}
          onSuccess={(updatedUser) => {
            onUserUpdate(updatedUser);
            setShowUsernameModal(false);
          }}
          onClose={() => setShowUsernameModal(false)}
        />
      )}

      {user && showPasswordModal && (
        <ChangePasswordModal
          user={user}
          onSuccess={() => setShowPasswordModal(false)}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </>
  );
}
