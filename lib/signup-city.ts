import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./domain";
import { DEFAULT_CITY, parseCity } from "./cities";

export function initialSignupCity(
  profile: Pick<Profile, "city" | "availability">,
  metadata: Record<string, unknown>,
): string | null {
  // Only seed a new, untouched profile. Later edits always take precedence.
  if (profile.city !== DEFAULT_CITY || profile.availability.length) return null;
  const city = parseCity(metadata.signup_city);
  return city && city !== DEFAULT_CITY ? city : null;
}

export async function saveInitialSignupCity(
  client: SupabaseClient,
  userId: string,
  city: string,
) {
  const value = parseCity(city);
  if (!value) throw new Error("Escribe una ciudad de entre 2 y 80 caracteres.");
  const { error } = await client
    .from("profiles")
    .update({ city: value })
    .eq("id", userId)
    .eq("city", DEFAULT_CITY)
    .eq("availability", "{}");
  if (error) throw error;
}
