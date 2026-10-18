import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  // App screens use fragments and are not independent public URLs.
  // Never publish member profiles, chats, or recovery links here.
  return [{ url: site.url }];
}
