import type { Game, Profile } from "./domain";

export type RatingSummary = {
  user_id: string;
  rating: number;
  review_count: number;
};
export type SubmittedReview = {
  game_id: string;
  target_id: string;
  punctuality: number;
  respect: number;
  pace: number;
  company: number;
};

export function reviewForPlayer(
  reviews: SubmittedReview[],
  gameId: string,
  targetId: string,
) {
  return reviews.find(
    (review) => review.game_id === gameId && review.target_id === targetId,
  );
}

export function canRatePlayer(
  game: Game,
  reviewerId: string | undefined,
  targetId: string,
  reviews: SubmittedReview[],
) {
  return (
    !!reviewerId &&
    targetId !== reviewerId &&
    game.status === "finished" &&
    [reviewerId, targetId].every((id) =>
      game.participants?.some(
        (p) => p.user_id === id && p.status === "confirmed",
      ),
    ) &&
    !reviewForPlayer(reviews, game.id, targetId)
  );
}

export function reviewValue(
  review: Omit<SubmittedReview, "game_id" | "target_id">,
) {
  return (
    (review.punctuality + review.respect + review.pace + review.company) / 4
  );
}

export function ratingColumns(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 5)
    throw new Error("Selecciona de 1 a 5 estrellas.");
  // Keep the existing database/RLS and historical four-category reviews compatible.
  // Equal values make the existing server average equal to this overall score.
  return { punctuality: value, respect: value, pace: value, company: value };
}

export function withRating(
  profile: Profile,
  ratings: RatingSummary[],
): Profile {
  const summary = ratings.find((row) => row.user_id === profile.id);
  return {
    ...profile,
    rating: summary ? Number(summary.rating) : undefined,
    review_count: summary ? Number(summary.review_count) : 0,
  };
}

export function ratingLabel(profile: Pick<Profile, "rating" | "review_count">) {
  const count = Number(profile.review_count || 0);
  const rating = Number(profile.rating);
  if (!count || !Number.isFinite(rating) || rating < 1 || rating > 5)
    return "Sin calificaciones todavía";
  return `${rating.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 · ${count} ${count === 1 ? "calificación" : "calificaciones"}`;
}
