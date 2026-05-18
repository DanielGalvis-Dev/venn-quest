/**
 * Componente visual que muestra una pantalla de carga animada.
 * Utiliza círculos concéntricos giratorios y un texto parpadeante para indicar
 * al usuario que un proceso en segundo plano (como una petición a la API) está en curso.
 * * @param {Object} props - Propiedades del componente.
 * @param {string} [props.message='Cargando...'] - Mensaje de texto opcional que se muestra debajo del spinner.
 * @returns {JSX.Element} La pantalla de carga renderizada.
 */
export function LoadingScreen({
  message = "Cargando...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      {/* Contenedor del Spinner Animado */}
      <div className="relative w-20 h-20">
        {/* Anillo estático de fondo */}
        <div className="absolute inset-0 border-4 rounded-full border-purple-600/20" />
        {/* Anillo exterior giratorio (Púrpura) */}
        <div className="absolute inset-0 border-4 rounded-full border-t-purple-500 animate-spin" />
        {/* Anillo interior giratorio en sentido inverso (Cyan) */}
        <div
          className="absolute border-4 rounded-full inset-2 border-t-cyan-400 animate-spin"
          style={{ animationDuration: "0.7s", animationDirection: "reverse" }}
        />
        {/* Icono central estático */}
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          ⊙
        </div>
      </div>

      {/* Mensaje de estado con efecto de pulso (fade in/out) */}
      <p className="text-xl text-purple-300 font-display animate-pulse">
        {message}
      </p>
    </div>
  );
}

/**
 * Componente visual que muestra una pantalla de error amigable.
 * Se utiliza cuando falla una petición al servidor, indicando al usuario qué salió mal
 * y proporcionando un botón interactivo para reintentar la acción.
 * * @param {Object} props - Propiedades del componente.
 * @param {string} props.message - El mensaje descriptivo del error ocurrido.
 * @param {() => void} props.onRetry - Función callback que se ejecuta al hacer clic en el botón "Intentar de nuevo".
 * @returns {JSX.Element} La pantalla de error renderizada.
 */
export function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6">
      {/* Icono visual de error */}
      <div className="text-5xl">🔴</div>

      {/* Título principal del error */}
      <h2 className="text-2xl text-red-400 font-display">Algo salió mal</h2>

      {/* Mensaje detallado del error centrado y con ancho máximo */}
      <p className="max-w-sm text-sm text-center text-white/50">{message}</p>

      {/* Botón de acción para reintentar */}
      <button
        onClick={onRetry}
        className="px-6 py-3 font-bold text-white transition-all bg-purple-600 rounded-xl hover:bg-purple-500"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
