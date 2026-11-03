import { days, type Profile } from "./domain";
import { parseCity } from "./cities";

export type FirstRoundPreferences = Pick<
  Profile,
  "availability" | "holes" | "style" | "city" | "club_id"
>;

export function firstRoundPreferences(
  value: FirstRoundPreferences,
): FirstRoundPreferences {
  const availability = days.filter((day) => value.availability.includes(day));
  if (!availability.length)
    throw new Error("Elige al menos un día para jugar.");
  const city = parseCity(value.city);
  if (!city) throw new Error("Escribe una ciudad de entre 2 y 80 caracteres.");
  if (
    ![9, 18].includes(value.holes) ||
    !["social", "intermedio", "competitivo"].includes(value.style)
  )
    throw new Error("Revisa la modalidad y el estilo de juego.");
  return {
    availability,
    holes: value.holes,
    style: value.style,
    city,
    club_id: value.club_id || null,
  };
}
