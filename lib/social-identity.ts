export function hasAppleIdentity(
  user?: {
    app_metadata?: { provider?: string; providers?: string[] };
    identities?: { provider: string }[];
  } | null,
) {
  return (
    user?.app_metadata?.provider === "apple" ||
    user?.app_metadata?.providers?.includes("apple") === true ||
    user?.identities?.some((identity) => identity.provider === "apple") === true
  );
}
