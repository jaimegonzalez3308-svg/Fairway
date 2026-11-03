"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Gallery({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let current = true;
    void Promise.all(
      paths.map(async (p) => {
        if (p.startsWith("http")) return p;
        if (!supabase) return "";
        const { data } = await supabase.storage
          .from("profile-images")
          .createSignedUrl(p, 3600);
        return data?.signedUrl || "";
      }),
    ).then((u) => {
      if (current) setUrls(u.filter(Boolean));
    });
    return () => {
      current = false;
    };
  }, [paths.join("|")]);
  return urls.length ? (
    <div className="photo-gallery">
      {urls.map((u, i) => (
        <a href={u} key={u} target="_blank" rel="noreferrer">
          <img src={u} alt={`Fotografía de galería ${i + 1}`} />
        </a>
      ))}
    </div>
  ) : null;
}
