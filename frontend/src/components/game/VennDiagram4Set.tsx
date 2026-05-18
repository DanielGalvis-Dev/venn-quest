import { DropZone } from "./DropZone";
import type { ZoneId } from "../../types";

/**
 * Propiedades para el componente VennDiagram4Set.
 */
interface VennDiagram4SetProps {
  /** Etiqueta para el conjunto A — círculo superior izquierdo. */
  setALabel: string;
  /** Etiqueta para el conjunto B — círculo superior derecho. */
  setBLabel: string;
  /** Etiqueta para el conjunto C — círculo inferior izquierdo. */
  setCLabel: string;
  /** Etiqueta para el conjunto D — círculo inferior derecho. */
  setDLabel: string;
  /** Callback que devuelve las fichas actualmente en una zona. */
  getItemsInZone: (zone: ZoneId) => { id: string; label: string }[];
}

/**
 * Componente visual de Diagrama de Venn de 4 conjuntos.
 *
 * Geometría: 4 círculos iguales (65% del contenedor) en las esquinas,
 * con solapamiento suficiente para generar exactamente 13 zonas:
 *
 *   Exclusivas (4) : onlyA, onlyB, onlyC, onlyD
 *   Pares (4)      : A∩B (top), A∩C (left), B∩D (right), C∩D (bottom)
 *   Triples (4)    : A∩B∩C (sup-izq), A∩B∩D (sup-der),
 *                    A∩C∩D (inf-izq),  B∩C∩D (inf-der)
 *   Total (1)      : A∩B∩C∩D (centro)
 *
 * Las intersecciones A∩D y B∩C NO existen: los círculos diagonalmente
 * opuestos no se solapan.
 *
 * @param {VennDiagram4SetProps} props
 * @returns {JSX.Element}
 */
