import type { Game, Profile } from "@/lib/domain";

/** Confirmed players of a game (each once), resolved to known profiles. */
export function partyPlayers(game: Game, people: Profile[]) {
  return (game.participants || [])
    .filter(
      (p, i, all) =>
        p.status === "confirmed" &&
        all.findIndex((other) => other.user_id === p.user_id) === i,
    )
    .map((p) => people.find((profile) => profile.id === p.user_id))
    .filter((profile): profile is Profile => !!profile);
}

/** Who is playing, as overlapping faces with a +N count. Decorative: the
 * seat count next to it is what screen readers hear. */
export function PartyFaces({
  players,
  className = "",
}: {
  players: Profile[];
  className?: string;
}) {
  return (
    <div className={`party-avatar-stack ${className}`.trim()} aria-hidden="true">
      {players.slice(0, 3).map((player) => (
        <span className="party-small-avatar" key={player.id}>
          {player.photo ? <img src={player.photo} alt="" /> : player.name.charAt(0)}
        </span>
      ))}
      {players.length > 3 && (
        <span className="party-avatar-more">+{players.length - 3}</span>
      )}
    </div>
  );
}
