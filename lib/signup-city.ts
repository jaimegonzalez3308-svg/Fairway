import type { SupabaseClient } from "@supabase/supabase-js";
import { profileSchema, type Profile } from "./domain";
import { DEFAULT_CITY } from "./cities";

export function initialSignupCity(
  profile: Pick<Profile, "city" | "availability">,
  metadata: Record<string, unknown>,
): string | null {
  // Only seed a new, untouched profile. Later edits always take precedence.
  if (profile.city !== DEFAULT_CITY || profile.availability.length) return null;
  const parsed = profileSchema.shape.city.safeParse(metadata.signup_city);
  return parsed.success && parsed.data !== DEFAULT_CITY ? parsed.data : null;
}

export async function saveInitialSignupCity(
  client: SupabaseClient,
  userId: string,
  city: string,
) {
  const value = profileSchema.shape.city.parse(city);
  const { error } = await client
    .from("profiles")
    .update({ city: value })
    .eq("id", userId)
    .eq("city", DEFAULT_CITY)
    .eq("availability", "{}");
  if (error) throw error;
}
