"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Bookmark,
  MapPin,
  ChevronDown,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  compatibility,
  initialFilters,
  matchesFilters,
  type Filters,
  type Game,
  type Profile,
} from "@/lib/domain";
import type { FairwayData } from "@/lib/use-fairway";
import {
  DEFAULT_CITY,
  gameMatchesCity,
  matchesCity,
  normalizeCity,
} from "@/lib/cities";
import { gameIsUpcoming } from "@/lib/parties";
import { Button, Empty, InlineLink, SectionHeading } from "./ui";
import { CityFilter } from "./city-field";
import { CourseIcon } from "./course-icon";
import { ProfileCard } from "./profile-card";
import { GameCard } from "./game-card";
import { CommunityInvite } from "./community-invite";
import { DiscoveryEmpty } from "./discovery-empty";
const SwipeDeck = dynamic(
  () => import("./swipe-deck").then((m) => m.SwipeDeck),
  {
    loading: () => (
      <div className="deferred-deck" role="status">
        Cargando golfistas…
      </div>
    ),
  },
);

export function Discovery({
  data,
  filters,
  cityScope,
  onCityScopeChange,
  onFilters,
  onResetFilters,
  onProfile,
  onGame,
  onCreate,
  onShareProfile,
  onSetup,
  onNavigate,
  onCompatibility,
  compact = false,
}: {
  data: FairwayData;
  filters: Filters;
  cityScope: string;
  onCityScopeChange: (scope: string) => void;
  onFilters: () => void;
  onResetFilters: () => void;
  onProfile: (profile: Profile) => void;
  onGame: (game: Game) => void;
  onCreate: () => void;
  onShareProfile: () => void;
  onSetup: () => void;
  onNavigate: (page: string) => void;
  onCompatibility: () => void;
  compact?: boolean;
}) {
  const [tab, setTab] = useState("Para ti");
  const [search, setSearch] = useState("");
  const ownCity = normalizeCity(data.me.city || DEFAULT_CITY);
  const exploringCity = cityScope === "mine" ? ownCity : cityScope;
  const clubName = (id: string | null) =>
    data.clubs.find((c) => c.id === id)?.name || "Sin club";
  const visible = useMemo(
    () =>
      data.profiles
        .filter(
          (p) =>
            (tab === "Favoritos" || !data.decided.includes(p.id)) &&
            (tab === "Favoritos" || matchesCity(p.city, cityScope, ownCity)) &&
            matchesFilters(p, filters, data.me) &&
            p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
            (tab !== "Favoritos" || data.favorites.includes(p.id)),
        )
        .sort(
          (a, b) =>
            compatibility(data.me, b).score - compatibility(data.me, a).score,
        ),
    [
      data.profiles,
      data.decided,
      data.me,
      data.favorites,
      filters,
      search,
      tab,
      cityScope,
      ownCity,
    ],
  );
  const activeFilterCount = Object.keys(filters).filter(
    (k) => filters[k as keyof Filters] !== initialFilters[k as keyof Filters],
  ).length;
  const upcomingGames = data.games
    .filter(
      (g) =>
        g.status === "open" &&
        gameIsUpcoming(g) &&
        gameMatchesCity(g, data.clubs, cityScope, ownCity),
    )
    .slice(0, 2);
  const cityPicker = (
    <CityFilter
      scope={cityScope}
      ownCity={ownCity}
      cities={[
        ...data.clubs.map((c) => c.city),
        ...data.profiles.map((p) => p.city),
      ]}
      onChange={onCityScopeChange}
    />
  );
  return (
    <>
      {data.user && data.me.availability.length === 0 && (
        <section
          className="first-round-reminder"
          aria-label="Prepara tu primera ronda"
        >
          <div>
            <h2>Tu primera ronda empieza aquí</h2>
            <p>Elige cuándo y dónde juegas para encontrar compañía.</p>
          </div>
          <Button onClick={onSetup}>Preparar mi primera ronda</Button>
        </section>
      )}
      {compact ? (
        <div className="native-discover-head">
          <h1 className="native-discover-title">
            Golfistas <em>para ti</em>
          </h1>
          <div className="tabs native-discover-tabs">
            <button
              onClick={() => setTab("Para ti")}
              className={tab === "Para ti" ? "active" : ""}
              aria-pressed={tab === "Para ti"}
            >
              Para ti<span>{visible.length}</span>
            </button>
            <button
              onClick={() => setTab("Favoritos")}
              className={tab === "Favoritos" ? "active" : ""}
              aria-pressed={tab === "Favoritos"}
            >
              Favoritos
              <Bookmark size={13} />
            </button>
            <button
              onClick={() => {
                onNavigate("mensajes");
              }}
            >
              Mis matches
            </button>
          </div>
          <div className="native-discover-tools">
            <label className="search-input">
              <Search size={16} />
              <input
                aria-label="Buscar golfista"
                type="search"
                placeholder="Buscar golfista"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <details className="native-filter-disclosure native-city-chip">
              <summary
                aria-label={`Ciudad: ${cityScope === "any" ? "Todas las ciudades" : exploringCity}. Cambiar`}
              >
                <MapPin size={16} aria-hidden="true" />
                <span>{cityScope === "any" ? "Todas" : exploringCity}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </summary>
              {cityPicker}
            </details>
            <Button
              variant="outline"
              className="native-filters-button"
              aria-label={
                activeFilterCount > 0
                  ? `Filtros, ${activeFilterCount} activos`
                  : "Filtros"
              }
              onClick={() => {
                onFilters();
              }}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              {activeFilterCount > 0 && (
                <span className="filter-count">{activeFilterCount}</span>
              )}
            </Button>
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {visible.length} golfistas encontrados.
          </p>
        </div>
      ) : (
        <>
          <SectionHeading
            eyebrow="MEJOR GOLF. MEJOR COMPAÑÍA."
            title="Encuentra tu próximo foursome."
            description="Filtra por club, handicap y días disponibles para encontrar con quién jugar."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  onFilters();
                }}
              >
                <SlidersHorizontal size={16} />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="filter-count">{activeFilterCount}</span>
                )}
              </Button>
            }
          />
          <div className="city-explore-filter">{cityPicker}</div>
          <div className="discover-toolbar">
            <div className="tabs">
              <button
                onClick={() => setTab("Para ti")}
                className={tab === "Para ti" ? "active" : ""}
                aria-pressed={tab === "Para ti"}
              >
                Para ti<span>{visible.length}</span>
              </button>
              <button
                onClick={() => setTab("Favoritos")}
                className={tab === "Favoritos" ? "active" : ""}
                aria-pressed={tab === "Favoritos"}
              >
                Favoritos
                <Bookmark size={13} />
              </button>
              <button
                onClick={() => {
                  onNavigate("mensajes");
                }}
              >
                Mis matches
              </button>
            </div>
            <label className="search-input">
              <Search size={16} />
              <input
                aria-label="Buscar golfista"
                type="search"
                placeholder="Buscar golfista"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="discovery-subline">
            <p aria-live="polite" aria-atomic="true">
              <span className="sr-only">
                {visible.length} golfistas encontrados.{" "}
              </span>
              <span className="live-dot" />
              {tab === "Favoritos"
                ? "Tus compañeros guardados"
                : "Personas con las que vale la pena compartir 18 hoyos"}
            </p>
            <span>
              Ordenados por compatibilidad
              <ChevronDown size={13} />
            </span>
          </div>
        </>
      )}
      {tab === "Para ti" ? (
        <SwipeDeck
          key={`${data.user?.id || "demo"}:${cityScope}:${search}:${JSON.stringify(filters)}`}
          profiles={visible}
          onDecide={data.decide}
          renderCard={(p, actions) => (
            <ProfileCard
              profile={p}
              me={data.me}
              club={clubName(p.club_id)}
              favorite={data.favorites.includes(p.id)}
              onOpen={() => onProfile(p)}
              onLike={actions.onLike}
              onPass={actions.onPass}
              onFavorite={() => void data.favorite(p.id)}
              disabled={actions.busy}
            />
          )}
          empty={
            <DiscoveryEmpty
              hasProfiles={data.profiles.length > 0}
              exhausted={
                data.profiles.length > 0 &&
                data.profiles.every((p) => data.decided.includes(p.id))
              }
              onReset={() => {
                onResetFilters();
                setSearch("");
                onCityScopeChange("any");
              }}
              onCreate={onCreate}
              onShareProfile={data.user ? onShareProfile : undefined}
            />
          }
        />
      ) : (
        <div className="profile-grid">
          {visible.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              me={data.me}
              club={clubName(p.club_id)}
              favorite={data.favorites.includes(p.id)}
              onOpen={() => onProfile(p)}
              onLike={() => void data.decide(p.id, "like")}
              onPass={() => void data.decide(p.id, "pass")}
              onFavorite={() => void data.favorite(p.id)}
            />
          ))}
        </div>
      )}
      {tab === "Favoritos" && visible.length === 0 && (
        <Empty
          title="Tu próximo compañero favorito está por llegar"
          description="Guarda perfiles para encontrarlos aquí."
        />
      )}
      <div className="discovery-footnote">
        <ShieldCheck size={14} />
        <span>
          La compatibilidad se basa en club, disponibilidad, modalidad, handicap
          y estilo de juego.
        </span>
        <button onClick={() => onCompatibility()}>¿Cómo funciona?</button>
      </div>
      <section className="golf-hero discovery-party-promo">
        <div className="hero-image" />
        <div className="hero-content">
          <span className="hero-eyebrow">
            <span className="live-dot" />
            PARTIDAS ENTRE GOLFISTAS
            {cityScope !== "any" ? ` · ${exploringCity}` : ""}
          </span>
          <h2>
            ¿Te falta alguien
            <br />
            para completar el grupo?
          </h2>
          <p>Consulta las partidas y acuerda el horario en el chat.</p>
          <button onClick={() => onNavigate("partidas")}>
            Explorar partidas
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="hero-stamp">
          <CourseIcon part="fairway" size={26} />
          <span>
            GOOD GOLF.
            <br />
            GREAT COMPANY.
          </span>
        </div>
      </section>
      <div className="next-section-heading">
        <div>
          <span className="eyebrow">HAZ ESPACIO EN TU AGENDA</span>
          <h2>El green te está esperando</h2>
        </div>
        <InlineLink onClick={() => onNavigate("partidas")}>
          Ver todas las partidas
        </InlineLink>
      </div>
      <div className="game-grid">
        {upcomingGames.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            club={clubName(g.club_id)}
            onOpen={() => {
              onGame(g);
            }}
          />
        ))}
      </div>
      {!upcomingGames.length && (
        <Empty
          title="Sé quien proponga la próxima ronda"
          description="Todavía no hay partidas abiertas con esta selección de ciudad. Publica un plan e invita a tu grupo."
          action={
            <div className="empty-actions">
              <Button onClick={onCreate}>Crear una partida</Button>
              <CommunityInvite />
            </div>
          }
        />
      )}
    </>
  );
}
