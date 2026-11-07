import type { Game, Profile } from "./domain";
import { golfDate, GOLF_TIMEZONE } from "./parties";

/** Fields copied when a group repeats a party. The date is the next same
 * weekday that is still in the future; every other setting stays as it was. */
export type GameTemplate = {
  club_id: string;
  date: string;
  time: string;
  holes: number;
  capacity: number;
  format: string;
  kind: string;
  privacy: string;
  join_mode: "open" | "request";
  description: string;
  access_conditions: string;
};

const WEEK = 7 * 86400000;

/** León time of day as "HH:MM", whatever the device's time zone. */
export function golfTime(date: Date | string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: GOLF_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("hour")}:${part("minute")}`;
}

/** The first weekly repeat of `startsAt` strictly after `now`. León has a
 * fixed UTC−6 offset, so adding whole weeks keeps the same local time. */
export function nextWeeklyStart(startsAt: string, now = new Date()) {
  const start = new Date(startsAt).getTime();
  const weeks = Math.max(1, Math.floor((now.getTime() - start) / WEEK) + 1);
  return new Date(start + weeks * WEEK);
}

export function gameTemplate(game: Game, now = new Date()): GameTemplate {
  const next = nextWeeklyStart(game.starts_at, now);
  return {
    club_id: game.club_id,
    date: golfDate(next),
    time: golfTime(next),
    holes: game.holes,
    capacity: game.capacity,
    format: game.format,
    kind: game.kind,
    privacy: game.privacy,
    join_mode: game.join_mode === "open" ? "open" : "request",
    description: game.description,
    access_conditions: game.access_conditions,
  };
}

/** The organizer or a confirmed player can set up next week's round. */
export function canRepeatGame(game: Game, userId?: string) {
  if (!userId) return false;
  return (
    game.host_id === userId ||
    !!game.participants?.some(
      (p) => p.user_id === userId && p.status === "confirmed",
    )
  );
}

/** Who played last time (organizer included), minus me, limited to profiles
 * this account can already see. Order follows the original group. */
export function repeatInvitees(
  game: Game,
  userId: string | undefined,
  visible: Profile[],
) {
  const ids = [
    game.host_id,
    ...(game.participants ?? [])
      .filter((p) => p.status === "confirmed")
      .map((p) => p.user_id),
  ];
  const seen = new Set<string>();
  const result: Profile[] = [];
  for (const id of ids) {
    if (id === userId || seen.has(id)) continue;
    seen.add(id);
    const profile = visible.find((p) => p.id === id);
    if (profile) result.push(profile);
  }
  return result;
}

/** Invite choices with friends first, without duplicates, the organizer, or
 * anyone already requested, confirmed or rejected in this game. */
export function inviteCandidates(
  game: Game,
  userId: string | undefined,
  friends: Profile[],
  profiles: Profile[],
) {
  const taken = new Set<string>([
    game.host_id,
    ...(userId ? [userId] : []),
    ...(game.participants ?? []).map((p) => p.user_id),
  ]);
  const pick = (list: Profile[]) =>
    list.filter((p) => {
      if (taken.has(p.id)) return false;
      taken.add(p.id);
      return true;
    });
  const friendList = pick(friends);
  return { friends: friendList, others: pick(profiles) };
}

type InviteRpc = (
  name: "invite_to_game",
  args: { g: string; invitee: string },
) => PromiseLike<{ error: unknown }>;

/** Sends one invitation per player, in order, without retrying: the RPC
 * notifies on every call, so a failed or uncertain call is reported by name
 * instead of being repeated. */
export async function inviteGroup(
  rpc: InviteRpc,
  gameId: string,
  invitees: Profile[],
) {
  const failed: Profile[] = [];
  for (const person of invitees) {
    try {
      const { error } = await rpc("invite_to_game", {
        g: gameId,
        invitee: person.id,
      });
      if (error) failed.push(person);
    } catch {
      failed.push(person);
    }
  }
  return { sent: invitees.length - failed.length, failed };
}

export function inviteGroupMessage(result: { sent: number; failed: Profile[] }) {
  if (!result.failed.length)
    return `Partida publicada. Invitamos a ${result.sent === 1 ? "1 jugador" : `${result.sent} jugadores`} de la última vez; cada quien confirma su lugar.`;
  const names = result.failed.map((p) => p.name).join(", ");
  return `Partida publicada, pero no pudimos invitar a ${names}. Invítalos desde la partida.`;
}

export type InvitationState = "confirmed" | "requested" | "rejected" | "none";

/** Labels for the organizer's view. "none" is not "declined": leaving a party
 * deletes the participation row, and invitees cannot decline yet. */
export const invitationLabels: Record<InvitationState, string> = {
  confirmed: "Confirmado",
  requested: "Pidió lugar",
  rejected: "Solicitud no aceptada",
  none: "Sin solicitud activa",
};

const stateOrder: InvitationState[] = [
  "confirmed",
  "requested",
  "none",
  "rejected",
];

/** Joins the invitations this organizer sent with the game's participants.
 * Confirmed first, then requests, then no active request, then rejected;
 * within each group the original invitation order is kept. */
export function invitationStatuses(
  invitations: { invitee_id: string }[],
  participants: { user_id: string; status: string }[] = [],
  profiles: Pick<Profile, "id" | "name">[] = [],
) {
  const seen = new Set<string>();
  const rows = invitations
    .filter((i) => !seen.has(i.invitee_id) && !!seen.add(i.invitee_id))
    .map((i) => {
      const status = participants.find((p) => p.user_id === i.invitee_id)
        ?.status;
      const state: InvitationState =
        status === "confirmed" || status === "requested" || status === "rejected"
          ? status
          : "none";
      return {
        id: i.invitee_id,
        name: profiles.find((p) => p.id === i.invitee_id)?.name || "Golfista",
        state,
        label: invitationLabels[state],
      };
    });
  return rows.sort(
    (a, b) => stateOrder.indexOf(a.state) - stateOrder.indexOf(b.state),
  );
}

export function invitationSummary(rows: { state: InvitationState }[]) {
  const yes = rows.filter((r) => r.state === "confirmed").length;
  return `${yes} de ${rows.length} ${rows.length === 1 ? "invitado confirmó" : "invitados confirmaron"}.`;
}
