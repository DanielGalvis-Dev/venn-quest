/**
 * @fileoverview alerts.ts — Utilidades centralizadas de SweetAlert2 para VennQuest.
 *
 * Este módulo exporta funciones pre-configuradas con el tema "Dark Mode Hacker"
 * de la aplicación. Centralizar las alertas aquí garantiza que:
 *   1. La apariencia sea consistente en toda la app.
 *   2. Sea fácil modificar el estilo global en un único lugar.
 *   3. Los componentes no necesiten conocer la API interna de SweetAlert2.
 *
 * @module utils/alerts
 */

import Swal, { SweetAlertOptions, SweetAlertResult } from "sweetalert2";

// ======================================================================
// CONFIGURACIÓN BASE
// El objeto `baseConfig` se mezcla en TODAS las alertas de la aplicación
// para garantizar el tema oscuro consistente.
// ======================================================================

/**
 * Configuración base compartida por todas las alertas de la app.
 * Define el tema visual alineado con la paleta "Dark Mode Hacker".
 */
const baseConfig: SweetAlertOptions = {
  /**
   * Clases CSS aplicadas al contenedor del popup.
   * Reutilizan los overrides definidos en `index.css` para SweetAlert2.
   */
  customClass: {
    popup:   "swal2-popup",
    title:   "swal2-title",
    confirmButton: "swal2-confirm",
    cancelButton:  "swal2-cancel",
  },
  /** El botón de confirmación está al FRENTE para mejor UX en dark mode */
  reverseButtons: true,
  /** Temporizador por defecto: sin auto-cierre (el usuario decide) */
  timer: undefined,
  /** Animaciones activadas (se usan las de index.css) */
  showClass:  { popup: "swal2-show" },
  hideClass:  { popup: "swal2-hide" },
  /** Tamaño del ícono más compacto para pantallas pequeñas */
  iconColor: undefined,
};

// ======================================================================
// ALERTAS DE NOTIFICACIÓN (Toast & Modal)
// ======================================================================

/**
 * Muestra una alerta de ÉXITO con ícono verde y botón de confirmación.
 *
 * @param {string} title   — Título principal del mensaje.
 * @param {string} [text]  — Descripción secundaria opcional.
 * @returns {Promise<SweetAlertResult>} Resultado de la interacción del usuario.
 *
 * @example
 * await showSuccess("¡Usuario creado!", "Bienvenido a VennQuest 🎉");
 */
export async function showSuccess(
  title: string,
  text?: string,
): Promise<SweetAlertResult> {
  return Swal.fire({
    ...baseConfig,
    icon:             "success",
    title,
    text,
    confirmButtonText: "¡Genial!",
  });
}

/**
 * Muestra una alerta de ERROR con ícono rojo.
 * Útil para errores de red, credenciales inválidas, etc.
 *
 * @param {string} title   — Título del error (ej. "Credenciales incorrectas").
 * @param {string} [text]  — Detalle adicional del error.
 * @returns {Promise<SweetAlertResult>}
 *
 * @example
 * await showError("Error de conexión", "El servidor no responde. Intenta de nuevo.");
 */
export async function showError(
  title: string,
  text?: string,
): Promise<SweetAlertResult> {
  return Swal.fire({
    ...baseConfig,
    icon:             "error",
    title,
    text,
    confirmButtonText: "Entendido",
  });
}

/**
 * Muestra una alerta de ADVERTENCIA con ícono ámbar.
 *
 * @param {string} title   — Título de la advertencia.
 * @param {string} [text]  — Detalle adicional.
 * @returns {Promise<SweetAlertResult>}
 */
export async function showWarning(
  title: string,
  text?: string,
): Promise<SweetAlertResult> {
  return Swal.fire({
    ...baseConfig,
    icon:             "warning",
    title,
    text,
    confirmButtonText: "OK",
  });
}

/**
 * Muestra una alerta de INFORMACIÓN con ícono cyan.
 *
 * @param {string} title   — Título informativo.
 * @param {string} [text]  — Detalle adicional.
 * @returns {Promise<SweetAlertResult>}
 */
export async function showInfo(
  title: string,
  text?: string,
): Promise<SweetAlertResult> {
  return Swal.fire({
    ...baseConfig,
    icon:             "info",
    title,
    text,
    confirmButtonText: "Entendido",
  });
}

// ======================================================================
// ALERTAS DE CONFIRMACIÓN (con Cancelar)
// ======================================================================

/**
 * Muestra un diálogo de CONFIRMACIÓN con botones "Confirmar" y "Cancelar".
 * Ideal para acciones destructivas o irreversibles como cambiar contraseña.
 *
 * @param {string} title              — Pregunta o acción a confirmar.
 * @param {string} [text]             — Descripción o consecuencias de la acción.
 * @param {string} [confirmText]      — Texto del botón de confirmación (default: "Sí, confirmar").
 * @returns {Promise<SweetAlertResult>} `result.isConfirmed` es `true` si el usuario aceptó.
 *
 * @example
 * const result = await showConfirm("¿Cambiar contraseña?", "Esta acción es inmediata.");
 * if (result.isConfirmed) { ... }
 */
export async function showConfirm(
  title: string,
  text?: string,
  confirmText = "Sí, confirmar",
): Promise<SweetAlertResult> {
  return Swal.fire({
    ...baseConfig,
    icon:              "question",
    title,
    text,
    showCancelButton:  true,
    confirmButtonText: confirmText,
    cancelButtonText:  "Cancelar",
  });
}

