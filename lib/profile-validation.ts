import { z } from "zod";
import { normalizeCity } from "./cities";
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z
    .string()
    .trim()
    .min(2, "Escribe tu ciudad.")
    .max(80, "Usa hasta 80 caracteres para la ciudad.")
    .transform(normalizeCity),
  age: z.coerce.number().min(18).max(100),
  // z.coerce.number() convierte "" en 0; el campo vacío significa "sin handicap".
  handicap: z.preprocess(
    (v) => (v === null || (typeof v === "string" && !v.trim()) ? null : v),
    z.coerce.number().min(-10).max(54).nullable(),
  ),
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
