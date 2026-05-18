import { useState, useCallback } from "react";
import type { VennDistribution, ZoneId } from "../types";

/**
 * Representa la ubicación actual de una ficha específica dentro del juego.
 */
export type ItemLocation = {
  /** El identificador único para dnd-kit (ej. "chip-0-12"). Soluciona el bug de fichas duplicadas. */
  id: string;
  /** El valor real y visual de la ficha (ej. "12", "Perro"). */
  label: string;
  /** La zona actual donde se encuentra la ficha (ej. "bank", "onlyA"). */
  zone: ZoneId;
};

/**
 * Hook personalizado que maneja todo el estado y la lógica de ubicación de las fichas
 * en el juego de Diagramas de Venn.
 * * @param {string[]} universeItems - Arreglo inicial con todos los elementos (fichas)
 * que el usuario deberá clasificar.
 * @returns Un objeto con el estado actual y las funciones controladoras del juego.
 */
export function useVennGame(universeItems: string[]) {
  // Inicializamos el estado creando IDs únicos basados en el índice para evitar conflictos
  const [locations, setLocations] = useState<ItemLocation[]>(
    universeItems.map((label, index) => ({
      id: `chip-${index}-${label}`,
      label,
      zone: "bank",
    })),
  );

  /**
   * Mueve una ficha a una nueva zona.
   * Actualiza el estado local cambiando la propiedad `zone` del elemento especificado.
   * * @param {string} id - El identificador único de la ficha a mover.
   * @param {ZoneId} targetZone - El identificador de la zona destino.
   */
  const moveItem = useCallback((id: string, targetZone: ZoneId) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, zone: targetZone } : loc)),
    );
  }, []);

  /**
   * Obtiene todos los elementos que actualmente se encuentran en una zona específica.
   * * @param {ZoneId} zone - La zona a consultar.
   * @returns {{id: string, label: string}[]} Arreglo de objetos listos para renderizar.
   */
  const getItemsInZone = useCallback(
    (zone: ZoneId): { id: string; label: string }[] => {
      return locations
        .filter((l) => l.zone === zone)
        .map(({ id, label }) => ({ id, label }));
    },
    [locations],
  );

  /**
   * Reinicia el tablero, devolviendo todas las fichas al banco ('bank').
   */
  const resetAll = useCallback(() => {
    setLocations(
      universeItems.map((label, index) => ({
        id: `chip-${index}-${label}`,
        label,
        zone: "bank",
      })),
    );
  }, [universeItems]);

  /**
   * Construye y devuelve el objeto de distribución estructurado que el backend
   * necesita para evaluar la respuesta matemática del estudiante. Extrae solo los `labels`.
   * * @returns {VennDistribution} El mapa completo de zonas y sus valores.
   */
  const getDistribution = useCallback((): VennDistribution => {
  const getLabels = (zone: ZoneId) =>
    locations.filter((l) => l.zone === zone).map((l) => l.label);

  return {
    onlyA:             getLabels("onlyA"),
    onlyB:             getLabels("onlyB"),
    intersectionAB:    getLabels("intersectionAB"),
    onlyC:             getLabels("onlyC"),
    intersectionAC:    getLabels("intersectionAC"),
    intersectionBC:    getLabels("intersectionBC"),
    intersectionABC:   getLabels("intersectionABC"),
    onlyD:             getLabels("onlyD"),
    intersectionBD:    getLabels("intersectionBD"),    // NUEVO
    intersectionCD:    getLabels("intersectionCD"),    // NUEVO
    intersectionABD:   getLabels("intersectionABD"),   // NUEVO
    intersectionACD:   getLabels("intersectionACD"),   // NUEVO
    intersectionBCD:   getLabels("intersectionBCD"),   // NUEVO
    intersectionABCD:  getLabels("intersectionABCD"),
    none:              getLabels("none"),
  };
}, [locations]);

  /** * Bandera booleana rápida que indica si todas las fichas han sido ubicadas
   * en alguna zona del diagrama (es decir, el banco está vacío).
   * Se usa para habilitar/deshabilitar el botón de "Evaluar".
   */
  const allPlaced = locations.every((l) => l.zone !== "bank");

  return {
    locations,
    moveItem,
    getItemsInZone,
    resetAll,
    getDistribution,
    allPlaced,
  };
}
