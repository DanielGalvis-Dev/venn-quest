/**
 * GameScreen.tsx
 * Componente principal que maneja la lógica del juego, el Drag & Drop
 * y la comunicación con el backend para evaluar las respuestas.
 */
import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

// Hooks y Utilidades
import { useVennGame } from "../../hooks/useVennGame";
import { evaluateAnswer } from "../../utils/api";
import type { Problem, UserState, ZoneId, EvaluateResponse } from "../../types";

// Componentes UI del Juego
import { DraggableChip } from "./DraggableChip";
import { DropZone } from "./DropZone";
import { VennDiagram2Set } from "./VennDiagram2Set";
import { VennDiagram3Set } from "./VennDiagram3Set";
import { VennDiagram4Set } from "./VennDiagram4Set";
import { FeedbackModal } from "./FeedbackModal";

interface GameScreenProps {
  /** El problema matemático actual que el usuario debe resolver */
  problem: Problem;
  /** Estado actual del usuario (nivel, experiencia) */
  user: UserState;
  /** Callback para actualizar el estado global del usuario tras una evaluación */
  onUserUpdate: (user: UserState) => void;
  /** Callback para solicitar el siguiente problema al backend */
  onNextProblem: () => void;
}

export function GameScreen({
  problem,
  user,
  onUserUpdate,
  onNextProblem,
}: GameScreenProps) {
  // Hook personalizado que maneja el estado local de las posiciones de las fichas
  const {
    locations,
    moveItem,
    getItemsInZone,
    resetAll,
    getDistribution,
    allPlaced,
  } = useVennGame(problem.universe);

  // Estado para la ficha que se está arrastrando actualmente
  const [activeId, setActiveId] = useState<string | null>(null);

  // Estados para el Modal de Feedback y peticiones a la API
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [evalResponse, setEvalResponse] = useState<EvaluateResponse | null>(
    null,
  );
  const [evalError, setEvalError] = useState<string | null>(null);

  // Configuración de los sensores para dnd-kit (soporte para mouse y pantallas táctiles)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  /**
   * Captura el evento cuando el usuario empieza a arrastrar una ficha.
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  /**
   * Captura el evento cuando el usuario suelta la ficha.
   * Valida que la zona destino exista y mueve la ficha en el estado local.
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const item = active.id as string;
      const targetZone = over.id as ZoneId;

      const validZones: ZoneId[] = [
        // Nivel 1+
        "onlyA",
        "onlyB",
        "intersectionAB",
        // Nivel 2+
        "onlyC",
        "intersectionAC",
        "intersectionBC",
        "intersectionABC",
        // Nivel 3
        "onlyD",
        "intersectionBD",
        "intersectionCD",
        "intersectionABD", 
        "intersectionACD", 
        "intersectionBCD", 
        "intersectionABCD",
        // Especiales
        "none",
        "bank",
      ];

      if (validZones.includes(targetZone)) {
        moveItem(item, targetZone);
      }
    },
    [moveItem],
  );

  /**
   * Envía la distribución actual de fichas al backend para ser evaluada.
   */
  const handleEvaluate = async () => {
    setIsModalOpen(true);
    setIsLoading(true);
    setEvalError(null);
    setEvalResponse(null);

    try {
      const distribution = getDistribution();
      const result = await evaluateAnswer(user.id, problem.id, distribution);
      setEvalResponse(result);

      if (result.user) {
        onUserUpdate({
          ...user,
          current_level: result.user.current_level,
          experience_points: result.user.experience_points,
        });
      }
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cierra el modal de feedback reseteando sus estados.
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEvalResponse(null);
    setEvalError(null);
  };

  // Cálculos para la barra de progreso de colocación de fichas
  const bankItems = getItemsInZone("bank");
  const placedCount = problem.universe.length - bankItems.length;

  // Para saber el color que debe tener la ficha "fantasma" mientras se arrastra
  const currentLocation = activeId
    ? locations.find((l) => l.id === activeId)?.zone
    : null;

  // Obtenemos la ficha activa para renderizar el DragOverlay
  const activeItem = activeId ? locations.find((l) => l.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-6xl px-4 py-6 mx-auto space-y-6">
        {/* ── Tarjeta del Problema (Enunciado) — ocupa todo el ancho ── */}
        <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-white/3">
            <div className="flex items-center gap-2">
              <span
                className={`
                  text-xs font-bold px-2.5 py-1 rounded-full
                  ${problem.level === 1 ? "bg-cyan-500/20 text-cyan-300" : ""}
                  ${problem.level === 2 ? "bg-purple-500/20 text-purple-300" : ""}
                  ${problem.level === 3 ? "bg-amber-500/20 text-amber-300" : ""}
                `}
              >
                Nivel {problem.level}
              </span>
              <span className="text-sm text-white/30">•</span>
              <span className="text-xs font-bold text-amber-400">
                +{problem.xpReward} XP
              </span>
            </div>
            <span className="text-xs text-white/30">#{problem.id}</span>
          </div>

          <div className="px-5 py-4">
            <h2 className="mb-2 text-xl text-white font-display">
              {problem.title}
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-white/65">
              {problem.statement}
            </p>
          </div>
        </div>

        {/* ── Layout principal: 3 columnas en desktop, apilado en mobile ──
            Columna 1 (estrecha) : Fichas disponibles
            Columna 2 (ancha)    : Diagrama de Venn
            Columna 3 (estrecha) : Fuera de los conjuntos
        ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2.5fr_1fr] lg:items-start">
          {/* ── Columna 1: Banco de Fichas ── */}
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-4 shadow-lg flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-white/60">
                🎯 FICHAS DISPONIBLES
              </h3>
              <span className="text-xs text-white/30">
                {placedCount}/{problem.universe.length}
              </span>
            </div>

            <DropZone
              id="bank"
              items={bankItems}
              showLabel={false}
              chipColor="purple"
              minHeight="min-h-[60px]"
              className="flex-1 border-white/10 bg-white/3"
            />

            {allPlaced && (
              <p className="mt-2 text-xs text-center text-green-400/70 animate-pulse">
                ✅ Todas colocadas
              </p>
            )}
          </div>

          {/* ── Columna 2: Diagrama de Venn ── */}
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-5 shadow-xl">
            <h3 className="mb-4 text-xs font-bold tracking-wider uppercase text-white/60">
              📊 Diagrama de Venn
            </h3>

            {problem.level === 3 ? (
              <VennDiagram4Set
                setALabel={problem.setALabel}
                setBLabel={problem.setBLabel}
                setCLabel={problem.setCLabel ?? "Conjunto C"}
                setDLabel={problem.setDLabel ?? "Conjunto D"}
                getItemsInZone={getItemsInZone}
              />
            ) : problem.isThreeSet && problem.setCLabel ? (
              <VennDiagram3Set
                setALabel={problem.setALabel}
                setBLabel={problem.setBLabel}
                setCLabel={problem.setCLabel}
                getItemsInZone={getItemsInZone}
              />
            ) : (
              <VennDiagram2Set
                setALabel={problem.setALabel}
                setBLabel={problem.setBLabel}
                getItemsInZone={getItemsInZone}
              />
            )}
          </div>

          {/* ── Columna 3: Fuera de los Conjuntos ── */}
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-4 shadow-lg flex flex-col h-full">
            <h3 className="mb-3 text-xs font-bold tracking-wider uppercase text-white/60">
              🚫 FUERA DE LOS CONJUNTOS
            </h3>
            <DropZone
              id="none"
              label={
                getItemsInZone("none").length === 0
                  ? "FUERA DE LOS CONJUNTOS"
                  : ""
              }
              items={getItemsInZone("none")}
              chipColor="red"
              minHeight="min-h-[60px]"
              className="flex-1 border-white/10 bg-white/5"
            />
          </div>
        </div>

        {/* ── Barra de Acciones (Reset / Evaluar) ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={resetAll}
            className="px-4 py-3 text-sm font-bold transition-all border rounded-xl border-white/15 text-white/50 hover:text-white hover:border-white/30"
          >
            🔄 Resetear
          </button>

          <button
            onClick={handleEvaluate}
            className={`
              flex-1 py-3.5 rounded-xl font-display text-lg transition-all duration-300
              ${
                allPlaced
                  ? "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 hover:scale-[1.02]"
                  : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
              }
            `}
            disabled={!allPlaced}
            title={!allPlaced ? "Coloca todas las fichas primero" : ""}
          >
            {allPlaced
              ? "✨ Completar y Evaluar"
              : `Coloca ${bankItems.length} fichas más`}
          </button>
        </div>
      </div>

      {/* Capa de arrastre */}
      <DragOverlay>
        {activeItem ? (
          <DraggableChip
            id={activeItem.id}
            label={activeItem.label}
            color={currentLocation === "bank" ? "purple" : "gold"}
            size="md"
            isOverlay={true}
          />
        ) : null}
      </DragOverlay>

      {/* Modal de Retroalimentación de la IA */}
      {isModalOpen && (
        <FeedbackModal
          isLoading={isLoading}
          response={evalResponse}
          error={evalError}
          onNextProblem={() => {
            handleCloseModal();
            onNextProblem();
          }}
          onRetry={handleEvaluate}
          onClose={handleCloseModal}
        />
      )}
    </DndContext>
  );
}
