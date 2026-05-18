import { useDraggable } from "@dnd-kit/core";

/**
 * Propiedades para el componente DraggableChip.
 */
interface DraggableChipProps {
  /** * Identificador único de la ficha.
   * Es estrictamente necesario para que dnd-kit pueda rastrear el elemento durante el arrastre.
   */
  id: string;
  /** * El texto o valor numérico que se mostrará visualmente dentro de la ficha.
   */
  label: string;
  /** * El esquema de color temático de la ficha.
   * Soporta colores asociados a los conjuntos del diagrama de Venn.
   * @default "purple"
   */
  color?: "purple" | "cyan" | "gold" | "green" | "red" | string;
  /** * Tamaño visual de la ficha.
   * 'sm' (pequeño) es ideal para zonas ajustadas, 'md' (mediano) para el banco de fichas.
   * @default "md"
   */
  size?: "sm" | "md";
  /** * (Opcional) Indica si la ficha se está renderizando dentro del DragOverlay.
   * Sirve para evitar la duplicación visual (el bug del fantasma volador) y aplicar los estilos de "vuelo".
   */
  isOverlay?: boolean;
}

/**
 * Componente que representa una ficha (chip) arrastrable dentro del juego.
 * Utiliza `useDraggable` de dnd-kit para gestionar la física y eventos de arrastre.
 * * @param {DraggableChipProps} props - Propiedades del componente.
 * @returns {JSX.Element} Un elemento interactivo y arrastrable.
 */
export function DraggableChip({
  id,
  label,
  color = "purple",
  size = "md",
  isOverlay = false,
}: DraggableChipProps) {
  // Inicializamos el hook de arrastre de dnd-kit
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  // Mapa de colores predefinidos compatibles con el diseño de los Diagramas de Venn
  const colorMap: Record<string, string> = {
    purple: "bg-purple-600/80 border-purple-400 text-white hover:bg-purple-500",
    cyan: "bg-cyan-600/80 border-cyan-400 text-white hover:bg-cyan-500",
    gold: "bg-amber-500/80 border-amber-300 text-white hover:bg-amber-400",
    green: "bg-green-600/80 border-green-400 text-white hover:bg-green-500",
    red: "bg-red-600/80 border-red-400 text-white hover:bg-red-500",
  };

  // Clases de tamaño predefinidas basadas en Tailwind CSS
  const sizeMap = {
    sm: "px-2 py-1 text-[11px] min-w-[24px] leading-none",
    md: "px-3 py-1.5 text-sm min-w-[36px]",
  };

  return (
    <div
      // Si es un overlay, no necesitamos registrar el nodo con dnd-kit, el overlay lo gestiona.
      ref={isOverlay ? undefined : setNodeRef}
      style={{
        // Efecto "hueco": Si la ficha original se está arrastrando, la dejamos en su sitio semitransparente (0.3).
        // El DragOverlay (opacity 1) será el que se mueva por la pantalla.
        opacity: isDragging && !isOverlay ? 0.3 : 1,
        cursor: isOverlay ? "grabbing" : "grab",
      }}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      className={`
        ${colorMap[color] || colorMap.purple}
        ${sizeMap[size]}
        ${
          isOverlay
            ? "rotate-3 scale-110 shadow-2xl z-[9999]" // Estilos exclusivos de la ficha que flota
            : "transition-all duration-150 active:scale-95 z-10" // Estilos de la ficha en reposo
        }
        inline-flex items-center justify-center
        rounded-full border-2 font-bold font-body
        select-none touch-none
      `}
    >
      {label}
    </div>
  );
}
