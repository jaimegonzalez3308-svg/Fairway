"use client";
import { useEffect, useState } from "react";
import { Plus, Sun } from "lucide-react";
import type { Profile } from "@/lib/domain";
import type { useFairway } from "@/lib/use-fairway";
import { supabase } from "@/lib/supabase";
import { gameMatchesCity } from "@/lib/cities";
import { dateFormat, timeFormat } from "@/lib/utils";
import { Button, Empty, Field, SectionHeading, ThumbAction } from "./ui";
import { CityFilter } from "./city-field";
import { Avatar } from "./member-primitives";

export function Availability({
  data,
  openProfile,
  onCreate,
  cityScope = "any",
  onCityScopeChange,
}: {
  data: ReturnType<typeof useFairway>;
  openProfile: (p: Profile) => void;
  onCreate: () => void;
  cityScope?: string;
  onCityScopeChange?: (scope: string) => void;
}) {
  const [entries, setEntries] = useState<
    {
      user_id: string;
      starts_at: string;
      expires_at: string;
      holes: number;
      club_id: string;
    }[]
  >([]);
  async function load() {
    if (!supabase) return;
    const { data: r, error } = await supabase
      .from("availability")
      .select("*")
      .gt("expires_at", new Date().toISOString());
    if (error) data.notify(error.message);
    else setEntries(r || []);
  }
  useEffect(() => {
    void load();
  }, [data.user]);
  const visibleEntries = entries.filter(
    (entry) =>
      entry.user_id !== data.user?.id &&
      data.profiles.some((profile) => profile.id === entry.user_id) &&
      gameMatchesCity(entry, data.clubs, cityScope, data.me.city),
  );
  return (
    <>
      <SectionHeading
        eyebrow="ESPONTÁNEO TAMBIÉN ES UN GRAN PLAN"
        title="¿Quién juega hoy?"
        description="Publica tu disponibilidad temporal y encuentra compañía."
        action={
          <ThumbAction onClick={onCreate}>
            <Plus size={16} />
            Armar partida
          </ThumbAction>
        }
      />
      {onCityScopeChange && (
        <div className="city-explore-filter">
          <CityFilter
            scope={cityScope}
            ownCity={data.me.city}
            cities={data.clubs.map((club) => club.city)}
            onChange={onCityScopeChange}
          />
        </div>
      )}
      <form
        className="panel availability-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const start = new Date(
            String(f.get("date")) + "T" + String(f.get("time")) + ":00-06:00",
          );
          const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
          const ok = await data.run(
            () =>
              supabase!.from("availability").upsert({
                user_id: data.user!.id,
                club_id: f.get("club"),
                starts_at: start.toISOString(),
                expires_at: end.toISOString(),
                holes: Number(f.get("holes")),
              }),
            "Disponibilidad publicada por 4 horas desde el horario indicado.",
          );
          if (ok) void load();
        }}
      >
        <Field label="Fecha">
          <input type="date" name="date" required />
        </Field>
        <Field label="Hora aproximada">
          <input type="time" name="time" required />
        </Field>
        <Field label="Club">
          <select name="club">
            {data.clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hoyos">
          <select name="holes">
            <option>18</option>
            <option>9</option>
          </select>
        </Field>
        <Button>
          Estoy disponible
          <Sun size={16} />
        </Button>
      </form>
      <div className="profile-grid">
        {visibleEntries.map((e) => {
          const p = data.profiles.find((p) => p.id === e.user_id);
          return (
            p && (
              <article className="panel availability-card" key={e.user_id}>
                <Avatar profile={p} large />
                <h3>{p.name}</h3>
                <p>
                  {dateFormat(e.starts_at)} · {timeFormat(e.starts_at)} ·{" "}
                  {e.holes} hoyos
                </p>
                <Button variant="outline" onClick={() => openProfile(p)}>
                  Ver perfil
                </Button>
              </article>
            )
          );
        })}
      </div>
      {!visibleEntries.length && (
        <Empty
          title="Sé el primero en salir al green"
          description="La disponibilidad vence automáticamente. Publica la tuya para que otros golfistas te encuentren."
        />
      )}
    </>
  );
}
