import type { Club, Game } from "./domain";

export const DEFAULT_CITY = "León";
export const suggestedCities = [
  "León",
  "Silao",
  "Guanajuato",
  "Irapuato",
  "Celaya",
  "Querétaro",
  "San Miguel de Allende",
  "Aguascalientes",
  "Guadalajara",
  "Ciudad de México",
  "Monterrey",
  "Puebla",
  "San Luis Potosí",
];

function folded(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCity(value: string): string {
  const city = value.trim().replace(/\s+/g, " ");
  const key = folded(city);
  if (/^(leon|leon de los aldama)(,? (guanajuato|gto\.?))?$/.test(key))
    return DEFAULT_CITY;
  if (["cdmx", "ciudad de mexico", "mexico city"].includes(key))
    return "Ciudad de México";
  return suggestedCities.find((name) => folded(name) === key) || city;
}

// Small session-metadata validation; full profile validation loads with the editor.
export function parseCity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const city = value.trim();
  return city.length >= 2 && city.length <= 80 ? normalizeCity(city) : null;
}

// Nearby clubs share León's category; uncertain club locations stay unclassified.
export function cityKey(value?: string | null): string {
  if (!value) return "";
  const key = folded(normalizeCity(value));
  if (["por confirmar", "pendiente", "sin ciudad"].includes(key)) return "";
  return key === "alrededores de leon" ? "leon" : key;
}

export function matchesCity(
  value: string | null | undefined,
  scope: string,
  ownCity: string,
) {
  if (scope === "any") return true;
  const selected = cityKey(scope === "mine" ? ownCity : scope);
  return !!selected && cityKey(value) === selected;
}

export function cityOptions(values: string[]) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const key = cityKey(value);
    if (key && !unique.has(key))
      unique.set(key, key === "leon" ? DEFAULT_CITY : normalizeCity(value));
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b, "es"));
}

export function gameMatchesCity(
  game: Pick<Game, "club_id">,
  clubs: Club[],
  scope: string,
  ownCity: string,
) {
  return matchesCity(
    clubs.find((club) => club.id === game.club_id)?.city,
    scope,
    ownCity,
  );
}

export function clubsForCity(
  clubs: Club[],
  city: string,
  selectedIds: string[] = [],
  showOtherCities = false,
) {
  return clubs.filter(
    (club) =>
      showOtherCities ||
      matchesCity(club.city, "mine", city) ||
      selectedIds.includes(club.id),
  );
}

export function cityFromGeocode(data: unknown): string {
  if (!data || typeof data !== "object")
    throw new Error("No pudimos identificar la ciudad. Escríbela manualmente.");
  const result = data as {
    city?: unknown;
    locality?: unknown;
    countryCode?: unknown;
  };
  const value =
    typeof result.city === "string" && result.city.trim()
      ? result.city
      : result.locality;
  if (
    typeof value !== "string" ||
    value.trim().length < 2 ||
    value.trim().length > 80
  )
    throw new Error("No pudimos identificar la ciudad. Escríbela manualmente.");
  const city = normalizeCity(value);
  // Keep foreign names distinct from the Mexican city categories.
  return typeof result.countryCode === "string" && result.countryCode !== "MX"
    ? `${city}, ${result.countryCode}`.slice(0, 80)
    : city;
}

export function locationError(error: unknown): string {
  const code = (error as { code?: number })?.code;
  if (code === 1)
    return "No se permitió el acceso a la ubicación. Puedes escribir tu ciudad sin dar permiso.";
  if (code === 2)
    return "Tu dispositivo no pudo obtener la ubicación. Escribe tu ciudad o inténtalo de nuevo.";
  if (code === 3)
    return "La ubicación tardó demasiado. Escribe tu ciudad o inténtalo de nuevo.";
  return "No pudimos detectar tu ciudad. Puedes escribirla manualmente.";
}

export async function detectCity(
  geolocation: Pick<Geolocation, "getCurrentPosition">,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const aborted = () => reject(signal.reason);
    signal.addEventListener("abort", aborted, { once: true });
    const clean = () => signal.removeEventListener("abort", aborted);
    geolocation.getCurrentPosition(
      (position) => {
        clean();
        resolve(position);
      },
      (error) => {
        clean();
        reject(error);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 },
    );
  });
  signal.throwIfAborted();
  // Only approximate coordinates leave the browser; nothing is stored in Fairway.
  const query = new URLSearchParams({
    latitude: position.coords.latitude.toFixed(2),
    longitude: position.coords.longitude.toFixed(2),
    localityLanguage: "es",
  });
  const response = await fetcher(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`,
    {
      signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Geocoding unavailable");
  return cityFromGeocode(await response.json());
}
