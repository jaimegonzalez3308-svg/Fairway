const attempted = new Set<string>();

// This marker contains no coordinates or city. It prevents repeated prompts.
export function claimAutomaticLocation(
  accountId: string,
  storage?: Pick<Storage, "getItem" | "setItem">,
) {
  const key = `fairway:profile-location:v1:${accountId}`;
  if (attempted.has(key)) return false;
  attempted.add(key);
  try {
    if (storage?.getItem(key)) return false;
    storage?.setItem(key, "attempted");
  } catch {
    // Private browsing can block storage; still prompt only once in this page.
  }
  return true;
}
