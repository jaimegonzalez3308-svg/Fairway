import type { Game } from "./domain";

export const GOLF_TIMEZONE = "America/Mexico_City";
export type PartyPeriod = "all" | "today" | "week" | "next-week" | "date";
export function golfDate(date: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GOLF_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function golfDateAfter(days: number, now = new Date()) {
  // León usa UTC−6, sin cambio estacional. Operar sobre la fecha evita depender del equipo.
  const date = new Date(`${golfDate(now)}T12:00:00-06:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return golfDate(date);
}
export function gameSeats(game: Game) {
  const confirmed =
    game.participants?.filter((p) => p.status === "confirmed").length ?? 1;
  return { confirmed, remaining: Math.max(0, game.capacity - confirmed) };
}
export function gameIsUpcoming(game: Game, now = new Date()) {
  return (
    ["open", "full"].includes(game.status) && new Date(game.starts_at) > now
  );
}
export function matchesPartyPeriod(
  game: Game,
  period: PartyPeriod,
  selectedDate = "",
  now = new Date(),
) {
  const day = golfDate(game.starts_at);
  const today = golfDate(now);
  if (period === "all") return true;
  if (period === "date") return day === selectedDate;
  if (period === "today") return day === today;
  if (period === "week") return day >= today && day < golfDateAfter(7, now);
  return day >= golfDateAfter(7, now) && day < golfDateAfter(14, now);
}
export function partyDateLabel(startsAt: string, now = new Date()) {
  const day = golfDate(startsAt);
  if (day === golfDate(now)) return "Hoy";
  if (day === golfDateAfter(1, now)) return "Mañana";
  const days = Math.round(
    (Date.parse(`${day}T12:00:00-06:00`) -
      Date.parse(`${golfDate(now)}T12:00:00-06:00`)) /
      86400000,
  );
  if (days > 1 && days <= 14) return `En ${days} días`;
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    timeZone: GOLF_TIMEZONE,
  }).format(new Date(startsAt));
}
