# Weekly group release — 2026-11-07

Published Claude's weekly group tools and small Codex follow-ups to the existing public Fairway Site. The shared checkout started clean at `fe51d65`; no existing work was discarded.

## Scope and review

- Repeat a party using the next future occurrence of its weekday and León time, prefill the existing form, and explicitly choose whether to invite the previous confirmed group.
- Show the organizer the invitations they sent, joined with participant status. Leaving a party is not labelled as declining an invitation.
- Prioritize friends when inviting and show how many places remain.
- Reviewed the actual form, repeat/date helpers, invitation list, routing and SQL permissions. These changes use existing tables/RPCs; no database migration or production database write was performed.

Codex added a synchronous submission lock to prevent multiple game inserts before React updates the button state, and kept a successfully published form locked while it hands off to the next screen. Manual invitation submission also locks while the request runs: the existing RPC sends a notification on every call, even when its invitation row already exists. These guards prevent simultaneous submissions in the open form; they are not a durable backend idempotency mechanism across tabs or reopened forms.

The publish button now distinguishes publishing from sending invitations. The invitation list shows loading and offers a read-only retry after a failed request. Repeat help text accurately describes old parties whose next future occurrence is more than seven days after the original. Existing styles, layout and product structure are retained.

## Verification

- TypeScript passed after the production build completed. An initial concurrent typecheck raced Next's generated `.next/types` replacement; rerunning sequentially passed.
- All **321 tests passed**. Coverage includes same-tick double submission, one SDK call per invitee without automatic retries, dismissal during invitations, manual-invite locking/recovery, list retry and stale results, and date/time/payload copying.
- An additional real PostgreSQL/PGlite scenario checks organizer and invitee SELECT policies, third-party denial, invitation without reserved seat, request/approval status, and leaving without inventing a decline state. This uses fictional local accounts, not production accounts.
- Production build, static-export checks, Capacitor sync and the signed iPhone Simulator Debug build passed. The design detector reported no findings on the three changed UI files; this does not establish full visual acceptance.
- All **71 production JS/CSS assets** returned HTTP 200 and matched the final local export. All **130 exported files** matched synced assets and the installed Simulator app, including after Xcode Run.

## Simulator

The iPhone 18 Pro Simulator was already booted and Fairway was visible in signed-in Discover at inspection. Xcode showed its welcome window; the real `ios/App/App.xcodeproj` was opened. Installed the new build without uninstalling or clearing app data and launched successfully. Two subsequent Xcode Run cycles reached signed-in Discover; the first showed a temporary black screen before content appeared. The startup sample's main thread was in the normal application run loop, with no sampled TPC/RPAC hotspot. The existing shared scheme still disables Thread Performance Checker while retaining LLDB; no further native configuration was changed.

This confirms successful launches in this environment, not a permanent fix for every Xcode/Simulator delay. Device Hub screenshots worked; its attempted taps either failed with `noWindowsAvailable` or did not navigate. Touch navigation and visual acceptance of the new party details remain pending. No physical iPhone, TestFlight or App Store release was performed.

## Publication

- URL: https://fairway-leon-golf.jjrtecl.chatgpt.site/
- Version: **71**
- Saved version: `appgprj_6ad1613abfc88191b4cc1f6f6aeae24d~appgver_204b1e9337388191a50115b8f7f20751`
- Deployment: `appgdep_6aefd0d07bf0819191cc388ac9d205b4` — succeeded.
- Isolated Sites-source commit: `d125049e8a23ebc5df1ec1348fae26c1777a443f`.

The Sites helper pushed the reviewed application source to its separate repository; no commit or push was made in the shared GitHub checkout. Final verification documentation was written after publication. Private logs, source staging and hash comparisons are in `.agent-runs/group-release-2026-11-07/`.

## Remaining limits

Native Chrome control briefly loaded the signed-in public Discover screen, but subsequent route/reload observations were inconsistent (stale content and then a blank capture). This is not a complete browser acceptance pass. The owned test tab was closed. A live invitation test between two production test accounts, full browser/Simulator interaction checks, VoiceOver and a physical iPhone remain pending. No invitations, chats or other test notifications were sent to real members. The older friendship cancellation/rate-limit issue from `release-audit-2026-11-04.md` remains separate and unchanged.
