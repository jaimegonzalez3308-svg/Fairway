import type { Hole } from "./domain";

/** Empty optional statistics stay empty; an unfinished hole can be a draft. */
export function holeEntryIssue(hole: Hole, requireStrokes = false) {
  if (requireStrokes && hole.strokes === null)
    return "Anota los golpes de este hoyo o déjalo pendiente.";
  const fields = [
    [
      hole.strokes,
      1,
      30,
      "Los golpes deben ser un número entero entre 1 y 30.",
    ],
    [hole.par, 3, 6, "El par debe estar entre 3 y 6."],
    [hole.putts, 0, 30, "Los putts deben ser un número entero entre 0 y 30."],
    [hole.distance, 1, 900, "La distancia debe estar entre 1 y 900 metros."],
    [hole.index, 1, 18, "El índice debe estar entre 1 y 18."],
  ] as const;
  return (
    fields.find(
      ([value, min, max]) =>
        value != null &&
        (!Number.isInteger(value) || value < min || value > max),
    )?.[3] ?? null
  );
}
