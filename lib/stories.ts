export type Story = {
  id: string;
  user_id: string;
  media_path: string;
  caption: string;
  audience: "members" | "friends";
  created_at: string;
  expires_at: string;
  story_views: { user_id: string; viewed_at: string }[];
  story_likes: { user_id: string }[];
};

export function groupStories(stories: Story[], viewer: string) {
  const groups = new Map<string, Story[]>();
  for (const story of stories) {
    const group = groups.get(story.user_id) || [];
    group.push(story);
    groups.set(story.user_id, group);
  }
  return [...groups.entries()]
    .map(([userId, items]) => ({
      userId,
      items: items.sort((a, b) => a.created_at.localeCompare(b.created_at)),
      unseen: items.some(
        (s) => !s.story_views.some((v) => v.user_id === viewer),
      ),
    }))
    .sort((a, b) => {
      if (a.userId === viewer) return -1;
      if (b.userId === viewer) return 1;
      return (
        Number(b.unseen) - Number(a.unseen) ||
        b.items.at(-1)!.created_at.localeCompare(a.items.at(-1)!.created_at)
      );
    });
}

export function storyTime(created: string, now = Date.now()) {
  const minutes = Math.max(
    1,
    Math.floor((now - new Date(created).getTime()) / 60000),
  );
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h`;
}

// Normalizar a JPEG elimina metadatos y limita tamaño y dimensiones antes de subir.
export async function prepareStoryPhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Elige una foto JPG, PNG o WebP.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("La foto debe pesar menos de 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 60_000_000)
      throw new Error(
        "Esta foto es demasiado grande. Elige una versión más pequeña.",
      );
    const scale = Math.min(
      1,
      1600 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("No pudimos preparar la foto. Prueba con otra.");
    context.fillStyle = "#16382b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob || blob.size > 5 * 1024 * 1024)
      throw new Error(
        "No pudimos preparar la foto. Prueba con una más pequeña.",
      );
    return blob;
  } catch (e) {
    throw e instanceof Error && e.message
      ? e
      : new Error("No pudimos leer esta foto.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
