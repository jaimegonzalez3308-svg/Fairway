"use client";
import { CoursePhoto } from "./course-photo";
import { CourseContours, GolfBallTee, PuttingFlag } from "./landing-golf-decor";
import { LegalLinks } from "./legal-links";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Flag,
  MapPin,
  Menu,
  Plus,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import type { Club } from "@/lib/domain";
import { AccessibilityToggle } from "./accessibility-mode";
import { CourseGuide } from "./course-guide";

type Props = {
  onSignup: () => void;
  onLogin: () => void;
  onClubs: () => void;
  onPrivacy: () => void;
  clubs: Club[];
  liveDirectory: boolean;
  signedIn?: boolean;
};

const rhythms = ["Social", "Mejorar mi juego", "Competir"] as const;
const plans = {
  Social: {
    title: "Falta uno en el flight de Fer.",
    club: "El Molino Golf Club",
    description:
      "Van Fer, Ana y Mau. Quieren jugar sin presión por el score y ponerse al día entre hoyos.",
  },
  "Mejorar mi juego": {
    title: "Mau busca con quién practicar.",
    club: "Club de Golf Los Naranjos",
    description:
      "La idea es anotar todos los golpes y guardar la tarjeta para revisar qué salió bien y qué toca practicar.",
  },
  Competir: {
    title: "Ana propone jugar por golpes.",
    club: "El Molino Golf Club",
    description:
      "Se ponen de acuerdo en el formato antes de salir y comparan las tarjetas al terminar la vuelta.",
  },
};

function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`fw-wordmark${light ? " fw-wordmark-light" : ""}`}>
      <Flag size={25} strokeWidth={1.5} aria-hidden="true" />
      fairway<span>.</span>
    </span>
  );
}

