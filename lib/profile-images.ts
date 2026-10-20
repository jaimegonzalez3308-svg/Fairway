import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./domain";

export const PROFILE_IMAGE_BUCKET = "profile-images";
export const PROFILE_PHOTO_REFRESH_MS = 45 * 60 * 1000;
const storedTypes = ["image/jpeg", "image/png", "image/webp"];

export function imageDimensions(width: number, height: number, maximum = 1024) {
  if (width <= 0 || height <= 0 || !Number.isFinite(width + height))
    throw new Error("No pudimos leer las dimensiones de la imagen.");
  const scale = Math.min(1, maximum / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Decode locally and export pixels, removing camera metadata and reducing upload size. */
export async function prepareProfileImage(
  file: File,
  maximum = 1024,
): Promise<File> {
  if (!file.size)
    throw new Error("La imagen está vacía. Elige otra fotografía.");
  if (file.size > 30 * 1024 * 1024)
    throw new Error("La imagen supera 30 MB. Elige una versión más pequeña.");
  const heic =
    /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (
    !storedTypes.includes(file.type) &&
    !heic &&
    !(file.type === "" && /\.(jpe?g|png|webp)$/i.test(file.name))
  )
    throw new Error("Elige una fotografía JPG, PNG o WebP.");
  const src = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(
          new Error(
            heic
              ? "Tu navegador no puede abrir esta foto HEIC. Expórtala como JPG o elige otra imagen."
              : "No pudimos abrir esta imagen. Elige un archivo JPG, PNG o WebP válido.",
          ),
        );
      img.src = src;
    });
    const size = imageDimensions(
      image.naturalWidth,
      image.naturalHeight,
      maximum,
    );
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No pudimos preparar la foto en este navegador.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(image, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(
                new Error(
                  "No pudimos preparar la fotografía. Intenta con otra imagen.",
                ),
              ),
        "image/jpeg",
        0.88,
      ),
    );
    return new File([blob], "foto.jpg", { type: blob.type });
  } finally {
    URL.revokeObjectURL(src);
  }
}

export function profileImageError(error: unknown) {
  const code = String(
    (error as { statusCode?: string; code?: string })?.statusCode ||
      (error as { code?: string })?.code ||
      "",
  );
  const message = String((error as { message?: string })?.message || "");
  if (/bucket.*not found/i.test(message))
    return "El almacenamiento de fotos no está disponible. Inténtalo más tarde.";
  if (
    ["401", "403", "42501"].includes(code) ||
    /row.level|unauthorized|jwt/i.test(message)
  )
    return "No se pudo guardar la foto con esta sesión. Vuelve a iniciar sesión e inténtalo de nuevo.";
  if (/fetch|network|timeout/i.test(message))
    return "No se pudo conectar para guardar la foto. Revisa tu conexión e inténtalo de nuevo.";
  return message || "No se pudo guardar la fotografía. Inténtalo de nuevo.";
}

export async function uploadProfileImage(
  client: SupabaseClient,
  userId: string,
  file: File,
) {
  if (
    !storedTypes.includes(file.type) ||
    file.size > 5 * 1024 * 1024 ||
    !file.size
  )
    throw new Error(
      "Cada imagen debe ser JPG, PNG o WebP de hasta 5 MB después de prepararla.",
    );
  const extension =
    file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const result = await client.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (result.error) throw result.error;
  return path;
}

export async function resolveProfilePhoto(
  client: SupabaseClient,
  profile: Profile,
): Promise<Profile> {
  const path = profile.photo_path ?? profile.photo;
  if (!path || /^https?:\/\//i.test(path) || path.startsWith("/"))
    return { ...profile, photo: path, photo_path: path };
  try {
    const result = await client.storage
      .from(PROFILE_IMAGE_BUCKET)
      .createSignedUrl(path, 3600);
    return {
      ...profile,
      photo_path: path,
      photo: result.error ? "" : result.data?.signedUrl || "",
    };
  } catch {
    // One unavailable image must not prevent loading the rest of the app.
    return { ...profile, photo_path: path, photo: "" };
  }
}

/** Only changes the photo column; read-back prevents a zero-row update reporting success. */
export async function saveProfilePhoto(
  client: SupabaseClient,
  userId: string,
  file: File | null,
) {
  const path = file ? await uploadProfileImage(client, userId, file) : "";
  const result = await client
    .from("profiles")
    .update({ photo: path })
    .eq("id", userId)
    .select("id,photo")
    .single();
  if (result.error) throw result.error;
  if (!result.data || result.data.id !== userId || result.data.photo !== path)
    throw new Error(
      "No pudimos confirmar el cambio de foto. Inténtalo de nuevo.",
    );
  return resolveProfilePhoto(client, result.data as Profile);
}
