/** Native responsive images avoid downloading desktop-sized photos on small screens. */
export function CoursePhoto({
  alt,
  priority = false,
  sizes = "(max-width: 740px) 100vw, 50vw",
}: {
  alt: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet="/images/fairway-aerial-640.avif 640w, /images/fairway-aerial-1024.avif 1024w, /images/fairway-aerial.avif 1600w"
        sizes={sizes}
      />
      <img
        src="/images/fairway-aerial.webp"
        srcSet="/images/fairway-aerial-640.webp 640w, /images/fairway-aerial-1024.webp 1024w, /images/fairway-aerial.webp 1600w"
        sizes={sizes}
        width={1600}
        height={990}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        alt={alt}
      />
    </picture>
  );
}
