import { z } from "zod";
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().min(2),
  age: z.coerce.number().min(18).max(100),
  handicap: z
    .union([z.coerce.number().min(-10).max(54), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  club_id: z.string(),
  bio: z.string().max(500),
  availability: z.array(z.string()).min(1),
  holes: z.coerce.number().refine((n) => n === 9 || n === 18),
  style: z.enum(["social", "intermedio", "competitivo"]),
  hand: z.enum(["derecha", "izquierda"]),
  years: z.coerce.number().min(0).max(90),
  frequency: z.string(),
  transport: z.string(),
  accepts_guests: z.boolean(),
  beginner_friendly: z.boolean(),
  formats: z.array(z.string()),
  additional_clubs: z.array(z.string()),
  gender: z.string(),
  occupation: z.string(),
  visibility: z.enum(["public", "members", "private"]),
});
export type Profile = {
  id: string;
  name: string;
  city: string;
  age: number;
  handicap: number | null;
  club_id: string | null;
  bio: string;
  availability: string[];
  holes: number;
  style: string;
  photo: string;
  verified: boolean;
  accepts_guests: boolean;
  beginner_friendly: boolean;
  rating?: number;
  review_count?: number;
  hand?: string;
  years?: number;
  frequency?: string;
  transport?: string;
  formats?: string[];
  additional_clubs?: string[];
  gender?: string;
  occupation?: string;
  visibility?: string;
  gallery?: string[];
};
export type Club = {
  id: string;
  name: string;
  city: string;
  verified: boolean;
  description: string | null;
  access_info: string | null;
};
export type Game = {
  id: string;
  host_id: string;
  club_id: string;
  starts_at: string;
  holes: number;
  capacity: number;
  format: string;
  kind: string;
  privacy: string;
  description: string;
  access_conditions: string;
  status: string;
  participants?: { user_id: string; status: string }[];
};
export type Round = {
  id: string;
  user_id: string;
  club_id: string | null;
  played_at: string;
  holes: number;
  tee: string;
  course: string;
  status: string;
  privacy: string;
  verified: boolean;
  notes: string;
  scores: Hole[];
  tee_id?: string | null;
};
export type Hole = {
  hole: number;
  par: number | null;
  strokes: number | null;
  putts?: number | null;
  fairway?: boolean | null;
  gir?: boolean | null;
  distance?: number | null;
  index?: number | null;
};
export type Filters = {
  club: string;
  minHcp: number;
  maxHcp: number;
  noHcp: boolean;
  minAge: number;
  maxAge: number;
  day: string;
  holes: string;
  style: string;
  verified: boolean;
  guests: boolean;
  beginner: boolean;
  goodRating: boolean;
};
export const initialFilters: Filters = {
  club: "any",
  minHcp: -10,
  maxHcp: 54,
  noHcp: true,
  minAge: 18,
  maxAge: 100,
  day: "any",
  holes: "any",
  style: "any",
  verified: false,
  guests: false,
  beginner: false,
  goodRating: false,
};
export function compatibility(a: Profile, b: Profile) {
  let score = 0;
  const reasons: string[] = [];
  if (a.club_id && a.club_id === b.club_id) {
    score += 30;
    reasons.push("Juegan en el mismo club");
  }
  if (a.availability.some((d) => b.availability.includes(d))) {
    score += 30;
    reasons.push("Tienen horarios similares");
  }
  if (a.holes === b.holes) {
    score += 20;
    reasons.push(`Prefieren ${a.holes} hoyos`);
  }
  if (
    a.handicap !== null &&
    b.handicap !== null &&
    Math.abs(a.handicap - b.handicap) <= 8
  ) {
    score += 10;
    reasons.push("Handicaps cercanos");
  }
  if (a.style === b.style) {
    score += 10;
    reasons.push("Comparten estilo de juego");
  }
  return { score, reasons };
}
export function matchesFilters(p: Profile, f: Filters, me: Profile) {
  return (
    (f.club === "any" ||
      (f.club === "mine"
        ? p.club_id === me.club_id
        : f.club === "none"
          ? !p.club_id
          : p.club_id === f.club)) &&
    (p.handicap === null
      ? f.noHcp
      : p.handicap >= f.minHcp && p.handicap <= f.maxHcp) &&
    p.age >= f.minAge &&
    p.age <= f.maxAge &&
    (f.day === "any" || p.availability.includes(f.day)) &&
    (f.holes === "any" || p.holes === Number(f.holes)) &&
    (f.style === "any" || p.style === f.style) &&
    (!f.verified || p.verified) &&
    (!f.guests || p.accepts_guests) &&
    (!f.beginner || p.beginner_friendly) &&
    (!f.goodRating || (p.review_count! > 0 && p.rating! >= 4))
  );
}
export function summarize(scores: Hole[]) {
  const entered = scores.filter((h) => h.strokes !== null);
  const complete = entered.length === scores.length;
  const parKnown = entered.every((h) => h.par !== null);
  return {
    total: entered.reduce((s, h) => s + h.strokes!, 0),
    par: parKnown ? entered.reduce((s, h) => s + h.par!, 0) : null,
    relative: parKnown
      ? entered.reduce((s, h) => s + h.strokes! - h.par!, 0)
      : null,
    out: scores.slice(0, 9).reduce((s, h) => s + (h.strokes ?? 0), 0),
    in: scores.slice(9).reduce((s, h) => s + (h.strokes ?? 0), 0),
    complete,
    birdies: entered.filter((h) => h.par !== null && h.strokes! === h.par! - 1)
      .length,
    pars: entered.filter((h) => h.par !== null && h.strokes === h.par).length,
    bogeys: entered.filter((h) => h.par !== null && h.strokes === h.par! + 1)
      .length,
    doubles: entered.filter((h) => h.par !== null && h.strokes! >= h.par! + 2)
      .length,
  };
}
export function holeColor(h: Hole) {
  if (h.par === null || h.strokes === null) return "neutral";
  const d = h.strokes - h.par;
  return d <= -2
    ? "eagle"
    : d === -1
      ? "birdie"
      : d === 0
        ? "neutral"
        : d === 1
          ? "bogey"
          : "double";
}
export const days = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
