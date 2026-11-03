import type { Profile } from "./domain";
import { matchesCity } from "./cities";

/** Golfers to suggest following on the website's community rail.
 * Same club first, then same city. Skips the viewer, private profiles and
 * people already followed, except those followed in this visit (`keep`), so
 * the button the viewer just pressed stays in place as "Solicitado". */
export function suggestFollows(
  me: Profile,
  profiles: Profile[],
  following: string[],
  keep: string[] = [],
  limit = 4,
): Profile[] {
  return profiles
    .filter(
      (p) =>
        p.id !== me.id &&
        p.visibility !== "private" &&
        (!following.includes(p.id) || keep.includes(p.id)),
    )
    .map((p, index) => ({
      p,
      index,
      score:
        (me.club_id && p.club_id === me.club_id ? 2 : 0) +
        (matchesCity(p.city, "mine", me.city) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ p }) => p);
}