export function LandingPage({
  onSignup,
  onLogin,
  onClubs,
  onPrivacy,
  clubs,
  liveDirectory,
  signedIn = false,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [holes, setHoles] = useState<9 | 18>(18);
  const [rhythm, setRhythm] = useState<(typeof rhythms)[number]>("Social");
  const [time, setTime] = useState("Fin de semana");
  const plan = plans[rhythm];

  useEffect(() => {
    const element = root.current;
    if (!element || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fw-in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    const reveal = () => {
      if (preference.matches) {
        element.classList.remove("fw-reveal-ready");
      } else {
        element.classList.add("fw-reveal-ready");
        element
          .querySelectorAll("[data-fw-reveal]")
          .forEach((item) => observer.observe(item));
      }
    };
    reveal();
    preference.addEventListener("change", reveal);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", reveal);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        root.current
          ?.querySelector<HTMLButtonElement>(".fw-menu-toggle")
          ?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  function scrollTo(id: string) {
    setMenuOpen(false);
    root.current?.querySelector<HTMLElement>(`#${id}`)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }

  return (
    <div className="fw-landing" ref={root}>
      <a
        href="#fw-main"
        className="fw-skip"
        onClick={(event) => {
          event.preventDefault();
          root.current?.querySelector<HTMLElement>("#fw-main")?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header className="fw-header">
        <a
          href="#inicio"
          className="fw-home-link"
          aria-label="Fairway, inicio"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          <Brand />
        </a>
        <nav className="fw-desktop-nav" aria-label="Navegación principal">
          <button onClick={() => scrollTo("fw-experience")}>
            La experiencia
          </button>
          <button onClick={() => scrollTo("fw-plan")}>Tu próxima ronda</button>
          <button onClick={() => scrollTo("fw-clubs")}>Los clubes</button>
        </nav>
        <div className="fw-header-actions">
          <AccessibilityToggle compact className="accessibility-desktop" />
          <button className="fw-login" onClick={onLogin}>
            {signedIn ? "Mi perfil" : "Iniciar sesión"}{" "}
            <ArrowUpRight size={15} />
          </button>
          <button className="fw-btn fw-btn-blue fw-nav-cta" onClick={onSignup}>
            {signedIn ? "Ir a Fairway" : "Ser parte"} <ArrowUpRight size={16} />
          </button>
          <button
            className="fw-menu-toggle"
            aria-label={menuOpen ? "Cerrar navegación" : "Abrir navegación"}
            aria-expanded={menuOpen}
            aria-controls="fw-mobile-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav
            className="fw-mobile-nav"
            id="fw-mobile-nav"
            aria-label="Navegación móvil"
          >
            <AccessibilityToggle />
            <button onClick={() => scrollTo("fw-experience")}>
              La experiencia <ArrowDownRight size={18} />
            </button>
            <button onClick={() => scrollTo("fw-plan")}>
              Tu próxima ronda <ArrowDownRight size={18} />
            </button>
            <button onClick={() => scrollTo("fw-clubs")}>
              Los clubes <ArrowDownRight size={18} />
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onLogin();
              }}
            >
              {signedIn ? "Mi perfil" : "Iniciar sesión"}{" "}
              <ArrowUpRight size={18} />
            </button>
            <button
              className="fw-btn fw-btn-dark"
              onClick={() => {
                setMenuOpen(false);
                onSignup();
              }}
            >
              {signedIn ? "Ir a Fairway" : "Crear mi cuenta"}{" "}
              <ArrowRight size={18} />
            </button>
          </nav>
        )}
      </header>

      <main id="fw-main" className="fw-main" tabIndex={-1}>
        <section className="fw-hero" aria-labelledby="fw-headline">
          <div className="fw-hero-intro">
            <div className="fw-hero-heading">
              <p className="fw-kicker">
                <span className="fw-small-dot" /> TU COMUNIDAD DE GOLF EN LEÓN
              </p>
              <h1 id="fw-headline">
                Buen golf.
                <br />
                <em>Mejor compañía.</em>
              </h1>
            </div>
            <div className="fw-hero-copy">
              <p>
                ¿Tus amigos no pueden el sábado? Busca a alguien en León para
                completar el flight.
              </p>
              <p>
                Escoge el campo, acuerda la hora y reúne al grupo en el chat de
                la partida.
              </p>
              <button
                className="fw-btn fw-btn-blue fw-btn-round-arrow"
                onClick={onSignup}
              >
                Buscar golfistas en León
                <span className="fw-arrow-ring" aria-hidden="true">
                  <ArrowUpRight size={19} />
                </span>
              </button>
              <span className="fw-hero-note">
                Crea tu cuenta con Google o correo · 18+
              </span>
            </div>
          </div>
          <div className="fw-hero-image">
            <CoursePhoto
              priority
              alt="Vista aérea de los fairways y lagos de un campo de golf. Fotografía ilustrativa."
            />
            <div className="fw-image-shade" />
            <GolfBallTee />
            <div className="fw-image-caption">
              <span className="fw-outline-dot" /> LEÓN, GUANAJUATO
            </div>
            <div className="fw-hero-image-copy">
              <span>PARA ESTE FIN DE SEMANA</span>
              <strong>¿Quién se apunta?</strong>
            </div>
            <button
              className="fw-explore-orb"
              onClick={() => scrollTo("fw-experience")}
              aria-label="Explorar la experiencia Fairway"
            >
              <ArrowDown size={23} />
            </button>
            <div className="fw-hero-ticket">
              <span className="fw-ticket-icon">
                <Flag size={24} strokeWidth={1.4} />
              </span>
              <div>
                <span>PRUEBA EL PLANIFICADOR</span>
                <p>Elige 9 o 18 hoyos.</p>
              </div>
              <button
                onClick={() => scrollTo("fw-plan")}
                aria-label="Explorar mi próxima ronda"
              >
                <ArrowUpRight size={24} />
              </button>
            </div>
          </div>
          <div className="fw-photo-credit">
            <span>EMPEZAMOS EN LEÓN Y ALREDEDORES.</span>
            <span>Fotografía ilustrativa · Keith Tanner / Unsplash</span>
          </div>
        </section>

        <section
          className="fw-experience fw-section"
          id="fw-experience"
          aria-labelledby="fw-experience-heading"
        >
          <CourseContours className="fw-experience-contours" />
          <div className="fw-section-top" data-fw-reveal>
            <p className="fw-kicker">ASÍ SE USA FAIRWAY</p>
            <span>El campo, la hora y quiénes van.</span>
          </div>
          <div className="fw-experience-intro" data-fw-reveal>
            <h2 id="fw-experience-heading" className="fw-sport-heading">
              Organiza esa salida del{" "}
              <span className="fw-sport-mark">sábado.</span>
            </h2>
            <p>
              Pon el campo, los hoyos y la hora. Quien se apunte verá los
              detalles y tendrá el chat de la partida a la mano.
            </p>
          </div>
          <div className="fw-club-board">
            <aside
              className="fw-round-note"
              data-fw-reveal
              aria-label="Mensaje y tarjeta de ejemplo"
            >
              <header>
                <span className="fw-pencil-mark" aria-hidden="true" /> UN
                MENSAJE PODRÍA EMPEZAR ASÍ
              </header>
              <p className="fw-note-author">
                Fer <span>· León</span>
              </p>
              <blockquote>
                “Sábado, 7:30, 18 hoyos en El Molino. Vamos Ana, Mau y yo; falta
                uno. ¿Te apuntas?”
              </blockquote>
              <p className="fw-note-postscript">
                Y si al salir se arma una guacamaya, mejor.
              </p>
              <small>Escena de ejemplo: nombres y partida ficticios.</small>
              <table className="fw-scorecard">
                <caption>Tu próxima tarjeta, por llenar</caption>
                <thead>
                  <tr>
                    <th scope="col">HOYO</th>
                    {Array.from({ length: 9 }, (_, i) => (
                      <th scope="col" key={i}>
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">SCORE</th>
                    {Array.from({ length: 9 }, (_, i) => (
                      <td key={i}>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Sin anotar</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </aside>
            <div className="fw-feature-list" data-fw-reveal>
              <article>
                <h3>Encuentra al cuarto jugador.</h3>
                <p>
                  Busca compañeros por club, estilo y disponibilidad. Revisa sus
                  perfiles antes de proponer una salida.
                </p>
                <button className="fw-plain-button" onClick={onSignup}>
                  Buscar compañeros
                </button>
              </article>
              <article>
                <h3>Pon fecha y campo.</h3>
                <p>
                  Crea la partida con sus detalles. Las personas que se
                  confirmen podrán coordinarse contigo en el chat del grupo.
                </p>
                <button
                  className="fw-plain-button"
                  onClick={() => scrollTo("fw-plan")}
                >
                  Probar el planificador
                </button>
              </article>
              <article>
                <h3>Anota los golpes al terminar.</h3>
                <p>
                  Guarda la tarjeta y revisa tus estadísticas. Así puedes
                  comparar esa vuelta con la del domingo pasado.
                </p>
                <button className="fw-plain-button" onClick={onSignup}>
                  Crear mi perfil
                </button>
              </article>
            </div>
          </div>
        </section>

        <section
          className="fw-planner"
          id="fw-plan"
          aria-labelledby="fw-plan-heading"
        >
          <div className="fw-planner-inner">
            <div className="fw-planner-copy" data-fw-reveal>
              <p className="fw-kicker">ARMA UN PLAN</p>
              <h2 id="fw-plan-heading">
                Dinos cuántos hoyos
                <br />y cuándo puedes.
              </h2>
              <p>
                Elige una opción y mira cómo cambia una propuesta. Cuando
                entres, podrás buscar partidas reales.
              </p>
              <fieldset className="fw-choice-group">
                <legend>¿Cuántos hoyos?</legend>
                <div>
                  {([9, 18] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={holes === value}
                      className={holes === value ? "fw-choice-active" : ""}
                      onClick={() => setHoles(value)}
                    >
                      {value} hoyos <Check size={15} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="fw-choice-group">
                <legend>¿Cómo quieres jugar?</legend>
                <div>
                  {rhythms.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={rhythm === value}
                      className={rhythm === value ? "fw-choice-active" : ""}
                      onClick={() => setRhythm(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="fw-choice-group">
                <legend>¿Cuándo puedes?</legend>
                <div>
                  {["Entre semana", "Fin de semana"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={time === value}
                      className={time === value ? "fw-choice-active" : ""}
                      onClick={() => setTime(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="fw-plan-preview" data-fw-reveal>
              <div className="fw-preview-top">
                <Brand />
                <span>VISTA DE EJEMPLO</span>
              </div>
              <CourseGuide
                holes={holes}
                routeKey={`${holes}-${rhythm}-${time}`}
              />
              <div
                className="fw-plan-result"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="fw-preview-label">
                  PARTIDA DE EJEMPLO · {rhythm.toUpperCase()}
                </p>
                <h3>{plan.title}</h3>
                <p className="fw-proposal-course">
                  <MapPin size={13} /> {plan.club}
                </p>
                <div className="fw-result-chips">
                  <span>
                    <Flag size={13} /> {holes} hoyos
                  </span>
                  <span>
                    <Sun size={13} />{" "}
                    {time === "Fin de semana"
                      ? "Sábado · 7:30"
                      : "Miércoles · 8:00"}
                  </span>
                </div>
                <p>{plan.description}</p>
              </div>
              <button
                className="fw-btn fw-btn-blue fw-preview-cta"
                onClick={onSignup}
              >
                Buscar partidas reales <ArrowUpRight size={18} />
              </button>
              <p className="fw-preview-disclaimer">
                Nombres, horarios y partidas ficticios. El acceso al campo se
                confirma con el club.
              </p>
            </div>
          </div>
        </section>

        <section
          className="fw-local fw-section"
          id="fw-clubs"
          aria-labelledby="fw-local-heading"
        >
          <div className="fw-section-top" data-fw-reveal>
            <p className="fw-kicker">CAMPOS DEL DIRECTORIO</p>
            <span>
              <MapPin size={14} /> León, Guanajuato y alrededores
            </span>
          </div>
          <div className="fw-local-grid">
            <div className="fw-local-photo" data-fw-reveal>
              <CoursePhoto alt="Vista aérea de un campo de golf. Imagen ilustrativa, no representa un club de León." />
              <div>
                <span>LEÓN Y ALREDEDORES</span>
                <strong>¿Dónde juegas el domingo?</strong>
              </div>
            </div>
            <div className="fw-local-copy" data-fw-reveal>
              <h2 id="fw-local-heading" className="fw-sport-heading">
                ¿En qué <span className="fw-sport-mark">campo</span> sueles
                jugar?
              </h2>
              <p>
                El Molino y Los Naranjos ya están en el directorio. Revisa la
                información y confirma con el club cómo puedes jugar ahí.
              </p>
              <div className="fw-club-list">
                {clubs.slice(0, 4).map((club) => (
                  <button key={club.id} onClick={onClubs}>
                    <span>
                      <strong>{club.name}</strong>
                      <small>{club.city}</small>
                    </span>
                    <ArrowUpRight size={20} />
                  </button>
                ))}
                {!clubs.length && (
                  <button onClick={onClubs}>
                    <MapPin size={19} />
                    <span>
                      <strong>Explora el directorio de clubes</strong>
                      <small>León y alrededores</small>
                    </span>
                    <ArrowUpRight size={20} />
                  </button>
                )}
              </div>
              <div className="fw-directory-note">
                <span>
                  {liveDirectory
                    ? "DIRECTORIO DE FAIRWAY"
                    : "CATÁLOGO DE REFERENCIA"}
                </span>
                <p>
                  La membresía y el acceso a cada campo se confirman
                  directamente con el club.
                </p>
              </div>
              <button className="fw-plain-button" onClick={onClubs}>
                Ver el directorio completo
              </button>
            </div>
          </div>
        </section>

        <section
          className="fw-questions fw-section"
          aria-labelledby="fw-faq-heading"
        >
          <div data-fw-reveal>
            <p className="fw-kicker">ANTES DE TU PRIMERA RONDA</p>
            <h2 id="fw-faq-heading">Antes de registrarte</h2>
          </div>
          <div className="fw-faq-list" data-fw-reveal>
            {[
              [
                "¿Necesito un handicap para ser parte?",
                "No. Puedes crear tu perfil sin handicap y encontrar compañeros según tu estilo y disponibilidad. Fairway permite conectar tanto a principiantes como a jugadores con más experiencia.",
              ],
              [
                "¿Fairway reserva mi salida en el campo?",
                "Fairway te ayuda a encontrar compañeros y organizar la partida. La reservación, las tarifas y el acceso al campo se acuerdan directamente con el club.",
              ],
              [
                "¿Puedo entrar con mi cuenta de Google?",
                "Sí. Elige Continuar con Google al crear tu cuenta o iniciar sesión. En tu primer acceso completarás tu nombre, edad y aceptación de privacidad. Fairway es para mayores de 18 años.",
              ],
              [
                "¿Quién puede ver mi información?",
                "Tu correo no se publica. Tú eliges la visibilidad de tu perfil y de tus scores. Los chats están limitados a las personas que participan en la conversación. También puedes bloquear y reportar perfiles.",
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={19} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="fw-finale" aria-labelledby="fw-finale-heading">
          <div className="fw-finale-art" aria-hidden="true">
            <PuttingFlag />
            <CourseContours className="fw-finale-contours" />
          </div>
          <div className="fw-finale-inner" data-fw-reveal>
            <p className="fw-kicker">FAIRWAY EN LEÓN</p>
            <h2 id="fw-finale-heading">¿Jugamos el sábado?</h2>
            <button className="fw-btn fw-btn-pencil" onClick={onSignup}>
              Crear mi perfil <ArrowUpRight size={20} />
            </button>
            <span className="fw-finale-note">
              <ShieldCheck size={14} /> Accede con Google o correo y completa tu
              perfil.
            </span>
          </div>
        </section>
      </main>

      <footer className="fw-footer">
        <div className="fw-footer-top">
          <p>
            Golfistas de León
            <br />
            que quieren jugar.
          </p>
          <nav aria-label="Enlaces del pie de página">
            <AccessibilityToggle />
            <button onClick={onClubs}>
              Directorio de clubes <ArrowUpRight size={15} />
            </button>
            <button onClick={onPrivacy}>
              Privacidad <ArrowUpRight size={15} />
            </button>
            <button onClick={onLogin}>
              Iniciar sesión <ArrowUpRight size={15} />
            </button>
          </nav>
          <span>
            BUSCA UNA PARTIDA
            <br />
            PARA ESTA SEMANA.
            <Flag size={28} strokeWidth={1.2} />
          </span>
        </div>
        <div className="fw-footer-wordmark" aria-hidden="true">
          fairway<span>.</span>
          <ArrowUpRight />
        </div>
        <LegalLinks />
        <div className="fw-footer-bottom">
          <span>FAIRWAY · LEÓN, GUANAJUATO</span>
          <span>PARA MAYORES DE 18 AÑOS</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
          >
            VOLVER ARRIBA <ArrowUpRight size={13} />
          </button>
        </div>
      </footer>
    </div>
  );
}
