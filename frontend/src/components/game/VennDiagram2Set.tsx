import { DropZone } from "./DropZone";
import type { ZoneId } from "../../types";

/**
 * Propiedades para el componente VennDiagram2Set.
 */
interface VennDiagram2SetProps {
  /** * Etiqueta o título descriptivo para el primer conjunto (Círculo Izquierdo). */
  setALabel: string;
  /** * Etiqueta o título descriptivo para el segundo conjunto (Círculo Derecho). */
  setBLabel: string;
  /** * Función callback que devuelve un arreglo de objetos (id, label) de las fichas. */
  getItemsInZone: (zone: ZoneId) => { id: string; label: string }[];
}

/**
 * Componente visual que renderiza un Diagrama de Venn clásico de 2 conjuntos.
 * Utiliza posicionamiento absoluto CSS para entrelazar dos círculos y ubicar
 * estratégicamente las zonas de caída (DropZones).
 * * @param {VennDiagram2SetProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El diagrama interactivo de 2 conjuntos renderizado.
 */
export function VennDiagram2Set({
  setALabel,
  setBLabel,
  getItemsInZone,
}: VennDiagram2SetProps) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex justify-between w-full px-8 mb-4 text-sm font-bold">
        <span className="px-3 py-1 rounded-full text-cyan-400 bg-cyan-900/30">
          {setALabel} (A)
        </span>
        <span className="px-3 py-1 text-purple-400 rounded-full bg-purple-900/30">
          {setBLabel} (B)
        </span>
      </div>

      <div className="relative w-full max-w-[500px] aspect-[4/3] flex items-center justify-center">
        <div className="absolute w-[65%] h-[85%] left-[5%] rounded-full border-[3px] border-cyan-400 bg-cyan-500/10 pointer-events-none" />
        <div className="absolute w-[65%] h-[85%] right-[5%] rounded-full border-[3px] border-purple-400 bg-purple-500/10 pointer-events-none" />

        <div className="absolute top-1/2 -translate-y-1/2 left-[8%] w-[22%] z-10">
          <DropZone
            id="onlyA"
            label="Solo A"
            items={getItemsInZone("onlyA")}
            chipColor="cyan"
            minHeight="min-h-[80px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[26%] z-20">
          <DropZone
            id="intersectionAB"
            label="A ∩ B"
            items={getItemsInZone("intersectionAB")}
            chipColor="gold"
            minHeight="min-h-[80px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 right-[8%] w-[22%] z-10">
          <DropZone
            id="onlyB"
            label="Solo B"
            items={getItemsInZone("onlyB")}
            chipColor="purple"
            minHeight="min-h-[80px]"
            className="!bg-transparent !border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
