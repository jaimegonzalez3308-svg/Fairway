import type { CameraPlugin, MediaResult } from "@capacitor/camera";

export type StoryPhotoSource = "camera" | "photos";
export type StoryPhotoDependencies = {
  camera: Pick<
    CameraPlugin,
    "checkPermissions" | "takePhoto" | "chooseFromGallery"
  >;
  convertFileSrc: (path: string) => string;
  read: (url: string) => Promise<Pick<Response, "ok" | "blob">>;
};

export function storyPhotoError(error: unknown): string | null {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: string })?.message || "");
  if (/cancel(?:l)?ed|cancelado|dismissed/i.test(message)) return null;
  if (/denied|permission|not authorized|restricted/i.test(message))
    return "El acceso está desactivado. Activa Cámara o Fotos para Fairway en Ajustes del iPhone, o elige un archivo.";
  if (/simulator|not available|unavailable|not supported/i.test(message))
    return "La cámara no está disponible aquí. Puedes elegir una foto; para tomarla, usa un iPhone físico.";
  return message.startsWith("La foto") || message.startsWith("Elige una")
    ? message
    : "No pudimos abrir esta foto. Intenta otra vez o elige un archivo.";
}

async function dependencies(): Promise<StoryPhotoDependencies> {
  const [{ Camera }, { Capacitor }] = await Promise.all([
    import("@capacitor/camera"),
    import("@capacitor/core"),
  ]);
  return {
    camera: Camera,
    convertFileSrc: Capacitor.convertFileSrc,
    read: (url) => fetch(url),
  };
}

// Returns a local draft only. Uploading and publishing require a separate action.
export async function requestStoryPhoto(
  source: StoryPhotoSource,
  injected?: StoryPhotoDependencies,
): Promise<File | null> {
  try {
    const { camera, convertFileSrc, read } = injected || (await dependencies());
    let photo: MediaResult | undefined;
    if (source === "camera") {
      if ((await camera.checkPermissions()).camera === "denied")
        throw new Error("Camera permission denied");
      photo = await camera.takePhoto({
        quality: 90,
        targetWidth: 1600,
        targetHeight: 1600,
        correctOrientation: true,
        encodingType: 0,
        saveToGallery: false,
        includeMetadata: false,
        editable: "no",
        presentationStyle: "fullscreen",
      });
    } else {
      photo = (
        await camera.chooseFromGallery({
          mediaType: 0,
          allowMultipleSelection: false,
          quality: 90,
          targetWidth: 1600,
          targetHeight: 1600,
          correctOrientation: true,
          includeMetadata: false,
          editable: "no",
          presentationStyle: "fullscreen",
        })
      ).results[0];
      if (!photo) return null;
    }
    if (photo.type !== 0 || !photo.uri || !/^(file:\/\/|\/)/.test(photo.uri))
      throw new Error("Elige una fotografía guardada en el dispositivo.");
    const format =
      new URL(photo.uri, "file:///").pathname
        .split(".")
        .at(-1)
        ?.toLowerCase() || "";
    const mimeFromPath = (
      {
        jpeg: "image/jpeg",
        jpg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      } as Record<string, string>
    )[format];
    const response = await read(convertFileSrc(photo.uri));
    if (!response.ok) throw new Error("No se pudo leer la foto local.");
    const blob = await response.blob();
    const mime = ["image/jpeg", "image/png", "image/webp"].includes(blob.type)
      ? blob.type
      : mimeFromPath;
    if (!mime)
      throw new Error("Elige una foto JPG, PNG o WebP para esta historia.");
    if (!blob.size || blob.size > 10 * 1024 * 1024)
      throw new Error("La foto debe pesar entre 1 byte y 10 MB.");
    return new File(
      [blob],
      `historia.${mime === "image/jpeg" ? "jpg" : mime.split("/")[1]}`,
      {
        type: mime,
      },
    );
  } catch (error) {
    const message = storyPhotoError(error);
    if (message === null) return null;
    throw new Error(message);
  }
}
