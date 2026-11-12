# Graph Report - fairway  (2026-11-12)

## Corpus Check
- 260 files · ~165,307 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 35 file(s) not represented in the graph (top: .css 12, (none) 4, .woff2 4)

## Summary
- 1443 nodes · 4028 edges · 89 communities (69 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c071aae`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- stories.tsx
- parties.tsx
- native-offline.ts
- claude-permissions.mjs
- use-fairway.ts
- fairway-app.tsx
- friends.tsx
- round-entry.test.ts
- Hallazgos
- Empty
- package.json
- Fairway
- dependencies
- react
- ref_node_assert
- check-site-output.mjs
- [document]/page.tsx
- native-support.ts
- swipe-dom.test.ts
- native-shell.tsx
- FairwayDevicePlugin
- supabase.ts
- compilerOptions
- member-flows.test.ts
- check-contrast.mjs
- FairwayApplePlugin
- AppDelegate
- apple-services.ts
- layout.tsx
- supabase.ts
- use-native-feel.ts
- native-story-photo.test.ts
- landing-page.tsx
- swipe-deck.tsx
- isIOSApp
- FairwayDevicePlugin.swift
- accessibility-mode.tsx
- scripts
- native-story-ui.test.ts
- FairwayAuthPlugin
- .scene
- FairwayBridgeViewController
- Field
- image-tint.ts
- claude-bridge.mjs
- native-experience.test.ts
- README.md
- Fairway shared project context
- Fairway: app y servicios de iOS
- requiresAccount
- Fairway en iOS
- round-streak.ts
- next
- native-push.ts
- Codex ↔ Claude Code in Fairway
- Weekly group release — 2026-11-07
- claude-permissions.test.ts
- @capacitor/app
- Trabajar en Fairway
- Task
- Task
- browser-api.mjs
- Moderación del chat — Fairway / JR
- account-security.test.ts
- configure-ios-services.mjs
- settings.tsx
- Mejoras de experiencia · 25 de octubre de 2026
- Rendimiento · 20 de octubre de 2026
- Claude change audit — 2026-11-04
- Revisión del sitio · 19 de octubre de 2026
- useFairway
- AGENTS.md
- NativePrivacyLock
- community-social.test.ts
- profile-bio.test.ts
- native-week-friends.test.ts
- Fairway shared instructions
- inter/README.md
- fonts/README.md
- Package.swift
- CapApp-SPM/README.md
- notification-routes.test.ts
- profile-info.test.ts
- public-clubs.test.ts
- profile-validation.test.ts
- web-adaptations.test.ts

## God Nodes (most connected - your core abstractions)
1. `FairwayApp()` - 112 edges
2. `react` - 88 edges
3. `Button()` - 78 edges
4. `lucide-react` - 40 edges
5. `Field()` - 37 edges
6. `react-dom` - 36 edges
7. `Fairway` - 32 edges
8. `isIOSApp()` - 30 edges
9. `Profile` - 29 edges
10. `FairwayData` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Offline y seguridad` --references--> `FairwayDevicePlugin`  [INFERRED]
  docs/ios-services.md → ios/App/App/FairwayDevicePlugin.swift
- `Xcode e iOS` --references--> `FairwayWidgets`  [INFERRED]
  docs/environment-check.md → ios/App/FairwayWidgets/FairwayWidgets.swift
- `Working agreement` --references--> `useFriends()`  [INFERRED]
  docs/agent-context.md → lib/use-friends.ts
- `Working agreement` --references--> `GameForm()`  [INFERRED]
  docs/agent-context.md → components/forms.tsx
- `Working agreement` --references--> `PartyWeekStrip()`  [INFERRED]
  docs/agent-context.md → components/party-week-strip.tsx

## Import Cycles
- None detected.

## Communities (89 total, 20 thin omitted)

### Community 0 - "stories.tsx"
Cohesion: 0.06
Nodes (71): NativeStoryComposer, NativeStoryComposer(), PersonAvatar(), prefersManualStories(), Stories(), mute(), pick(), StoryComposer() (+63 more)

### Community 1 - "parties.tsx"
Cohesion: 0.05
Nodes (95): Availability(), CommunityInvite(), Discovery(), DiscoveryEmpty(), PhotoStack(), FilterForm(), SwipeDeck, authSchema (+87 more)

### Community 2 - "native-offline.ts"
Cohesion: 0.14
Nodes (24): NativeOfflinePanel, NativeOfflinePanel(), createSecureStorage(), NativeDeviceStatus, nativeSecureStorage, Vault, activeSync, changed() (+16 more)

### Community 3 - "claude-permissions.mjs"
Cohesion: 0.19
Nodes (25): activeRun(), allowOutput(), canonicalJson(), clampTimeout(), closeRunState(), decide(), DEFAULT_POLL_MS, denyOutput() (+17 more)

### Community 4 - "use-fairway.ts"
Cohesion: 0.05
Nodes (57): CityField(), Community(), likeRequest(), load(), toggleFollow(), toggleLike(), Post, Community (+49 more)

### Community 5 - "fairway-app.tsx"
Cohesion: 0.09
Nodes (32): CityFilter(), AuthForm, CompatibilityExplainer(), DeferredPanel(), Discovery, extras, FairwayApp(), conversationGame() (+24 more)

### Community 6 - "friends.tsx"
Cohesion: 0.13
Nodes (16): Friends, FriendshipActions, ProfileQR, Friends(), FriendshipActions(), Relation, AccountRequired(), Modal() (+8 more)

### Community 7 - "round-entry.test.ts"
Cohesion: 0.18
Nodes (11): NativeRoundEntry(), go(), next(), save(), setupValid(), SaveStatus, Stage, Hole (+3 more)

### Community 8 - "Hallazgos"
Cohesion: 0.07
Nodes (20): Actualización (3 nov, tarde), Cambios posteriores del usuario (mismo día), Claude Code, Estado y siguientes pasos, Flujo "cambio → Supabase → GitHub → Xcode" según los docs, GitHub, Hallazgos, Herramientas (+12 more)

### Community 9 - "Empty"
Cohesion: 0.30
Nodes (9): Stats, GolferRounds(), roundDateLabel(), State, Rounds(), Stats(), Empty(), Round (+1 more)

### Community 10 - "package.json"
Cohesion: 0.09
Nodes (31): devDependencies, @electric-sql/pglite@^0.5.10, jsdom@^26.1.0, jsqr@1.4.0, @next/swc-wasm-nodejs@16.4.2, prettier@^3.9.10, tailwindcss@^4.1.18, @tailwindcss/postcss@^4.1.18 (+23 more)

### Community 11 - "Fairway"
Cohesion: 0.06
Nodes (32): 1. Abrir en tu computadora, 2. Crear y conectar Supabase, 3. Qué está implementado, 4. Crear tu administrador, 5. Publicar en Vercel, 6. Comprobar que funciona, 7. Arquitectura y archivos, 8. Límites y trabajo posterior (+24 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): installNativeNetwork(), dependencies, @capacitor/ios@8.6.0, @capacitor/network@8.0.1, @capacitor/push-notifications@8.1.3, @capacitor/share@8.0.3, clsx@^2.1.1, @hookform/resolvers@^5.2.2 (+22 more)

### Community 13 - "react"
Cohesion: 0.15
Nodes (8): jsdom, react, react-dom, source, mount(), Sheet(), css, Mode

### Community 14 - "ref_node_assert"
Cohesion: 0.16
Nodes (6): @electric-sql/pglite, as(), request(), migrationUrl, as(), flagged()

### Community 15 - "check-site-output.mjs"
Cohesion: 0.07
Nodes (19): canonical, files(), home, image, jsonLd, legalIds, meta, missing (+11 more)

### Community 16 - "[document]/page.tsx"
Cohesion: 0.24
Nodes (13): generateMetadata(), LegalPage(), resolve(), AccessibilityToggle(), LegalDocument(), Operator(), LegalLinks(), NativeWelcome() (+5 more)

### Community 17 - "native-support.ts"
Cohesion: 0.16
Nodes (7): observeMessageVisibility(), installNativeSupport(), NATIVE_PAUSE, NATIVE_RESUME, NativeSupportPlugins, @capacitor/core@8.6.0, @capacitor/core

### Community 18 - "swipe-dom.test.ts"
Cohesion: 0.47
Nodes (3): card(), drag(), pointer()

### Community 19 - "native-shell.tsx"
Cohesion: 0.17
Nodes (16): NativeConnectionState, NativeEntry, NativeRefresh, NativeSwipeRow, NativeConnectionState(), NativeEntry(), NativeEntryLegal(), NativeEntryPhoto() (+8 more)

### Community 21 - "supabase.ts"
Cohesion: 0.26
Nodes (10): AuthenticationSheet, defaults, GoogleAuthClient, NATIVE_GOOGLE_CALLBACK, nativeGoogleCode(), NativeGoogleDependencies, performSignIn(), sheet (+2 more)

### Community 22 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 23 - "member-flows.test.ts"
Cohesion: 0.10
Nodes (17): Page(), authRedirectUrl(), authReturnError(), completedAuthReturnUrl(), isPasswordRecoveryReturn(), passwordRecoveryError(), routeFromHash(), gameShareUrl() (+9 more)

### Community 24 - "check-contrast.mjs"
Cohesion: 0.13
Nodes (14): beforeRef, cases, contrast(), current, files, luminance(), over(), postcss (+6 more)

### Community 27 - "apple-services.ts"
Cohesion: 0.20
Nodes (10): cors, Delivery, appleJWT(), base64url(), decode(), encoder, nonceHash(), pushPayload() (+2 more)

### Community 28 - "layout.tsx"
Cohesion: 0.12
Nodes (3): inter, Layout(), metadata

### Community 29 - "supabase.ts"
Cohesion: 0.20
Nodes (13): AppleDeleteAccount(), AppleDeleteAccount, DeleteAccountDialog(), Status, DeleteAccountDialog, AppleCredential, installAppleSession(), NativeApple (+5 more)

### Community 30 - "use-native-feel.ts"
Cohesion: 0.33
Nodes (8): headerShouldHide(), PageMotion, pageMotion(), reducedMotion(), useHideHeaderOnScroll(), usePageTransition(), useSheetDrag(), Header()

### Community 31 - "native-story-photo.test.ts"
Cohesion: 0.27
Nodes (7): dependencies(), requestStoryPhoto(), StoryPhotoDependencies, storyPhotoError(), StoryPhotoSource, @capacitor/camera@8.2.6, @capacitor/camera

### Community 32 - "landing-page.tsx"
Cohesion: 0.24
Nodes (10): CoursePhoto(), LandingPage, CourseContours(), GolfBallTee(), PuttingFlag(), Brand(), LandingPage(), plans (+2 more)

### Community 33 - "swipe-deck.tsx"
Cohesion: 0.29
Nodes (9): Actions, Gesture, SwipeDeck(), commit(), finishGesture(), resetGesture(), SwipeChoice, swipeChoice() (+1 more)

### Community 34 - "isIOSApp"
Cohesion: 0.25
Nodes (11): AuthForm(), ProfileQR(), Scorecard(), save(), GameShareLink(), holeColor(), isIOSApp(), nativeBridge() (+3 more)

### Community 35 - "FairwayDevicePlugin.swift"
Cohesion: 0.26
Nodes (7): AuthenticationServices, Capacitor, CryptoKit, LocalAuthentication, Security, UIKit, UserNotifications

### Community 36 - "accessibility-mode.tsx"
Cohesion: 0.40
Nodes (7): AccessibilityContext, AccessibilityProvider(), setEnabled(), ACCESSIBILITY_BOOTSTRAP, ACCESSIBILITY_STORAGE_KEY, readAccessibilityMode(), saveAccessibilityMode()

### Community 37 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, agent:claude, build, dev, dev:browser-test, ios:open, ios:run, ios:services (+4 more)

### Community 41 - "FairwayBridgeViewController"
Cohesion: 0.22
Nodes (5): FairwayBridgeViewController, .preferredStatusBarStyle, FairwayContainerViewController, .childForStatusBarHidden, .childForStatusBarStyle

### Community 42 - "Field"
Cohesion: 0.10
Nodes (30): PasswordDeleteAccount(), begin(), cancel(), refresh(), remove(), sendEmail(), PasswordRecovery, ProfilePhotoEditor (+22 more)

### Community 43 - "image-tint.ts"
Cohesion: 0.33
Nodes (8): cache, loadImageTint(), Rgb, tintCacheKey(), tintFromPixels(), tintPalette(), toHsl(), useImageTint()

### Community 44 - "claude-bridge.mjs"
Cohesion: 0.20
Nodes (12): approvedSkills, authStatus(), contextFiles, execute(), findClaude(), gitStatus(), impeccableSkill, main() (+4 more)

### Community 45 - "native-experience.test.ts"
Cohesion: 0.12
Nodes (18): NativeQuickActions, NativeTabBar, NativeTour, NativeQuickActions(), NativeTabBar(), nativeTabs, NativeTour(), drawings (+10 more)

### Community 46 - "README.md"
Cohesion: 0.31
Nodes (4): Revisión de accesibilidad de Fairway, Trabajo realizado, Validación automatizada, Verificación manual pendiente

### Community 47 - "Fairway shared project context"
Cohesion: 0.22
Nodes (8): Bridge permission review, Current implementation and limits, Entorno de terminal, Fairway shared project context, Impeccable design skill, Product and architecture, UI/UX Pro Max and Caveman, User requirements

### Community 48 - "Fairway: app y servicios de iOS"
Cohesion: 0.22
Nodes (7): Activar Apple y push, Capacidades y Universal Links, Cobertura, Fairway: app y servicios de iOS, Offline y seguridad, Pagos y rendimiento, Validación física pendiente

### Community 49 - "requiresAccount"
Cohesion: 0.47
Nodes (4): close(), accountFeatures, PUBLIC_PAGES, requiresAccount()

### Community 50 - "Fairway en iOS"
Cohesion: 0.25
Nodes (8): Accesibilidad y teclado, Datos y enlaces compartidos, Fairway en iOS, Google dentro de la app, Historias con cámara, Servicios y preparación de distribución, Simulador detenido en una pantalla negra, chooseFromGallery()

### Community 51 - "round-streak.ts"
Cohesion: 0.43
Nodes (5): localDay(), previousWeek(), roundStreak(), weekStart(), now

### Community 52 - "next"
Cohesion: 0.13
Nodes (7): metadata, dynamic, dynamic, config, next@^16.0.10, next, response

### Community 53 - "native-push.ts"
Cohesion: 0.28
Nodes (16): finishLogout(), logout(), NativePreferences(), NativeDevice, applyNativeLink(), connect(), disconnectNativePush(), enableNativePush() (+8 more)

### Community 54 - "Codex ↔ Claude Code in Fairway"
Cohesion: 0.29
Nodes (6): Claude usage limit fallback, Codex ↔ Claude Code in Fairway, Connection, Delegation, Permission review, Verification commands

### Community 55 - "Weekly group release — 2026-11-07"
Cohesion: 0.29
Nodes (6): Publication, Remaining limits, Scope and review, Simulator, Verification, Weekly group release — 2026-11-07

### Community 56 - "claude-permissions.test.ts"
Cohesion: 0.21
Nodes (9): createRunState(), hookCommand(), hookScript, hookSettings(), shellQuote(), fixture(), HookOutput, runHook() (+1 more)

### Community 57 - "@capacitor/app"
Cohesion: 0.15
Nodes (12): config, installNativeLinks(), loadNativeSupport(), @capacitor/app@8.1.2, @capacitor/keyboard@8.0.6, @capacitor/screen-reader@8.0.1, @capacitor/cli@8.6.0, @capacitor/app (+4 more)

### Community 58 - "Trabajar en Fairway"
Cohesion: 0.33
Nodes (5): Compartir cambios, Editar juntos en vivo, Estilo de los iconos laterales, Preparar tu computadora, Trabajar en Fairway

### Community 59 - "Task"
Cohesion: 0.33
Nodes (5): Acceptance checks, Allowed files, Return to Codex, Scope, Task

### Community 60 - "Task"
Cohesion: 0.33
Nodes (5): Acceptance checks, Allowed files, Return to Codex, Scope, Task

### Community 61 - "browser-api.mjs"
Cohesion: 0.32
Nodes (6): makeProfile(), port, reset(), session(), token(), user

### Community 62 - "Moderación del chat — Fairway / JR"
Cohesion: 0.33
Nodes (5): Casos probados, Dónde aplica, Límites que conviene saber, Moderación del chat — Fairway / JR, Siguiente nivel (opcional)

### Community 63 - "account-security.test.ts"
Cohesion: 0.73
Nodes (5): account(), login(), owner(), request(), session()

### Community 64 - "configure-ios-services.mjs"
Cohesion: 0.43
Nodes (4): escape(), main(), plist(), serviceConfiguration()

### Community 65 - "settings.tsx"
Cohesion: 0.20
Nodes (11): AccessibilitySetting(), CourseGuide(), courseParts, CourseIcon(), CoursePart, marks, Admin, Settings (+3 more)

### Community 66 - "Mejoras de experiencia · 25 de octubre de 2026"
Cohesion: 0.40
Nodes (5): Cambios, Mejoras de experiencia · 25 de octubre de 2026, Pruebas automatizadas, Reproducción de la revisión de navegador, Resultado observado en Chrome

### Community 67 - "Rendimiento · 20 de octubre de 2026"
Cohesion: 0.40
Nodes (5): Actualización · 25 de octubre de 2026, Cambios, Rendimiento · 20 de octubre de 2026, Reproducir, Verificación y pendientes

### Community 68 - "Claude change audit — 2026-11-04"
Cohesion: 0.40
Nodes (4): Claude change audit — 2026-11-04, Findings, Review coverage, Verification

### Community 69 - "Revisión del sitio · 19 de octubre de 2026"
Cohesion: 0.40
Nodes (5): Actualización · 20 de octubre de 2026, Actualización · 25 de octubre de 2026, Referencias primarias, Revisión del sitio · 19 de octubre de 2026, Verificación

### Community 70 - "useFairway"
Cohesion: 0.40
Nodes (5): useFairway(), favorite(), run(), loadDirectory(), Probe()

### Community 71 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): Fairway collaboration, graphify, Read-only reviewer for Claude Code, This is NOT the Next.js you know

### Community 74 - "community-social.test.ts"
Cohesion: 0.50
Nodes (3): globals, nativeCss, stories

### Community 76 - "native-week-friends.test.ts"
Cohesion: 0.40
Nodes (5): discovery, friends, game(), Harness(), parties

### Community 77 - "Fairway shared instructions"
Cohesion: 0.50
Nodes (3): Fairway shared instructions, graphify, Revisión con Codex

## Knowledge Gaps
- **10 isolated node(s):** `.apnsEnvironment`, `CryptoKit`, `LocalAuthentication`, `UserNotifications`, `.preferredStatusBarStyle` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 486 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `chooseFromGallery()` connect `Fairway en iOS` to `member-flows.test.ts`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **What connects `.apnsEnvironment`, `CryptoKit`, `LocalAuthentication` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `stories.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05515832482124617 - nodes in this community are weakly interconnected._
- **Why does `Fairway en iOS` connect `Fairway en iOS` to `Fairway: app y servicios de iOS`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Should `parties.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05476377510941533 - nodes in this community are weakly interconnected._
- **Should `native-offline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14482758620689656 - nodes in this community are weakly interconnected._
- **Should `use-fairway.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054392236976506636 - nodes in this community are weakly interconnected._