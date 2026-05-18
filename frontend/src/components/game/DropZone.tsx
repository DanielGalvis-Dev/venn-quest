import { useDroppable } from "@dnd-kit/core";
import { DraggableChip } from "./DraggableChip";
import type { ZoneId } from "../../types";

/**
 * Propiedades para el componente DropZone.
 */
interface DropZoneProps {
  /** * Identificador único de la zona de caída.
   * Es crucial para que dnd-kit sepa exactamente en qué parte del diagrama se soltó la ficha.
   * Debe ser uno de los valores definidos en el tipo `ZoneId` (ej. 'onlyA', 'intersectionAB').
   */
  id: ZoneId;
  /** * (Opcional) Texto descriptivo que se muestra en el fondo de la zona
   * para guiar al usuario (ej. "Solo A", "A ∩ B").
   */
  label?: string;
  /** * Arreglo de objetos (id y etiqueta) de las fichas soltadas en esta zona. */
  items: { id: string; label: string }[];
  /** * (Opcional) Clases CSS adicionales (usualmente Tailwind) para personalizar
   * los estilos base del contenedor.
   * @default "bg-transparent border-transparent"
   */
  className?: string;
  /** * (Opcional) El color que heredarán las fichas (`DraggableChip`) cuando
   * se rendericen dentro de esta zona. Ayuda a mantener la coherencia visual.
   * @default "purple"
   */
  chipColor?: string;
  /** * (Opcional) Bandera que determina si el texto del `label` debe mostrarse visualmente.
   * Útil para ocultar el texto en zonas como el banco inicial de fichas.
   * @default true
   */
  showLabel?: boolean;
  /** * (Opcional) Clase CSS (Tailwind) que define la altura mínima de la zona,
   * asegurando que haya espacio suficiente para soltar fichas incluso si está vacía.
   * @default "min-h-[50px]"
   */
  minHeight?: string;
}

/**
 * Componente que representa un área específica donde el usuario puede soltar fichas.
 * Utiliza `useDroppable` de la librería `@dnd-kit/core` para reaccionar a los eventos de arrastre.
 * Contiene y renderiza dinámicamente las fichas (`DraggableChip`) que le pertenecen.
 * * @param {DropZoneProps} props - Las propiedades del componente.
 * @returns {JSX.Element} Un contenedor droppable.
 */
export function DropZone({
  id,
  label,
  items,
  className = "bg-transparent border-transparent",
  chipColor = "purple",
  showLabel = true,
  minHeight = "min-h-[50px]",
}: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        ${className}
        ${minHeight}
        ${
          isOver
            ? "!bg-white/5 !border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] z-50 scale-105"
            : ""
        }
        rounded-xl border-2
        transition-all duration-200
        flex flex-col items-center justify-center
        gap-1 p-1.5 sm:p-2
        relative
      `}
    >
      {showLabel && label && (
        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest text-center pointer-events-none mb-0.5 leading-tight z-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          {label}
        </span>
      )}

      <div className="z-10 flex flex-wrap justify-center w-full gap-1">
        {items.map((item) => (
          <DraggableChip
            key={item.id}
            id={item.id}
            label={item.label}
            color={chipColor}
            size="sm"
          />
        ))}
      </div>

      {items.length === 0 && !isOver && (
        <span className="absolute text-xs pointer-events-none text-white/10 bottom-1 drop-shadow-md">
          {isOver ? "⬇️" : "·"}
        </span>
      )}
    </div>
  );
}
