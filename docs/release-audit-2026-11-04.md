# Claude change audit — 2026-11-04

Codex reviewed the recent Claude changes through shared GitHub HEAD `cfb82613336ac535dcfe695124ff84431386d343`, comparing them with the official Sites version 69 source (`3b92e419ad7ad2eaf0d88092d49dce72dd59de7e`). The shared checkout was clean when the audit began, and GitHub already contained that HEAD. The official website did not yet contain the newer changes.

## Findings

1. **Fixed: unknown notification categories could navigate to an invalid page.** `lib/notification-routes.ts` looked up arbitrary categories on an ordinary object, so inherited names such as `constructor`, `toString`, and `__proto__` returned truthy values. It now checks own properties. The regression failed before the fix and passes afterwards.
2. **Open: the older friendship request limit can be bypassed by cancelling requests.** `supabase/migrations/202610150006_friends.sql:49` counts current friendship rows, while cancellation/rejection/removal deletes them at line 75. A local PGlite reproduction sent and cancelled 21 requests and produced 21 notifications despite the 20/hour limit. No real requests or notifications were sent. A database patch should record request attempts independently of friendship deletion and serialize requests per sender; the existing per-pair lock cannot enforce a sender-wide limit under concurrency. No production database changes were made in this audit.

The friendship SQL shown in the IDE is the original one-time migration. Its table already exists in production; rerunning that `CREATE TABLE` script is not an update or a fix for the rate limit.

## Review coverage

Reviewed Discover simplification, photo stacks and photo tinting; floating native navigation and reachable actions; profile stats, friends sheet, golfer rounds, streaks and profile layout; club/party cards; folded Community replies and native story tiles; notification routes, persistence and focus handling; and the later website adaptations. Native presentation remains gated by Capacitor's native class, except for explicitly shared behavior and the separately added website adaptations.

Checked the new golfer-rounds query against published-only filtering and existing RLS, friendship consent/privacy behavior, story thumbnail expiry/renewal, signed image handling, reduced-motion/transparency support, loading/error/empty states, and the actual source changes rather than relying on Claude's summaries. No additional release-blocking defect was identified in the reviewed UI changes.

## Verification

- All 300 automated tests passed after the notification fix.
- TypeScript, production static build, export checks, Capacitor sync, and Xcode iPhone Simulator Debug build passed.
- Installed and launched the updated app in the booted iPhone 18 Pro Simulator. Asset comparison is recorded with the release evidence.
- Read-only public REST schema probes confirm `friendships`, `rounds`, notification `read`, and membership `last_delivered_at` are recognized and anonymous access is denied. This does not prove every authenticated RPC or delivery/read flow.
- No SQL migration changed in this UI release. Prior delivery-column activation is documented in `agent-context.md`; two-account delivery/read testing remains pending.

Browser automation was unavailable. Simulator screenshots worked, but navigation taps failed with `noWindowsAvailable`; signed-in interactions therefore were not fully exercised. No physical iPhone was connected, and no App Store or TestFlight release was performed. Automated and source checks do not replace those remaining checks.

Published the reviewed source and matching static export to https://fairway-leon-golf.jjrtecl.chatgpt.site as **version 70**, deployment `appgdep_6aebc4be6efc8191b2641425b7e02985`, isolated Sites-source commit `92922d1fd721af318bd2a770d04a1c02057395a2`. Production returned HTTP 200; all 71 JavaScript/CSS assets matched the final export hashes. All 130 exported files also matched both synced iOS assets and the installed Simulator app. Exact saved-version, production-hash and installed-asset records are retained under `.agent-runs/release-audit-2026-11-04/`. No shared Git commit or push was made during this audit; the reviewed source and notification fix were pushed to the separate Sites repository by the publishing helper. These final verification notes were added to the shared documentation after publication.
