import { DropZone } from "./DropZone";
import type { ZoneId } from "../../types";

/**
 * Propiedades para el componente VennDiagram3Set.
 */
interface VennDiagram3SetProps {
  /** * Etiqueta o título descriptivo para el primer conjunto (Círculo Superior Izquierdo). */
  setALabel: string;
  /** * Etiqueta o título descriptivo para el segundo conjunto (Círculo Superior Derecho). */
  setBLabel: string;
  /** * Etiqueta o título descriptivo para el tercer conjunto (Círculo Inferior Central). */
  setCLabel: string;
  /** * Función callback que devuelve un arreglo de objetos (id, label) de las fichas. */
  getItemsInZone: (zone: ZoneId) => { id: string; label: string }[];
}

/**
 * Componente visual que renderiza un Diagrama de Venn de 3 conjuntos.
 * Utiliza un contenedor con proporción 1:1 (cuadrado) y posicionamiento absoluto.
 * Ajustado geométricamente para evitar superposición de las cajas de DropZone.
 * * @param {VennDiagram3SetProps} props - Las propiedades del componente.
 * @returns {JSX.Element} El diagrama interactivo de 3 conjuntos renderizado.
 */
export function VennDiagram3Set({
  setALabel,
  setBLabel,
  setCLabel,
  getItemsInZone,
}: VennDiagram3SetProps) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex justify-between w-full px-2 mb-4 text-xs font-bold">
        <span className="px-2 py-1 rounded-full text-cyan-400 bg-cyan-900/30">
          {setALabel} (A)
        </span>
        <span className="px-2 py-1 text-purple-400 rounded-full bg-purple-900/30">
          {setBLabel} (B)
        </span>
        <span className="px-2 py-1 text-green-400 rounded-full bg-green-900/30">
          {setCLabel} (C)
        </span>
      </div>

      <div className="relative w-full max-w-[450px] aspect-square text-center">
        {/* Círculo A — superior izquierdo */}
        <div className="absolute w-[60%] h-[60%] top-[2%] left-[8%] rounded-full border-[3px] border-cyan-400 bg-cyan-500/10 mix-blend-screen pointer-events-none" />
        {/* Círculo B — superior derecho */}
        <div className="absolute w-[60%] h-[60%] top-[2%] right-[8%] rounded-full border-[3px] border-purple-400 bg-purple-500/10 mix-blend-screen pointer-events-none" />
        {/* Círculo C — inferior central */}
        <div className="absolute w-[60%] h-[60%] bottom-[10%] left-1/2 -translate-x-1/2 rounded-full border-[3px] border-green-400 bg-green-500/10 mix-blend-screen pointer-events-none" />

        {/* Solo A — interior izquierdo, parte alta */}
        <div className="absolute top-[18%] left-[10%] w-[22%] z-10">
          <DropZone
            id="onlyA"
            label="Solo A"
            items={getItemsInZone("onlyA")}
            chipColor="cyan"
            minHeight="min-h-[50px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* Solo B — interior derecho, parte alta */}
        <div className="absolute top-[18%] right-[10%] w-[22%] z-10">
          <DropZone
            id="onlyB"
            label="Solo B"
            items={getItemsInZone("onlyB")}
            chipColor="purple"
            minHeight="min-h-[50px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* Solo C — interior inferior central */}
        <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[24%] z-10">
          <DropZone
            id="onlyC"
            label="Solo C"
            items={getItemsInZone("onlyC")}
            chipColor="green"
            minHeight="min-h-[50px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* A ∩ B — intersección superior central entre A y B */}
        <div className="absolute top-[14%] left-1/2 -translate-x-1/2 w-[24%] z-20">
          <DropZone
            id="intersectionAB"
            label="A ∩ B"
            items={getItemsInZone("intersectionAB")}
            chipColor="gold"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* A ∩ C — intersección izquierda entre A y C */}
        <div className="absolute top-[47%] left-[20%] w-[22%] z-20 -translate-y-[25%] -translate-x-[5%]">
          <DropZone
            id="intersectionAC"
            label="A ∩ C"
            items={getItemsInZone("intersectionAC")}
            chipColor="cyan"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* B ∩ C — intersección derecha entre B y C */}
        <div className="absolute top-[47%] right-[20%] w-[22%] z-20 -translate-y-[25%] translate-x-[5%]">
          <DropZone
            id="intersectionBC"
            label="B ∩ C"
            items={getItemsInZone("intersectionBC")}
            chipColor="purple"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* A ∩ B ∩ C — intersección central de los tres conjuntos */}
        <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24%] z-30">
          <DropZone
            id="intersectionABC"
            label="A∩B∩C"
            items={getItemsInZone("intersectionABC")}
            chipColor="gold"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