export function VennDiagram4Set({
  setALabel,
  setBLabel,
  setCLabel,
  setDLabel,
  getItemsInZone,
}: VennDiagram4SetProps) {
  return (
    <div className="flex flex-col items-center w-full">
      {/* ── Etiquetas superiores ── */}
      <div className="flex justify-between w-full px-4 mb-2 text-xs font-bold">
        <span className="px-2 py-1 rounded-full text-cyan-400 bg-cyan-900/30">
          {setALabel} (A)
        </span>
        <span className="px-2 py-1 text-purple-400 rounded-full bg-purple-900/30">
          {setBLabel} (B)
        </span>
      </div>

      <div className="relative w-full max-w-[480px] aspect-square text-center">
        {/* ── Círculos decorativos ── */}
        <div className="absolute w-[65%] h-[65%] top-[2%]    left-[2%]  rounded-full border-[3px] border-cyan-400   bg-cyan-500/8   mix-blend-screen pointer-events-none" />
        <div className="absolute w-[65%] h-[65%] top-[2%]    right-[2%] rounded-full border-[3px] border-purple-400 bg-purple-500/8 mix-blend-screen pointer-events-none" />
        <div className="absolute w-[65%] h-[65%] bottom-[2%] left-[2%]  rounded-full border-[3px] border-green-400  bg-green-500/8  mix-blend-screen pointer-events-none" />
        <div className="absolute w-[65%] h-[65%] bottom-[2%] right-[2%] rounded-full border-[3px] border-amber-400  bg-amber-500/8  mix-blend-screen pointer-events-none" />

        {/* ════════ ZONAS EXCLUSIVAS ════════ */}

        {/* onlyA — interior superior izquierdo del círculo A */}
        <div className="absolute top-[15%] left-[10%] w-[22%] z-10">
          <DropZone
            id="onlyA"
            label="Solo A"
            items={getItemsInZone("onlyA")}
            chipColor="cyan"
            minHeight="min-h-[50px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* onlyB — interior superior derecho del círculo B */}
        <div className="absolute top-[15%] right-[10%] w-[22%] z-10">
          <DropZone
            id="onlyB"
            label="Solo B"
            items={getItemsInZone("onlyB")}
            chipColor="purple"
            minHeight="min-h-[50px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* onlyC — interior inferior izquierdo del círculo C */}
        <div className="absolute bottom-[15%] left-[10%] w-[22%] z-10">
          <DropZone
            id="onlyC"
            label="Solo C"
            items={getItemsInZone("onlyC")}
            chipColor="green"
            minHeight="min-h-[50px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* onlyD — interior inferior derecho del círculo D */}
        <div className="absolute bottom-[15%] right-[10%] w-[22%] z-10">
          <DropZone
            id="onlyD"
            label="Solo D"
            items={getItemsInZone("onlyD")}
            chipColor="gold"
            minHeight="min-h-[50px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* ════════ INTERSECCIONES DE 2 CONJUNTOS ════════ */}

        {/* A∩B — solapamiento superior central (A y B se tocan arriba) */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[22%] z-20">
          <DropZone
            id="intersectionAB"
            label="A ∩ B"
            items={getItemsInZone("intersectionAB")}
            chipColor="cyan"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* A∩C — solapamiento izquierdo central (A y C se tocan a la izquierda) */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[10%] w-[22%] z-20">
          <DropZone
            id="intersectionAC"
            label="A ∩ C"
            items={getItemsInZone("intersectionAC")}
            chipColor="green"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* B∩D — solapamiento derecho central (B y D se tocan a la derecha) */}
        <div className="absolute top-1/2 -translate-y-1/2 right-[10%] w-[22%] z-20">
          <DropZone
            id="intersectionBD"
            label="B ∩ D"
            items={getItemsInZone("intersectionBD")}
            chipColor="purple"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* C∩D — solapamiento inferior central (C y D se tocan abajo) */}
        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[22%] z-20">
          <DropZone
            id="intersectionCD"
            label="C ∩ D"
            items={getItemsInZone("intersectionCD")}
            chipColor="gold"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>

        {/* ════════ INTERSECCIONES DE 3 CONJUNTOS ════════
          Cada triple está en el cuadrante entre su par adyacente y el centro.
          top:32% ≈ entre el borde superior (8%) y el centro (50%).
          left:25% ≈ entre el borde izquierdo (5%) y el centro (50%).
        ════════ */}

        {/* A∩B∩C — cuadrante superior izquierdo del centro */}
        <div className="absolute top-[33%] left-[29%] w-[20%] z-30">
          <DropZone
            id="intersectionABC"
            label="A∩B∩C"
            items={getItemsInZone("intersectionABC")}
            chipColor="cyan"
            minHeight="min-h-[36px]"
            className="!bg-transparent !border-transparent gap-[1px]"
          />
        </div>

        {/* A∩B∩D — cuadrante superior derecho del centro */}
        <div className="absolute top-[33%] right-[29%] w-[20%] z-30">
          <DropZone
            id="intersectionABD"
            label="A∩B∩D"
            items={getItemsInZone("intersectionABD")}
            chipColor="purple"
            minHeight="min-h-[36px]"
            className="!bg-transparent !border-transparent gap-[1px]"
          />
        </div>

        {/* A∩C∩D — cuadrante inferior izquierdo del centro */}
        <div className="absolute bottom-[32%] left-[29%] w-[20%] z-30">
          <DropZone
            id="intersectionACD"
            label="A∩C∩D"
            items={getItemsInZone("intersectionACD")}
            chipColor="green"
            minHeight="min-h-[36px]"
            className="!bg-transparent !border-transparent flex-col-reverse"
          />
        </div>

        {/* B∩C∩D — cuadrante inferior derecho del centro */}
        <div className="absolute bottom-[32%] right-[29%] w-[20%] z-30">
          <DropZone
            id="intersectionBCD"
            label="B∩C∩D"
            items={getItemsInZone("intersectionBCD")}
            chipColor="gold"
            minHeight="min-h-[36px]"
            className="!bg-transparent !border-transparent flex-col-reverse"
          />
        </div>

        {/* ════════ INTERSECCIÓN TOTAL ════════ */}

        {/* A∩B∩C∩D — centro absoluto del diagrama */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] z-40">
          <DropZone
            id="intersectionABCD"
            label="A∩B∩C∩D"
            items={getItemsInZone("intersectionABCD")}
            chipColor="gold"
            minHeight="min-h-[40px]"
            className="!bg-transparent !border-transparent"
          />
        </div>
      </div>

      {/* ── Etiquetas inferiores ── */}
      <div className="flex justify-between w-full px-4 mt-2 text-xs font-bold">
        <span className="px-2 py-1 text-green-400 rounded-full bg-green-900/30">
          {setCLabel} (C)
        </span>
        <span className="px-2 py-1 rounded-full text-amber-400 bg-amber-900/30">
          {setDLabel} (D)
        </span>
      </div>
    </div>
  );
}