// ======================================================================
// ALERTAS ESPECIALES
// ======================================================================

/**
 * Alerta especial para el flujo de "Nombre de usuario ya existe".
 * Muestra el error y ofrece hasta 3 sugerencias de nombres alternativos
 * como botones clickeables para auto-completar el input del formulario.
 *
 * El flujo de la analogía: es como cuando intentas registrar un dominio web
 * y ya está tomado — la herramienta te sugiere variaciones disponibles.
 *
 * @param {string[]} suggestions — Array de 1-3 nombres de usuario disponibles sugeridos por el backend.
 * @returns {Promise<string | null>}
 *   - Si el usuario elige una sugerencia: devuelve el nombre elegido (`string`).
 *   - Si el usuario cierra/cancela: devuelve `null`.
 *
 * @example
 * const chosen = await showUsernameTakenAlert(["Player_42", "Player_07", "Player_99"]);
 * if (chosen) setUsername(chosen);
 */
export async function showUsernameTakenAlert(
  suggestions: string[],
): Promise<string | null> {
  /**
   * Construimos el HTML interno dinámicamente con los botones de sugerencia.
   * Cada botón tiene un `data-value` con el nombre sugerido.
   * Usamos estilos inline + clases de index.css para coherencia visual.
   */
  const suggestionsHtml =
    suggestions.length > 0
      ? `
        <p class="mt-3 mb-2 text-sm text-zinc-400">¿Quizás uno de estos?</p>
        <div class="flex flex-col gap-2 mt-1">
          ${suggestions
            .map(
              (s) => `
            <button
              data-value="${s}"
              class="swal2-suggestion-btn w-full px-3 py-2 text-sm font-bold rounded-lg
                     bg-zinc-800 border border-emerald-500/30 text-emerald-400
                     hover:bg-zinc-700 hover:border-emerald-400/60 transition-all cursor-pointer"
            >
              ✦ ${s}
            </button>`,
            )
            .join("")}
        </div>
      `
      : "";

  return new Promise((resolve) => {
    Swal.fire({
      ...baseConfig,
      icon:  "error",
      title: "Nombre en uso",
      html: `
        <p class="text-zinc-400">
          El nombre de usuario <strong class="text-zinc-200">"${
            /* el nombre se pasa via sugerencias[0] context */ suggestions[0]?.replace(/\d+$/, "") || "ese"
          }"</strong>
          ya está registrado.
        </p>
        ${suggestionsHtml}
      `,
      confirmButtonText: "Elegir otro",
      showCancelButton:  false,
      /**
       * `didOpen` se ejecuta cuando el DOM del popup ya está listo.
       * Adjuntamos listeners a los botones de sugerencia DENTRO del popup.
       */
      didOpen: (popup) => {
        popup.querySelectorAll<HTMLButtonElement>(".swal2-suggestion-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const chosen = btn.getAttribute("data-value");
            Swal.close();
            resolve(chosen);
          });
        });
      },
    }).then((result) => {
      // Si el usuario hizo clic en "Elegir otro" sin seleccionar sugerencia
      if (result.isDismissed || result.isConfirmed) {
        resolve(null);
      }
    });
  });
}

/**
 * Muestra un modal con un INPUT de texto para que el usuario ingrese información.
 * Se usa, por ejemplo, en el flujo de "¿Olvidaste tu contraseña?".
 *
 * @param {string} title         — Título del modal.
 * @param {string} inputLabel    — Etiqueta visible encima del input.
 * @param {string} placeholder   — Texto placeholder del campo.
 * @param {string} [confirmText] — Texto del botón de confirmar (default: "Enviar").
 * @returns {Promise<string | null>}
 *   - El valor ingresado por el usuario como `string`.
 *   - `null` si canceló o cerró sin ingresar nada.
 *
 * @example
 * const email = await showInputModal(
 *   "Recuperar contraseña",
 *   "Correo electrónico",
 *   "tu@correo.com"
 * );
 */
export async function showInputModal(
  title: string,
  inputLabel: string,
  placeholder: string,
  confirmText = "Enviar",
): Promise<string | null> {
  const result = await Swal.fire({
    ...baseConfig,
    title,
    input:            "text",
    inputLabel,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText:  "Cancelar",
    /**
     * Validación inline: no permite enviar el campo vacío.
     * La analogía es la validación "en puerta" antes de entrar al servidor.
     */
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return "Este campo es obligatorio.";
      }
    },
  });

  if (result.isConfirmed && result.value) {
    return result.value.trim() as string;
  }
  return null;
}

/**
 * Muestra un toast (notificación flotante) no-intrusivo en la esquina superior.
 * Útil para confirmar acciones rápidas como "Contraseña actualizada".
 *
 * @param {string} message             — Texto del toast.
 * @param {"success"|"error"|"info"} [type] — Tipo visual del toast (default: "success").
 *
 * @example
 * showToast("¡Nombre actualizado correctamente!", "success");
 */
export function showToast(
  message: string,
  type: "success" | "error" | "info" | "warning" = "success",
): void {
  const iconColors: Record<string, string> = {
    success: "#10B981",
    error:   "#E11D48",
    info:    "#06b6d4",
    warning: "#FBBF24",
  };

  Swal.fire({
    toast:             true,
    position:          "top-end",
    icon:              type,
    iconColor:         iconColors[type],
    title:             message,
    showConfirmButton: false,
    timer:             3000,
    timerProgressBar:  true,
    customClass: {
      popup: "swal2-popup",
      title: "swal2-title",
    },
  });
}
