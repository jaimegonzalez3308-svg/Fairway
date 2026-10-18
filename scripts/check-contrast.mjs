/** Declared-color regression checks. Does not replace a rendered WCAG audit. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("next/package.json"))("postcss");
const files = [
  "app/globals.css",
  "app/clubhouse.css",
  "app/hierarchy.css",
  "app/landing.css",
  "app/accessibility.css",
];
const load = (revision) =>
  files.flatMap((file) => {
    let css;
    try {
      css = revision
        ? execFileSync("git", ["show", `${revision}:${file}`], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          })
        : readFileSync(file, "utf8");
    } catch {
      if (file.endsWith("accessibility.css") && revision) return [];
      throw new Error(`Cannot read ${file}`);
    }
    const rules = [];
    postcss.parse(css).walkRules((rule) => {
      // Evaluate the enabled theme; the browser still receives the scoped CSS.
      const normalized = rule.clone();
      normalized.selector = postcss.list
        .comma(rule.selector)
        .map((selector) =>
          selector === 'html[data-accessibility="true"]'
            ? ":root"
            : selector.replace(/^html\[data-accessibility="true"\]\s+/, ""),
        )
        .join(", ");
      rules.push(normalized);
    });
    return rules;
  });
function value(rules, selector, property) {
  let result;
  for (const rule of rules)
    if (postcss.list.comma(rule.selector).includes(selector))
      rule.walkDecls(property, (d) => {
        result = d.value;
      });
  if (!result) throw new Error(`Missing ${selector} ${property}`);
  const vars = {};
  for (const rule of rules)
    if ([":root", ".fw-landing"].includes(rule.selector))
      rule.walkDecls((d) => {
        if (d.prop.startsWith("--")) vars[d.prop] = d.value;
      });
  return result.replace(/var\((--[\w-]+)\)/g, (_, name) => {
    if (!vars[name]) throw new Error(`Unknown ${name}`);
    return vars[name];
  });
}
function rgba(source) {
  const s = (
    { white: "#ffffff", black: "#000000", transparent: "#00000000" }[source] ||
    source
  ).trim();
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length < 5) h = [...h].map((c) => c + c).join("");
    return [0, 2, 4]
      .map((i) => parseInt(h.slice(i, i + 2), 16))
      .concat(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    return [...p.slice(0, 3), p[3] ?? 1];
  }
  throw new Error(`Unsupported color ${source}`);
}
const over = (fg, bg) =>
  fg
    .slice(0, 3)
    .map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]))
    .concat(1);
const luminance = (color) =>
  color
    .slice(0, 3)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
function contrast(fg, bg) {
  const b = over(rgba(bg), [255, 255, 255, 1]);
  const f = over(rgba(fg), b);
  const [low, high] = [luminance(f), luminance(b)].sort((a, b) => a - b);
  return (high + 0.05) / (low + 0.05);
}
// Selectors identify the actual source declarations, including the final theme overrides.
const cases = [
  ["Primary text", ":root", "color", ".panel", "background"],
  ["Secondary text", ":root", "--muted", ":root", "--bg"],
  ["Sidebar location", ".sidebar-city", "color", ".sidebar", "background"],
  ["Sidebar labels", ".nav-caption", "color", ".sidebar", "background"],
  ["Navigation", ".nav-item", "color", ".sidebar", "background"],
  [
    "Selected navigation",
    ".nav-item.active",
    "color",
    ".nav-item.active",
    "background",
  ],
  ["Tabs", ".tabs button", "color", ":root", "--bg"],
  [
    "Primary button",
    ".button.primary",
    "color",
    ".button.primary",
    "background",
  ],
  [
    "Button hover",
    ".button.primary",
    "color",
    ".button.primary:hover",
    "background",
  ],
  [
    "Outline button",
    ".button.outline",
    "color",
    ".button.outline",
    "background",
  ],
  [
    "Profile link",
    ".profile-info-button",
    "color",
    ".golfer-card",
    "background",
  ],
  ["Profile biography", ".golfer-bio", "color", ".golfer-card", "background"],
  [
    "Profile tags",
    ".golfer-tags span",
    "color",
    ".golfer-tags span",
    "background",
  ],
  ["Rating", ".rating", "color", ".golfer-card", "background"],
  ["Game details", ".game-card p", "color", ".game-card", "background"],
  [
    "Game action",
    ".game-card-bottom button",
    "color",
    ".game-card",
    "background",
  ],
  ["Field label", ".field > span", "color", ".modal", "background"],
  ["Placeholder", "input::placeholder", "color", "input", "background"],
  ["Password link", ".text-button", "color", ".modal", "background"],
  ["Auth security note", ".secure-note", "color", ".modal", "background"],
  ["Auth divider", ".auth-divider", "color", ".modal", "background"],
  ["Notice", ".notice", "color", ".notice", "background"],
  ["Field error", ".error-text", "color", ".modal", "background"],
  ["Error banner", ".error-banner", "color", ".error-banner", "background"],
  ["Round headers", ".rounds-table th", "color", ".panel", "background"],
  ["Round values", ".rounds-table td", "color", ".panel", "background"],
  [
    "Birdie score",
    ".score-table td.birdie",
    "color",
    ".score-table td.birdie",
    "background",
  ],
  [
    "Bogey score",
    ".score-table td.bogey",
    "color",
    ".score-table td.bogey",
    "background",
  ],
  [
    "Double bogey score",
    ".score-table td.double",
    "color",
    ".score-table td.double",
    "background",
  ],
  [
    "Eagle score",
    ".score-table td.eagle",
    "color",
    ".score-table td.eagle",
    "background",
  ],
  [
    "Chat metadata",
    ".chat-bubble small",
    "color",
    ".chat-bubble",
    "background",
  ],
  [
    "Own chat metadata",
    ".chat-bubble.own small",
    "color",
    ".chat-bubble.own",
    "background",
  ],
  [
    "Calendar full",
    ".party-month-event.full",
    "color",
    ".party-month-event.full",
    "background",
  ],
  [
    "Calendar past",
    ".party-month-event.past",
    "color",
    ".party-month-event.past",
    "background",
  ],
  [
    "Outside-month date",
    ".outside-month .party-day-number",
    "color",
    ".party-month-grid td.outside-month",
    "background",
  ],
  ["Calendar time", ".party-agenda-time", "color", ".panel", "background"],
  ["Story count", ".story-count", "color", ".story-count", "background"],
  ["Footer", ".app-footer", "color", ":root", "--bg"],
  [
    "Landing secondary",
    ".fw-landing",
    "--fw-muted",
    ".fw-landing",
    "--fw-paper",
  ],
  [
    "Landing photo credit",
    ".fw-photo-credit",
    "color",
    ".fw-landing",
    "--fw-paper",
  ],
  [
    "Landing club details",
    ".fw-club-list small",
    "color",
    ".fw-landing",
    "--fw-paper",
  ],
  [
    "Landing note",
    ".fw-preview-disclaimer",
    "color",
    ".fw-plan-preview",
    "background",
  ],
  [
    "Selected planner option",
    ".fw-choice-group button.fw-choice-active",
    "color",
    ".fw-choice-group button.fw-choice-active",
    "background",
  ],
  [
    "Planner option",
    ".fw-choice-group button",
    "color",
    ".fw-planner",
    "background",
  ],
  [
    "Hero photo text",
    ".fw-hero-image-copy",
    "color",
    ".fw-hero-image-copy",
    "background",
  ],
  [
    "Field boundary",
    'input:not([type="checkbox"]):not([type="radio"])',
    "border-color",
    "input",
    "background",
    3,
  ],
  [
    "Outline boundary",
    ".button.outline",
    "border-color",
    ".button.outline",
    "background",
    3,
  ],
  ["Focus on cream", ":root", "--a11y-focus-dark", ":root", "--paper", 3],
  ["Focus on green", ":root", "--a11y-focus-light", ":root", "--forest", 3],
];
const current = load();
const beforeRef = process.argv[2];
const before = beforeRef ? load(beforeRef) : null;
console.log("Accessibility mode enabled — declared-color checks\n");
console.log("| Component / state | Before | Current | Minimum |");
console.log("| --- | ---: | ---: | ---: |");
let failed = 0;
for (const [name, fg, fp, bg, bp, minimum = 4.5] of cases) {
  const read = (rules) => contrast(value(rules, fg, fp), value(rules, bg, bp));
  let previous = "—";
  if (before)
    try {
      previous = read(before).toFixed(2) + ":1";
    } catch {}
  const ratio = read(current);
  if (ratio < minimum) failed++;
  console.log(
    `| ${name} | ${previous} | ${ratio.toFixed(2)}:1${ratio < minimum ? " FAIL" : ""} | ${minimum}:1 |`,
  );
}
console.log(
  `\n${cases.length - failed}/${cases.length} declared-color checks passed. Browser rendering, photos, forced-colors and real assistive technology still require manual review.`,
);
if (failed) process.exitCode = 1;
