"use client";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Compass,
  Flag,
  Heart,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button, Modal, SectionHeading } from "./ui";
import type { Club, Profile } from "@/lib/domain";
import { accountFeatures } from "@/lib/access";

export function ClubDirectory({
  clubs,
  onPlayers,
  guest = false,
  live = true,
  profiles = [],
}: {
  clubs: Club[];
  onPlayers: (id: string) => void;
  guest?: boolean;
  live?: boolean;
  profiles?: Profile[];
}) {
  return (
    <>
      <SectionHeading
        eyebrow="EL PUNTO DE ENCUENTRO"
        title="El golf empieza cerca de ti."
        description="Explora los clubes de León y sus alrededores, sin necesidad de crear una cuenta."
      />
      {guest && (
        <div className="guest-directory-note">
          <ShieldCheck size={17} />
          <span>
            {live
              ? "Directorio público · Los perfiles de los jugadores requieren una cuenta."
              : "Catálogo de referencia · La sincronización del directorio está pendiente."}
          </span>
        </div>
      )}
      <div className="club-grid">
        {clubs.map((c, i) => (
          <article className="panel club-card" key={c.id}>
            <div
              className="club-photo"
              style={{
                backgroundImage: `url(https://images.unsplash.com/photo-${i === 1 ? "1593111774240-d529f12cf4bb" : "1535131749006-b7f58c99034b"}?w=900&auto=format&fit=crop)`,
              }}
            >
              <span className="badge">
                {c.verified ? "Datos verificados" : "Datos por confirmar"}
              </span>
            </div>
            <div className="club-content">
              <span className="eyebrow">{c.city}</span>
              <h2>{c.name}</h2>
              <p>
                {c.description ||
                  "Información del club pendiente de confirmar con su administración."}
              </p>
              {!guest && (
                <p className="muted">
                  {profiles.filter((p) => p.club_id === c.id).length} perfiles
                  visibles · Membresías declaradas
                </p>
              )}
              <Button variant="outline" onClick={() => onPlayers(c.id)}>
                {guest && <LockKeyhole size={14} />}Ver golfistas del club
                <ArrowUpRight size={15} />
              </Button>
              <details>
                <summary>Información de acceso</summary>
                <p>
                  {c.access_info ||
                    "Pendiente de confirmar. Contacta al club para autorización, tarifas y condiciones."}
                </p>
              </details>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
export function PublicPrivacy() {
  return (
    <>
      <SectionHeading
        eyebrow="TÚ DECIDES QUÉ COMPARTIR"
        title="Tu privacidad también juega."
        description="Conoce cómo se utilizan tus datos antes de formar parte de Fairway."
      />
      <div className="public-privacy-grid">
        {[
          [
            ShieldCheck,
            "Tus datos personales",
            "Tu correo no aparece en perfiles públicos. Fairway no muestra tu fecha de nacimiento completa ni tu ubicación GPS exacta.",
          ],
          [
            LockKeyhole,
            "Tú eliges la visibilidad",
            "Cada score puede ser privado, público en la comunidad o visible para seguidores aprobados. Los mensajes requieren match o participación confirmada.",
          ],
          [
            Users,
            "Una comunidad con respeto",
            "Puedes bloquear perfiles y reportar contenido. Las evaluaciones requieren una partida compartida y finalizada.",
          ],
          [
            Flag,
            "Tú controlas tu cuenta",
            "Desde Ajustes puedes cerrar sesión o solicitar la eliminación de tu cuenta. El borrado requiere contraseña y una confirmación nueva por correo.",
          ],
        ].map(([Icon, title, body]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <article className="panel" key={String(title)}>
              <I size={24} />
              <h3>{String(title)}</h3>
              <p>{String(body)}</p>
            </article>
          );
        })}
      </div>
      <div className="notice">
        Información de privacidad del producto en preparación. El operador debe
        completar su aviso de privacidad con sus datos y canal de atención para
        solicitudes ARCO antes del lanzamiento definitivo. Fairway es para
        mayores de 18 años.
      </div>
    </>
  );
}
export function GuestDiscover({
  onClubs,
  onAccount,
}: {
  onClubs: () => void;
  onAccount: () => void;
}) {
  return (
    <>
      <SectionHeading
        eyebrow="MEJOR GOLF. MEJOR COMPAÑÍA."
        title="Tu próximo foursome empieza aquí."
        description="Descubre cómo Fairway te ayuda a encontrar personas con quienes compartir el juego."
      />
      <section className="golf-hero guest-hero">
        <div className="hero-image" />
        <div className="hero-content">
          <span className="hero-eyebrow">TU COMUNIDAD DE GOLF EN LEÓN</span>
          <h2>
            Un buen swing se disfruta.
            <br />
            Una buena compañía se recuerda.
          </h2>
          <p>Conoce los clubes y, cuando estés listo, encuentra a tu grupo.</p>
          <button onClick={onClubs}>
            Explorar clubes
            <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
      <div className="guest-feature-grid">
        {[
          [
            Compass,
            "Encuentra tu ritmo",
            "Club, horarios, modalidad y estilo: la compatibilidad tiene razones claras.",
          ],
          [
            CalendarDays,
            "Organiza el encuentro",
            "Propón una fecha, completa el grupo y confirma el acceso con tu club.",
          ],
          [
            Flag,
            "Guarda cada ronda",
            "Registra tus golpes, consulta tus scores y descubre tu progreso.",
          ],
        ].map(([Icon, title, body]) => {
          const I = Icon as typeof Compass;
          return (
            <article className="panel" key={String(title)}>
              <I size={23} />
              <h3>{String(title)}</h3>
              <p>{String(body)}</p>
            </article>
          );
        })}
      </div>
      <div className="guest-join">
        <div>
          <span className="eyebrow">EL SIGUIENTE PASO LO DAS TÚ</span>
          <h2>Encuentra personas con quienes jugar.</h2>
          <p>
            Los perfiles, matches y mensajes están disponibles para miembros con
            cuenta.
          </p>
        </div>
        <Button onClick={onAccount}>
          Encontrar compañeros
          <Heart size={17} />
        </Button>
      </div>
    </>
  );
}
export function LockedPreview({
  feature,
  onAccount,
  onClubs,
}: {
  feature: string;
  onAccount: () => void;
  onClubs: () => void;
}) {
  const copy = accountFeatures[feature] || accountFeatures.perfil;
  return (
    <>
      <SectionHeading
        eyebrow="TU COMUNIDAD TE ESPERA"
        title={copy.title}
        description={copy.description}
      />
      <div className="locked-preview-art" aria-hidden="true">
        <div className="locked-preview-bar">
          <div />
          <div />
        </div>
        <div className="guest-feature-grid">
          {[0, 1, 2].map((i) => (
            <div className="panel locked-placeholder" key={i}>
              <div className="locked-avatar" />
              <div className="locked-line" />
              <div className="locked-line short" />
              <div className="locked-line" />
              <div className="locked-placeholder-bottom" />
            </div>
          ))}
        </div>
      </div>
      <div className="locked-page-cta">
        <LockKeyhole size={22} />
        <h3>Este espacio es para tu cuenta</h3>
        <p>Inicia sesión o crea una cuenta para continuar.</p>
        <div className="button-row">
          <Button onClick={onAccount}>
            Continuar
            <ArrowRight size={16} />
          </Button>
          <Button variant="outline" onClick={onClubs}>
            Explorar clubes
          </Button>
        </div>
      </div>
    </>
  );
}
export function AccountRequired({
  feature,
  onClose,
  onLogin,
  onSignup,
}: {
  feature: string;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
}) {
  const copy = accountFeatures[feature] || accountFeatures.perfil;
  return (
    <Modal title="Necesitas una cuenta" onClose={onClose} soft>
      <div className="account-gate">
        <span className="account-gate-icon">
          <LockKeyhole size={28} />
        </span>
        <h3>{copy.title}</h3>
        <p>{copy.description}</p>
        <div className="gate-benefits">
          <span>
            <ShieldCheck size={15} />
            Tus datos y conversaciones están protegidos
          </span>
          <span>
            <Users size={15} />
            Una comunidad para todos los niveles de golf
          </span>
        </div>
        <Button onClick={onLogin}>
          Iniciar sesión
          <ArrowRight size={17} />
        </Button>
        <Button variant="outline" onClick={onSignup}>
          Crear una cuenta
        </Button>
        <button className="text-button" onClick={onClose}>
          Seguir explorando
        </button>
      </div>
    </Modal>
  );
}
