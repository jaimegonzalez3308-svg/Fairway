/** Loopback-only API fixtures for manual browser checks. Never use as a backend. */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
const port = Number(process.env.FAIRWAY_TEST_API_PORT || 4101);
const userId = "11111111-1111-4111-8111-111111111111";
const hostId = "22222222-2222-4222-8222-222222222222";
const clubId = "33333333-3333-4333-8333-333333333333";
const gameId = "44444444-4444-4444-8444-444444444444";
const chatId = "55555555-5555-4555-8555-555555555555";
const makeProfile = (id, name) => ({
  id,
  name,
  age: 32,
  city: "León",
  club_id: null,
  handicap: null,
  bio: "Perfil de prueba local.",
  availability: [],
  holes: 18,
  style: "social",
  photo: "",
  verified: false,
  accepts_guests: false,
  beginner_friendly: true,
  visibility: "members",
  gallery: [],
});
const user = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "golfer@example.test",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
let state;
function reset() {
  state = {
    profiles: [
      makeProfile(userId, "Golfista de prueba"),
      { ...makeProfile(hostId, "Ana de prueba"), availability: ["Sábado"] },
    ],
    clubs: [
      {
        id: clubId,
        name: "Campo de prueba local",
        city: "León",
        verified: false,
        description: "Datos ficticios para pruebas.",
        access_info: "Confirmar acceso con el club.",
      },
    ],
    games: [
      {
        id: gameId,
        host_id: hostId,
        club_id: clubId,
        starts_at: new Date(Date.now() + 86400000 * 3).toISOString(),
        holes: 18,
        capacity: 4,
        format: "Stroke play",
        kind: "social",
        privacy: "public",
        join_mode: "open",
        description: "Ronda ficticia para verificar la interfaz.",
        access_conditions: "Gestionar acceso con el club.",
        status: "open",
        participants: [{ user_id: hostId, status: "confirmed" }],
      },
    ],
    conversations: [],
    messages: [],
    decisions: [],
    favorites: [],
    files: new Map(),
    failures: {},
    delay: 0,
    requests: [],
  };
}
reset();
const token = () =>
  [
    { alg: "HS256", typ: "JWT" },
    {
      sub: userId,
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
  ]
    .map((x) => Buffer.from(JSON.stringify(x)).toString("base64url"))
    .concat("local-test-signature")
    .join(".");
const session = () => ({
  access_token: token(),
  token_type: "bearer",
  expires_in: 86400,
  refresh_token: "local-test-refresh-token",
  user,
});
createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3100");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  const json = (data, code = 200) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (req.method === "OPTIONS") return json({});
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  let body = {};
  try {
    body = JSON.parse(raw.toString());
  } catch {}
  if (url.pathname === "/__test/control" && req.method === "POST") {
    if (body.reset) reset();
    if (body.failures) state.failures = body.failures;
    if (body.delay !== undefined) state.delay = body.delay;
    if (body.empty) {
      state.profiles = state.profiles.filter((p) => p.id === userId);
      state.games = [];
    }
    return json({ ready: true });
  }
  if (url.pathname === "/__test/state")
    return json({ ...state, files: [...state.files.keys()] });
  state.requests.push({ method: req.method, path: url.pathname });
  if (state.delay)
    await new Promise((resolve) => setTimeout(resolve, state.delay));
  if (state.failures[url.pathname]) {
    state.failures[url.pathname]--;
    return json(
      {
        message: "Fallo de conexión simulado. Intenta de nuevo.",
        code: "TEST_NETWORK",
      },
      503,
    );
  }
  if (url.pathname === "/auth/v1/token") return json(session());
  if (url.pathname === "/auth/v1/user") return json(user);
  if (url.pathname === "/auth/v1/logout") return json({});
  if (url.pathname === "/auth/v1/settings")
    return json({
      external: { email: true, google: false },
      disable_signup: false,
      mailer_autoconfirm: false,
    });
  if (url.pathname.startsWith("/storage/v1/object/sign/")) {
    const path = decodeURIComponent(
      url.pathname.split("/profile-images/")[1] || "",
    );
    if (req.method === "POST")
      return json({
        signedURL: `/object/sign/profile-images/${path}?token=fixture`,
      });
    if (state.files.has(path)) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      return res.end(state.files.get(path));
    }
    return json({ message: "Image not found" }, 404);
  }
  if (
    url.pathname.startsWith("/storage/v1/object/profile-images/") &&
    req.method === "POST"
  ) {
    const path = decodeURIComponent(url.pathname.split("/profile-images/")[1]);
    // The SDK uses a multipart form. Keep only the prepared JPEG bytes.
    const marker = raw.indexOf(Buffer.from([0xff, 0xd8]));
    const end = raw.lastIndexOf(Buffer.from([0xff, 0xd9]));
    state.files.set(
      path,
      marker >= 0 && end > marker ? raw.subarray(marker, end + 2) : raw,
    );
    return json({ Key: `profile-images/${path}`, Id: randomUUID() });
  }
  const rpc = url.pathname.split("/rest/v1/rpc/")[1];
  if (rpc) {
    if (rpc === "rating_summary") return json([]);
    if (rpc === "request_join") {
      const game = state.games.find((g) => g.id === body.g);
      if (!game) return json({ message: "Partida no disponible" }, 404);
      if (!game.participants.some((p) => p.user_id === userId))
        game.participants.push({ user_id: userId, status: "confirmed" });
      state.conversations = [
        {
          id: chatId,
          game_id: gameId,
          match_id: null,
          game,
          conversation_members: [
            { user_id: userId, last_read_at: new Date().toISOString() },
            { user_id: hostId, last_read_at: new Date().toISOString() },
          ],
        },
      ];
      return json(null);
    }
    if (rpc === "send_message") {
      state.messages.push({
        id: randomUUID(),
        conversation_id: body.c,
        sender_id: userId,
        body: body.content,
        created_at: new Date().toISOString(),
      });
      return json(null);
    }
    if (rpc === "decide") {
      state.decisions.push({ target_id: body.target });
      return json(null);
    }
    return json({ message: "Fixture RPC not implemented" }, 404);
  }
  const table = url.pathname.split("/rest/v1/")[1];
  if (table) {
    if (table === "profiles" && req.method === "PATCH") {
      const row = state.profiles.find(
        (p) => p.id === url.searchParams.get("id")?.replace("eq.", ""),
      );
      if (!row) return json({ message: "Profile not found" }, 404);
      Object.assign(row, body);
      return json(
        req.headers.accept?.includes("vnd.pgrst.object") ? row : [row],
      );
    }
    if (req.method !== "GET") return json([]);
    let rows =
      table === "account_roles"
        ? [{ is_admin: false, suspended: false }]
        : state[table] || [];
    for (const [key, filter] of url.searchParams) {
      if (filter.startsWith("eq."))
        rows = rows.filter((row) => String(row[key]) === filter.slice(3));
    }
    if (url.searchParams.get("limit") === "0") rows = [];
    if (req.headers.accept?.includes("vnd.pgrst.object"))
      return json(rows[0] || null);
    return json(rows);
  }
  json({ message: "Fixture endpoint not implemented" }, 404);
}).listen(port, "127.0.0.1", () =>
  console.log(`Local test API: http://127.0.0.1:${port} (fictional data only)`),
);
