"use client";

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
      <a href="#fw-main" className="fw-skip">
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
          <button className="fw-login" onClick={onLogin}>
            {signedIn ? "Mi perfil" : "Iniciar sesión"}{" "}
            <ArrowUpRight size={15} />
          </button>
          <button className="fw-btn fw-btn-dark fw-nav-cta" onClick={onSignup}>
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

      <main id="fw-main" className="fw-main">
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
              <button className="fw-btn fw-btn-dark" onClick={onSignup}>
                Encuentra tu foursome <ArrowUpRight size={19} />
              </button>
              <span className="fw-hero-note">
                Crea tu cuenta con Google o correo · 18+
              </span>
            </div>
          </div>
          <div className="fw-hero-image">
            <img
              src="/images/fairway-aerial.webp"
              width={2100}
              height={1300}
              fetchPriority="high"
              alt="Vista aérea de los fairways y lagos de un campo de golf. Fotografía ilustrativa."
            />
            <div className="fw-image-shade" />
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
          <div className="fw-section-top" data-fw-reveal>
            <p className="fw-kicker">ASÍ SE USA FAIRWAY</p>
            <span>El campo, la hora y quiénes van.</span>
          </div>
          <div className="fw-experience-intro" data-fw-reveal>
            <h2 id="fw-experience-heading">Organiza esa salida del sábado.</h2>
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
                      {value} hoyos {holes === value && <Check size={15} />}
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
              <div className="fw-course-art" aria-hidden="true">
                <svg
                  viewBox="0 0 460 250"
                  fill="none"
                  className="fw-course-svg"
                >
                  <path
                    className="fw-contour"
                    d="M-45 219C4 114 82 276 150 191S248 5 336 54s162 30 192-49M-47 194c68-100 120 56 183-24S251-21 341 25 476 54 527-5M-46 163c63-83 117 52 171-17S245-47 349-4M-20 246c79-77 127 52 194-47S284 34 356 88s119 24 151-20M1 272c73-61 128 49 190-45S285 67 357 119s116 35 152-22"
                    stroke="#c8d1ad"
                  />
                  <path
                    d="M86 189c-35-38 1-87 46-82 39 5 45-26 56-53 14-37 77-41 102-14s2 60 30 82c25 20 27 79-6 91-35 12-57-21-90-11-48 15-103 25-138-13Z"
                    fill="#b8c995"
                  />
                  <path
                    d="M118 182c-19-23-8-48 17-49 58-2 58-31 74-64 13-27 45-30 61-11 14 17-3 57 21 79 16 15 14 41-5 48-22 7-46-12-66-5-41 14-82 27-102 2Z"
                    fill="#7e9d60"
                  />
                  <path
                    d="M231 58c4-13 25-15 32-5 9 13-3 29-16 27-10-1-19-12-16-22Z"
                    fill="#e9e2bf"
                  />
                  <path
                    d="M142 184c9-5 20-3 22 4s-9 12-20 9-11-9-2-13Z"
                    fill="#ede4bf"
                  />
                  <path
                    key={`${holes}-${rhythm}-${time}`}
                    className="fw-shot-path"
                    d={
                      holes === 9
                        ? "M147 172Q148 101 250 65"
                        : "M147 172Q290 176 250 65"
                    }
                    pathLength="1"
                    stroke="#fffdf1"
                    strokeWidth="2"
                    strokeDasharray="0.025 0.02"
                  />
                  <circle cx="147" cy="172" r="6" fill="#fffdf1" />
                  <circle
                    cx="147"
                    cy="172"
                    r="11"
                    stroke="#fffdf1"
                    strokeOpacity=".5"
                  />
                  <path
                    d="M250 67V33l26 8-26 9"
                    stroke="#203d2d"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    fill="#203d2d"
                  />
                  <circle cx="250" cy="69" r="4" fill="#203d2d" />
                </svg>
                <div className="fw-hole-number">
                  {holes}
                  <span>HOYOS</span>
                </div>
                <span className="fw-map-tag">
                  <Sun size={13} /> PROPUESTA ILUSTRATIVA
                </span>
              </div>
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
                className="fw-btn fw-btn-dark fw-preview-cta"
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
              <img
                src="/images/fairway-landscape.webp"
                alt="Golfista terminando su swing en un campo. Imagen ilustrativa, no representa a un miembro de Fairway."
                width={2200}
                height={1467}
                loading="lazy"
              />
              <div>
                <span>LEÓN Y ALREDEDORES</span>
                <strong>¿Dónde juegas el domingo?</strong>
              </div>
            </div>
            <div className="fw-local-copy" data-fw-reveal>
              <h2 id="fw-local-heading">¿En qué campo sueles jugar?</h2>
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
            <span />
            <span />
            <span />
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
