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
  Users,
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
    title: "Una buena vuelta.\nUna mejor conversación.",
    tag: "Sin prisas, con buena compañía",
    description:
      "Encuentra personas que también disfrutan el camino entre un golpe y otro.",
  },
  "Mejorar mi juego": {
    title: "Mismo objetivo.\nUn golpe mejor cada vez.",
    tag: "Aprender también se comparte",
    description:
      "Conecta con golfistas con quienes practicar y sigue tu progreso ronda a ronda.",
  },
  Competir: {
    title: "Un poco de reto.\nMucho de buen golf.",
    tag: "El siguiente reto es en equipo",
    description:
      "Encuentra compañeros que disfrutan medirse en el campo y guarda tu tarjeta al terminar.",
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
                Hay rondas que se recuerdan
                <br className="fw-desktop-break" /> por los golpes. Otras, por
                la gente.
              </p>
              <p>
                Encuentra compañeros, organiza tu próxima partida y comparte lo
                mejor de jugar.
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
              <span className="fw-outline-dot" /> MÁS ALLÁ DEL SCORE
            </div>
            <div className="fw-hero-image-copy">
              <span>Un buen plan empieza</span>
              <strong>en el primer tee.</strong>
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
                <span>EL MEJOR FLIGHT</span>
                <p>Es el que se comparte.</p>
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
            <span>EL JUEGO NOS CONECTA.</span>
            <span>Fotografía ilustrativa · Keith Tanner / Unsplash</span>
          </div>
        </section>

        <section
          className="fw-experience fw-section"
          id="fw-experience"
          aria-labelledby="fw-experience-heading"
        >
          <div className="fw-section-top" data-fw-reveal>
            <p className="fw-kicker">01 / UN NUEVO PUNTO DE ENCUENTRO</p>
            <span>Menos coordinar. Más jugar.</span>
          </div>
          <div className="fw-experience-intro" data-fw-reveal>
            <h2 id="fw-experience-heading">
              El campo es el mismo.
              <br />
              <em>La experiencia cambia.</em>
            </h2>
            <p>
              Una partida empieza mucho antes del primer tee. Conecta con
              personas que comparten tu ritmo y convierte las ganas de jugar en
              un plan.
            </p>
          </div>
          <div className="fw-feature-grid">
            <article data-fw-reveal>
              <span className="fw-feature-number">01</span>
              <Users size={29} strokeWidth={1.4} />
              <h3>
                Tu gente.
                <br />
                Tu ritmo.
              </h3>
              <p>
                Conoce golfistas según su estilo, club y disponibilidad. Hay
                espacio para una vuelta social y para un buen reto.
              </p>
              <button className="fw-text-link" onClick={onSignup}>
                Encuentra compañeros <ArrowUpRight size={18} />
              </button>
            </article>
            <article data-fw-reveal>
              <span className="fw-feature-number">02</span>
              <Flag size={29} strokeWidth={1.4} />
              <h3>
                Del “hay que jugar”
                <br />
                al primer tee.
              </h3>
              <p>
                Organiza una partida, reúne a tu flight y coordina los detalles
                en el chat de la party.
              </p>
              <button
                className="fw-text-link"
                onClick={() => scrollTo("fw-plan")}
              >
                Imagina tu próxima ronda <ArrowDownRight size={18} />
              </button>
            </article>
            <article data-fw-reveal>
              <span className="fw-feature-number">03</span>
              <svg
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 25h23M8 20v-7m7 7V9m7 11V4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="m5 10 8-5 7 1 6-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <h3>
                Cada ronda
                <br />
                cuenta tu historia.
              </h3>
              <p>
                Guarda tus tarjetas y consulta tus estadísticas. Recuerda ese
                birdie y sigue construyendo tu juego.
              </p>
              <button className="fw-text-link" onClick={onSignup}>
                Empieza tu historia <ArrowUpRight size={18} />
              </button>
            </article>
          </div>
        </section>

        <section
          className="fw-planner"
          id="fw-plan"
          aria-labelledby="fw-plan-heading"
        >
          <div className="fw-planner-inner">
            <div className="fw-planner-copy" data-fw-reveal>
              <p className="fw-kicker">02 / EL GOLF, A TU MANERA</p>
              <h2 id="fw-plan-heading">
                Hay una ronda
                <br />
                <em>para tu ritmo.</em>
              </h2>
              <p>
                Un sábado entero o nueve hoyos antes de volver. Haz la prueba:
                ¿cómo sería tu plan ideal?
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
                <legend>¿Qué te mueve?</legend>
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
                <legend>¿Cuándo te escapas al campo?</legend>
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
                  <Sun size={13} /> EL CAMPO TE ESPERA
                </span>
              </div>
              <div
                className="fw-plan-result"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="fw-preview-label">
                  TU PLAN IDEAL · {rhythm.toUpperCase()}
                </p>
                <h3>
                  {plan.title.split("\n").map((line, index) => (
                    <span key={index}>{line}</span>
                  ))}
                </h3>
                <div className="fw-result-chips">
                  <span>
                    <Flag size={13} /> {holes} hoyos
                  </span>
                  <span>
                    <Sun size={13} /> {time}
                  </span>
                </div>
                <p>{plan.description}</p>
              </div>
              <button
                className="fw-btn fw-btn-dark fw-preview-cta"
                onClick={onSignup}
              >
                Encuentra con quién jugar <ArrowUpRight size={18} />
              </button>
              <p className="fw-preview-disclaimer">
                Ejemplo interactivo. Las partidas reales aparecen al iniciar
                sesión.
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
            <p className="fw-kicker">03 / EMPIEZA CERCA</p>
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
                <span>BUENOS GOLPES.</span>
                <strong>Mejores historias.</strong>
              </div>
            </div>
            <div className="fw-local-copy" data-fw-reveal>
              <h2 id="fw-local-heading">
                Tu ciudad.
                <br />
                <em>Tu siguiente tee.</em>
              </h2>
              <p>
                El punto de encuentro es León. Explora los clubes del directorio
                y encuentra tu próxima conexión con el golf.
              </p>
              <div className="fw-club-list">
                {clubs.slice(0, 4).map((club, index) => (
                  <button key={club.id} onClick={onClubs}>
                    <span className="fw-club-index">0{index + 1}</span>
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
              <button className="fw-text-link" onClick={onClubs}>
                Ver todos los clubes <ArrowUpRight size={18} />
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
            <h2 id="fw-faq-heading">
              Lo que quizá
              <br />
              <em>te estás preguntando.</em>
            </h2>
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
            <p className="fw-kicker">TU PRÓXIMA BUENA COMPAÑÍA EMPIEZA AQUÍ</p>
            <h2 id="fw-finale-heading">
              Nos vemos
              <br />
              <em>en el primer tee.</em>
            </h2>
            <button className="fw-btn fw-btn-lime" onClick={onSignup}>
              Quiero ser parte <ArrowUpRight size={20} />
            </button>
            <span className="fw-finale-note">
              <ShieldCheck size={14} /> Con Google o correo. A tu ritmo.
            </span>
          </div>
        </section>
      </main>

      <footer className="fw-footer">
        <div className="fw-footer-top">
          <p>
            Más que una ronda.
            <br />
            <strong>Una comunidad.</strong>
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
            HECHO PARA JUGAR
            <br />
            EN COMPAÑÍA.
            <Flag size={28} strokeWidth={1.2} />
          </span>
        </div>
        <div className="fw-footer-wordmark" aria-hidden="true">
          fairway<span>.</span>
          <ArrowUpRight />
        </div>
        <div className="fw-footer-bottom">
          <span>FAIRWAY · LEÓN, GUANAJUATO</span>
          <span>GOLF, PERSONAS Y BUENAS HISTORIAS.</span>
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
