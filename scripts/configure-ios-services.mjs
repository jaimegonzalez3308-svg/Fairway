import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  realpathSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export function serviceConfiguration({
  teamId,
  appId = "com.fairway.app",
  host,
  apple = true,
  push = false,
  links = true,
}) {
  if (!/^[A-Z0-9]{10}$/.test(teamId || ""))
    throw new Error(
      "Supply a 10-character Apple Developer Team ID with --team.",
    );
  if (!/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(appId))
    throw new Error("Invalid app bundle ID.");
  if (
    links &&
    (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host || "") || host === "localhost")
  )
    throw new Error(
      "Supply the HTTPS website hostname with --host (no path or scheme).",
    );
  const entitlements = {};
  if (apple) entitlements["com.apple.developer.applesignin"] = ["Default"];
  if (push) entitlements["aps-environment"] = "$(APS_ENVIRONMENT)";
  if (links)
    entitlements["com.apple.developer.associated-domains"] = [
      `applinks:${host}`,
    ];
  const association = {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${appId}`],
          components: [
            {
              "/": "/",
              "?": { partida: "*" },
              comment: "Shared golf round; access is checked in the app.",
            },
            {
              "/": "/",
              "?": { golfista: "*" },
              comment: "Shared member profile; access is checked in the app.",
            },
          ],
        },
      ],
    },
  };
  return { entitlements, association };
}
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
function plist(value) {
  if (Array.isArray(value))
    return `<array>${value.map(plist).join("")}</array>`;
  if (typeof value === "boolean") return value ? "<true/>" : "<false/>";
  if (typeof value === "number") return `<integer>${value}</integer>`;
  if (value && typeof value === "object")
    return `<dict>${Object.entries(value)
      .map(([key, item]) => `<key>${escape(key)}</key>${plist(item)}`)
      .join("")}</dict>`;
  return `<string>${escape(value)}</string>`;
}
function main() {
  const args = process.argv.slice(2);
  const argument = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
  };
  const teamId = argument("--team", process.env.APPLE_TEAM_ID);
  const appId = argument("--app-id", "com.fairway.app");
  const host = argument("--host", "fairway-leon-golf.jjrtecl.chatgpt.site");
  const push = args.includes("--push");
  const apple = !args.includes("--no-apple");
  const links = !args.includes("--no-links");
  const files = serviceConfiguration({
    teamId,
    appId,
    host,
    push,
    apple,
    links,
  });
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const entitlementPath = resolve(root, "ios/App/App/App.entitlements");
  const old = existsSync(entitlementPath)
    ? JSON.parse(
        execFileSync(
          "plutil",
          ["-convert", "json", "-o", "-", entitlementPath],
          { encoding: "utf8" },
        ),
      )
    : {};
  const entitlements = { ...old, ...files.entitlements };
  let project = readFileSync(
    resolve(root, "ios/App/App.xcodeproj/project.pbxproj"),
    "utf8",
  );
  let targets = 0;
  project = project.replace(
    /buildSettings = \{([\s\S]*?)\};/g,
    (section, settings) => {
      const id = settings.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/)?.[1];
      if (
        id !== "com.fairway.app" &&
        id !== "com.fairway.app.shortcuts" &&
        id !== appId &&
        id !== `${appId}.shortcuts`
      )
        return section;
      targets++;
      const widget = id.endsWith(".shortcuts");
      let next = settings.replace(
        /PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/,
        `PRODUCT_BUNDLE_IDENTIFIER = ${appId}${widget ? ".shortcuts" : ""};`,
      );
      next = next.replace(/DEVELOPMENT_TEAM = [^;]+;/g, "");
      next += `\n\t\t\t\tDEVELOPMENT_TEAM = ${teamId};\n`;
      if (!widget) {
        next = next.replace(/CODE_SIGN_ENTITLEMENTS = [^;]+;/g, "");
        next += "\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n";
      }
      return `buildSettings = {${next}};`;
    },
  );
  if (targets !== 4)
    throw new Error(
      "Expected Debug and Release settings for App and FairwayWidgets; inspect the Xcode project before retrying.",
    );
  let info = readFileSync(resolve(root, "ios/App/App/Info.plist"), "utf8");
  if (push)
    info = info.replace(
      /(<key>FairwayPushEnabled<\/key>\s*)<(?:true|false)\s*\/>/,
      `$1<${push ? "true" : "false"}/>`,
    );
  // APNs environment expands from Xcode's Debug/Release build setting.
  const associationPath = resolve(
    root,
    "public/.well-known/apple-app-site-association",
  );
  let association = files.association;
  if (links && existsSync(associationPath)) {
    const previous = JSON.parse(readFileSync(associationPath, "utf8"));
    const details = previous.applinks?.details || [];
    const currentId = `${teamId}.${appId}`;
    if (
      details.some(
        (item) => item.appID === currentId || item.appIDs?.includes(currentId),
      )
    ) {
      // Preserve all previously published paths for this app, including custom ones.
      association = previous;
    } else
      association = {
        ...previous,
        applinks: {
          ...previous.applinks,
          details: [...details, ...association.applinks.details],
        },
      };
  }
  if (args.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        { teamId, appId, host, entitlements, association, push },
        null,
        2,
      ),
    );
    return;
  }
  writeFileSync(
    entitlementPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">${plist(entitlements)}</plist>\n`,
  );
  writeFileSync(
    resolve(root, "ios/App/App.xcodeproj/project.pbxproj"),
    project,
  );
  writeFileSync(resolve(root, "ios/App/App/Info.plist"), info);
  if (links) {
    mkdirSync(dirname(associationPath), { recursive: true });
    writeFileSync(associationPath, JSON.stringify(association, null, 2) + "\n");
  }
  console.log(
    "Local signing settings and association file prepared. Enable the matching capabilities in the Apple portal, deploy backend services, publish/verify the association file, then run pnpm ios:sync. No remote services were changed.",
  );
}
if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
)
  main();
