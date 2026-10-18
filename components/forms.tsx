"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail,
  ArrowRight,
  Upload,
  ShieldCheck,
  Users,
  Check,
  CalendarDays,
} from "lucide-react";
import { Button, Field } from "./ui";
import { supabase, signInWithGoogle } from "@/lib/supabase";
import { days, profileSchema, type Profile, type Game } from "@/lib/domain";
import type { FairwayData } from "@/lib/use-fairway";
import { authErrorMessage, authRedirectUrl } from "@/lib/auth";
import { golfDate, golfDateAfter } from "@/lib/parties";
import { PasswordResetRequest } from "./password-recovery";
import { StarRatingInput } from "./player-rating";
import { canRatePlayer, ratingColumns } from "@/lib/ratings";
import { CityField } from "./city-field";
import { DEFAULT_CITY } from "@/lib/cities";
const authSchema = z.object({
  email: z.string().trim().pipe(z.email("Escribe un correo válido.")),
  password: z.string().min(1, "Escribe tu contraseña."),
});
export function AuthForm({
  data,
  onDone,
  initialMessage = "",
  initialMode = "login",
}: {
  data: FairwayData;
  onDone: () => void;
  initialMessage?: string;
  initialMode?: "login" | "signup";
}) {
  const [signup, setSignup] = useState(initialMode === "signup"),
    [busy, setBusy] = useState(false),
    [googleBusy, setGoogleBusy] = useState(false),
    [message, setMessage] = useState(initialMessage),
    [resendBusy, setResendBusy] = useState(false),
    [recovering, setRecovering] = useState(false),
    [resendWait, setResendWait] = useState(0);
  const [city, setCity] = useState(DEFAULT_CITY);
  useEffect(() => {
    if (resendWait <= 0) return;
    const timer = setTimeout(() => setResendWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendWait]);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
  });
  if (recovering)
    return (
      <PasswordResetRequest
        initialEmail={getValues("email")}
        onBack={() => setRecovering(false)}
      />
    );
  return (
    <>
      <p className="form-intro">
        Tu próxima buena compañía empieza aquí. Exclusivo para mayores de 18
        años.
      </p>
      {!supabase && (
        <div className="notice">
          La conexión aún no está configurada. Consulta el README para activar
          Supabase.
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="google-signin"
        disabled={!supabase || busy || resendBusy || googleBusy}
        onClick={async () => {
          if (!supabase || googleBusy) return;
          setGoogleBusy(true);
          setMessage("");
          try {
            const { error } = await signInWithGoogle(
              authRedirectUrl(
                window.location.origin,
                false,
                window.location.search,
              ),
            );
            if (error) throw error;
          } catch (error) {
            setMessage(
              authErrorMessage(error as { code?: string; message?: string }),
            );
          } finally {
            setGoogleBusy(false);
          }
        }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24.8v7.42h10.54a9 9 0 0 1-3.91 5.91v4.91h6.34c3.71-3.42 5.84-8.46 5.84-14.32Z"
          />
          <path
            fill="#34A853"
            d="M24.8 43.6c5.3 0 9.74-1.76 12.98-4.82l-6.34-4.91c-1.76 1.18-4.01 1.89-6.64 1.89-5.1 0-9.42-3.44-10.96-8.07H7.3v5.06A19.6 19.6 0 0 0 24.8 43.6Z"
          />
          <path
            fill="#FBBC05"
            d="M13.84 27.69a11.76 11.76 0 0 1 0-7.38v-5.06H7.3a19.6 19.6 0 0 0 0 17.5l6.54-5.06Z"
          />
          <path
            fill="#EA4335"
            d="M24.8 12.24c2.88 0 5.45.99 7.49 2.94l5.62-5.62A18.8 18.8 0 0 0 24.8 4.4 19.6 19.6 0 0 0 7.3 15.25l6.54 5.06c1.54-4.63 5.86-8.07 10.96-8.07Z"
          />
        </svg>
        {googleBusy ? "Conectando con Google…" : "Continuar con Google"}
      </Button>
      <div className="auth-divider">
        <span>o usa tu correo</span>
      </div>
      <form
        className="form"
        onSubmit={handleSubmit(async (values) => {
          if (!supabase) return;
          setBusy(true);
          setMessage("");
          const form = document.getElementById("auth-form") as HTMLFormElement;
          const fd = new FormData(form);
          const age = Number(fd.get("age"));
          const parsedCity = profileSchema.shape.city.safeParse(city);
          if (signup && !parsedCity.success) {
            setMessage(parsedCity.error.issues[0].message);
            setBusy(false);
            return;
          }
          if (signup && (!Number.isInteger(age) || age < 18 || age > 100)) {
            setMessage("Debes tener entre 18 y 100 años.");
            setBusy(false);
            return;
          }
          if (signup && values.password.length < 10) {
            setMessage("Usa al menos 10 caracteres en tu contraseña.");
            setBusy(false);
            return;
          }
          try {
            const result = signup
              ? await supabase.auth.signUp({
                  ...values,
                  options: {
                    data: {
                      name: fd.get("name"),
                      age,
                      signup_city: parsedCity.success
                        ? parsedCity.data
                        : DEFAULT_CITY,
                    },
                    emailRedirectTo: authRedirectUrl(
                      window.location.origin,
                      false,
                      window.location.search,
                    ),
                  },
                })
              : await supabase.auth.signInWithPassword(values);
            setBusy(false);
            if (result.error) setMessage(authErrorMessage(result.error));
            else if (signup && !result.data.session)
              setMessage(
                "Revisa tu correo y confirma tu cuenta antes de iniciar sesión.",
              );
            else {
              data.notify(
                signup
                  ? "Cuenta creada. Completa tu perfil."
                  : "Bienvenido de vuelta.",
              );
              onDone();
            }
          } catch {
            setMessage(
              "No se pudo conectar. Revisa tu conexión e intenta de nuevo.",
            );
          } finally {
            setBusy(false);
          }
        })}
        id="auth-form"
      >
        {signup && (
          <div className="form-grid">
            <Field label="Nombre y apellido">
              <input name="name" required minLength={2} maxLength={80} />
            </Field>
            <Field label="Edad">
              <input name="age" type="number" min={18} max={100} required />
            </Field>
            <CityField
              label="¿En qué ciudad sueles jugar?"
              value={city}
              onChange={setCity}
              disabled={busy || googleBusy || resendBusy}
            />
          </div>
        )}
        <Field label="Correo electrónico" error={errors.email?.message}>
          <input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <input
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            {...register("password")}
          />
        </Field>
        {signup && (
          <label className="checkbox">
            <input type="checkbox" required />
            Soy mayor de edad y acepto el tratamiento de mis datos para usar
            Fairway. He leído la información de privacidad en Ajustes.
          </label>
        )}
        {message && (
          <div role="status" className="notice">
            {message}
          </div>
        )}
        <Button disabled={busy || resendBusy || googleBusy || !supabase}>
          {busy ? "Conectando…" : signup ? "Crear cuenta" : "Iniciar sesión"}
          <ArrowRight size={17} />
        </Button>
        <button
          type="button"
          className="text-button"
          disabled={busy || resendBusy || googleBusy}
          onClick={() => {
            setSignup(!signup);
            setMessage("");
          }}
        >
          {signup ? "Ya tengo cuenta" : "¿Primera vez aquí? Crea tu cuenta"}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={
            !supabase || busy || resendBusy || googleBusy || resendWait > 0
          }
          onClick={async () => {
            const email = getValues("email").trim();
            if (!z.email().safeParse(email).success || !supabase) {
              setMessage(
                "Escribe primero el correo con el que creaste tu cuenta.",
              );
              return;
            }
            setResendBusy(true);
            try {
              const { error } = await supabase.auth.resend({
                type: "signup",
                email,
                options: {
                  emailRedirectTo: authRedirectUrl(
                    window.location.origin,
                    false,
                    window.location.search,
                  ),
                },
              });
              if (error) setMessage(authErrorMessage(error));
              else {
                setMessage(
                  "Si tu cuenta está pendiente de confirmar, recibirás un correo nuevo. Abre únicamente el más reciente. Si ya confirmaste tu cuenta, inicia sesión.",
                );
                setResendWait(60);
              }
            } catch {
              setMessage(
                "No se pudo conectar. Revisa tu conexión e intenta de nuevo.",
              );
            } finally {
              setResendBusy(false);
            }
          }}
        >
          {resendBusy
            ? "Solicitando correo…"
            : resendWait > 0
              ? `Puedes solicitar otro correo en ${resendWait} s`
              : "Reenviar correo de confirmación"}
        </button>
        {!signup && (
          <button
            type="button"
            className="text-button"
            disabled={!supabase || busy || resendBusy || googleBusy}
            onClick={() => setRecovering(true)}
          >
            Olvidé mi contraseña
          </button>
        )}
      </form>
      <div className="secure-note">
        <ShieldCheck size={15} />
        Autenticación protegida por Supabase
      </div>
    </>
  );
}
export function ProfileForm({
  data,
  onDone,
}: {
  data: FairwayData;
  onDone: () => void;
}) {
  const p = data.me;
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      name: p.name,
      city: p.city,
      age: p.age,
      handicap: p.handicap ?? "",
      club_id: p.club_id ?? "",
      bio: p.bio,
      availability: p.availability,
      holes: p.holes,
      style: p.style,
      hand: p.hand ?? "derecha",
      years: p.years ?? 0,
      frequency: p.frequency ?? "Semanal",
      transport: p.transport ?? "Indistinto",
      accepts_guests: p.accepts_guests,
      beginner_friendly: p.beginner_friendly,
      formats: p.formats ?? ["Casual"],
      additional_clubs: p.additional_clubs ?? [],
      gender: p.gender ?? "",
      occupation: p.occupation ?? "",
      visibility: p.visibility ?? "members",
    },
  });
  const [busy, setBusy] = useState(false),
    [err, setErr] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [gallery, setGallery] = useState<File[]>([]),
    [keepGallery, setKeepGallery] = useState<string[]>(p.gallery || []);
  return (
    <form
      className="form"
      onSubmit={handleSubmit(async (values) => {
        const parsed = profileSchema.safeParse(values);
        if (!parsed.success) {
          setErr(parsed.error.issues[0].message);
          return;
        }
        setBusy(true);
        let path: string | undefined;
        const galleryPaths = [...keepGallery];
        if (supabase && data.user) {
          for (const file of [...(photo ? [photo] : []), ...gallery]) {
            if (
              file.size > 5 * 1024 * 1024 ||
              !["image/jpeg", "image/png", "image/webp"].includes(file.type)
            ) {
              setErr("Cada imagen debe ser JPG, PNG o WebP de hasta 5 MB.");
              setBusy(false);
              return;
            }
            const name = `${data.user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
            const { error } = await supabase.storage
              .from("profile-images")
              .upload(name, file);
            if (error) {
              setErr(error.message);
              setBusy(false);
              return;
            }
            if (file === photo) path = name;
            else galleryPaths.push(name);
          }
        }
        const ok = await data.run(
          () =>
            supabase!
              .from("profiles")
              .update({
                ...parsed.data,
                club_id: parsed.data.club_id || null,
                ...(path ? { photo: path } : {}),
                gallery: galleryPaths.slice(0, 6),
              })
              .eq("id", data.user!.id),
          "Perfil actualizado.",
        );
        setBusy(false);
        if (ok) onDone();
      })}
    >
      <div className="notice">
        Tu handicap y membresía son declarados. La verificación requiere
        revisión real de la administración.
      </div>
      <div className="form-grid">
        <Field label="Nombre y apellido">
          <input {...register("name")} required />
        </Field>
        <Field label="Edad (solo 18+)">
          <input type="number" min={18} max={100} {...register("age")} />
        </Field>
        <CityField
          value={watch("city")}
          onChange={(city) => setValue("city", city, { shouldDirty: true })}
          disabled={busy}
        />
        <Field
          label="Handicap declarado"
          hint="Vacío si aún no tienes handicap."
        >
          <input
            type="number"
            step="0.1"
            min={-10}
            max={54}
            {...register("handicap")}
          />
        </Field>
        <Field label="Club principal">
          <select {...register("club_id")}>
            <option value="">No pertenezco a ningún club</option>
            {data.clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Años jugando">
          <input type="number" min={0} {...register("years")} />
        </Field>
        <Field label="Mano dominante">
          <select {...register("hand")}>
            <option>derecha</option>
            <option>izquierda</option>
          </select>
        </Field>
        <Field label="Modalidad">
          <select {...register("holes")}>
            <option value={18}>18 hoyos</option>
            <option value={9}>9 hoyos</option>
          </select>
        </Field>
        <Field label="Estilo de juego">
          <select {...register("style")}>
            <option value="social">Social</option>
            <option value="intermedio">Intermedio</option>
            <option value="competitivo">Competitivo</option>
          </select>
        </Field>
        <Field label="Frecuencia">
          <select {...register("frequency")}>
            <option>Semanal</option>
            <option>Varias veces por semana</option>
            <option>Mensual</option>
            <option>Ocasional</option>
          </select>
        </Field>
        <Field label="Cómo juegas">
          <select {...register("transport")}>
            <option>Indistinto</option>
            <option>Caminando</option>
            <option>Carrito</option>
          </select>
        </Field>
        <Field label="Visibilidad del perfil">
          <select {...register("visibility")}>
            <option value="members">Miembros de Fairway</option>
            <option value="private">Privado</option>
            <option value="public">Público dentro de Fairway</option>
          </select>
        </Field>
        <Field label="Ocupación (opcional)">
          <input {...register("occupation")} />
        </Field>
        <Field label="Género (opcional)">
          <input {...register("gender")} />
        </Field>
      </div>
      <Field label="Sobre ti">
        <textarea rows={3} maxLength={500} {...register("bio")} />
      </Field>
      <fieldset>
        <legend>Disponibilidad habitual</legend>
        <div className="check-grid">
          {days.map((d) => (
            <label className="checkbox" key={d}>
              <input type="checkbox" value={d} {...register("availability")} />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Formatos favoritos</legend>
        <div className="check-grid">
          {["Stroke play", "Match play", "Scramble", "Casual"].map((d) => (
            <label className="checkbox" key={d}>
              <input type="checkbox" value={d} {...register("formats")} />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Otros clubes donde puedes jugar</legend>
        {data.clubs.map((c) => (
          <label className="checkbox" key={c.id}>
            <input
              type="checkbox"
              value={c.id}
              {...register("additional_clubs")}
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      <label className="checkbox">
        <input type="checkbox" {...register("accepts_guests")} />
        Acepto solicitudes de invitados, sujeto a las reglas del club
      </label>
      <label className="checkbox">
        <input type="checkbox" {...register("beginner_friendly")} />
        Me gusta acompañar a principiantes
      </label>
      {keepGallery.length > 0 && (
        <fieldset>
          <legend>Fotografías actuales</legend>
          {keepGallery.map((path, i) => (
            <label className="checkbox" key={path}>
              <input
                type="checkbox"
                checked
                onChange={() =>
                  setKeepGallery((g) => g.filter((p) => p !== path))
                }
              />
              Conservar foto {i + 1}
            </label>
          ))}
        </fieldset>
      )}
      <div className="form-grid">
        <Field label="Fotografía de perfil">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Galería (hasta 6 fotos)">
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) =>
              setGallery(Array.from(e.target.files || []).slice(0, 6))
            }
          />
        </Field>
      </div>
      {err && (
        <p className="error-text" role="alert">
          {err}
        </p>
      )}
      <Button disabled={busy}>
        {busy ? "Guardando…" : "Guardar mi perfil"}
      </Button>
    </form>
  );
}
export function GameForm({
  data,
  onDone,
  party = false,
  initialDate,
}: {
  data: FairwayData;
  onDone: (date: string, gameId: string) => void | Promise<void>;
  initialDate?: string;
  party?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [joinMode, setJoinMode] = useState(
    party && data.partiesAvailable ? "open" : "request",
  );
  const [date, setDate] = useState(initialDate || golfDateAfter(7));
  const [privacy, setPrivacy] = useState("public");
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.currentTarget);
        const time = new Date(
          f.get("date") + "T" + f.get("time") + ":00-06:00",
        );
        if (Number.isNaN(time.getTime()) || time <= new Date()) {
          data.notify("Elige una fecha y hora futuras.");
          return;
        }
        setBusy(true);
        const gameId = crypto.randomUUID();
        const ok = await data.run(
          () =>
            supabase!.from("games").insert({
              id: gameId,
              host_id: data.user!.id,
              club_id: f.get("club"),
              starts_at: time.toISOString(),
              holes: Number(f.get("holes")),
              capacity: Number(f.get("capacity")),
              format: f.get("format"),
              kind: f.get("kind"),
              privacy: joinMode === "open" ? "public" : f.get("privacy"),
              ...(data.partiesAvailable ? { join_mode: joinMode } : {}),
              description: f.get("description"),
              access_conditions: f.get("access"),
            }),
          joinMode === "open"
            ? "Party publicada con su chat privado. Quienes se unan entrarán al grupo."
            : "Partida publicada con su chat privado. Los jugadores entrarán al aprobar su solicitud.",
        );
        setBusy(false);
        if (ok) await onDone(date, gameId);
      }}
    >
      <div className="party-form-intro">
        <span>
          <CalendarDays size={19} />
        </span>
        <div>
          <strong>Un buen plan empieza con tiempo.</strong>
          <p>Elige un día, abre tu grupo y deja que llegue la compañía.</p>
        </div>
      </div>
      <fieldset className="party-mode-picker">
        <legend>¿Cómo se une la gente?</legend>
        <label className={joinMode === "open" ? "selected" : ""}>
          <input
            type="radio"
            name="join-mode"
            value="open"
            checked={joinMode === "open"}
            disabled={!data.partiesAvailable || busy}
            onChange={() => {
              setJoinMode("open");
              setPrivacy("public");
            }}
          />
          <Users size={20} />
          <span>
            <strong>Party abierta</strong>
            <small>
              Cualquier miembro se une al instante, hasta llenar el grupo.
            </small>
          </span>
        </label>
        <label className={joinMode === "request" ? "selected" : ""}>
          <input
            type="radio"
            name="join-mode"
            value="request"
            checked={joinMode === "request"}
            disabled={busy}
            onChange={() => setJoinMode("request")}
          />
          <Check size={20} />
          <span>
            <strong>Con aprobación</strong>
            <small>Recibes solicitudes y eliges a tus compañeros.</small>
          </span>
        </label>
      </fieldset>
      {!data.partiesAvailable && (
        <p className="party-activation-note">
          La incorporación directa aún no está activada. Ya puedes organizar
          partidas para cualquier fecha y aprobar solicitudes.
        </p>
      )}
      <Field label="Club / campo">
        <select name="club" required>
          {data.clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Fecha">
          <input
            name="date"
            type="date"
            min={golfDate()}
            value={date}
            disabled={busy}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Hora (León)">
          <input name="time" type="time" defaultValue="08:00" required />
        </Field>
        <Field label="Hoyos">
          <select name="holes">
            <option>18</option>
            <option>9</option>
          </select>
        </Field>
        <Field label="Jugadores totales (incluyéndote)">
          <select name="capacity">
            <option>4</option>
            <option>3</option>
            <option>2</option>
          </select>
        </Field>
        <Field label="Formato">
          <select name="format">
            <option>Casual</option>
            <option>Stroke play</option>
            <option>Match play</option>
            <option>Scramble</option>
          </select>
        </Field>
        <Field label="Tipo">
          <select name="kind">
            <option value="social">Social</option>
            <option value="competitivo">Competitiva</option>
          </select>
        </Field>
      </div>
      <div className="party-quick-dates" aria-label="Elegir fecha rápida">
        {[
          [1, "Mañana"],
          [7, "En una semana"],
          [14, "En dos semanas"],
        ].map(([days, label]) => (
          <button
            type="button"
            key={days}
            className={date === golfDateAfter(Number(days)) ? "active" : ""}
            disabled={busy}
            onClick={() => setDate(golfDateAfter(Number(days)))}
          >
            {label}
          </button>
        ))}
      </div>
      <Field label="Privacidad">
        <select
          name="privacy"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
          disabled={joinMode === "open" || busy}
        >
          <option value="public">Visible para todos los miembros</option>
          <option value="matches">Solo mis matches</option>
          <option value="invite">Por invitación</option>
        </select>
      </Field>
      <Field label="Descripción">
        <textarea
          name="description"
          placeholder="Por ejemplo: ronda relajada el próximo sábado, todos los niveles son bienvenidos."
          required
          maxLength={1000}
          rows={3}
        />
      </Field>
      <Field label="Condiciones de acceso al club">
        <textarea
          name="access"
          required
          rows={2}
          defaultValue="Cada jugador debe contar con acceso válido o invitación autorizada por el club."
        />
      </Field>
      <div className="notice">
        Fairway organiza compañeros. La reserva del tee time y la autorización
        de acceso se gestionan directamente con el club.
      </div>
      <Button disabled={busy}>
        {busy
          ? "Publicando…"
          : joinMode === "open"
            ? "Publicar party abierta"
            : "Publicar partida"}
      </Button>
    </form>
  );
}
export function ReviewForm({
  data,
  game,
  target,
  onDone,
}: {
  data: FairwayData;
  game: Game;
  target: Profile;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const eligible = canRatePlayer(
    game,
    data.user?.id,
    target.id,
    data.myReviews,
  );
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting.current || !eligible || !rating) return;
        const f = new FormData(e.currentTarget);
        submitting.current = true;
        setBusy(true);
        try {
          const ok = await data.run(async () => {
            const result = await supabase!.from("reviews").insert({
              game_id: game.id,
              reviewer_id: data.user!.id,
              target_id: target.id,
              ...ratingColumns(rating),
              body: String(f.get("body") || "").trim() || null,
            });
            if (result.error?.code === "23505")
              return {
                error: {
                  message: "Ya calificaste a este compañero en esta partida.",
                },
              };
            return result;
          }, "Calificación guardada.");
          if (ok) onDone();
        } finally {
          submitting.current = false;
          setBusy(false);
        }
      }}
    >
      <p>
        ¿Cómo fue jugar con {target.name}? Califica la convivencia y el respeto,
        no su habilidad de golf. Tu calificación se incluirá en el promedio de
        su perfil.
      </p>
      {!eligible && (
        <p role="status">
          Solo puedes calificar una vez a cada compañero confirmado de una
          partida finalizada.
        </p>
      )}
      <StarRatingInput
        value={rating}
        onChange={setRating}
        disabled={busy || !eligible}
      />
      <Field label="Comentario (opcional)">
        <textarea name="body" maxLength={1000} disabled={busy || !eligible} />
      </Field>
      <Button disabled={busy || !eligible || !rating}>
        {busy ? "Guardando…" : "Enviar calificación"}
      </Button>
    </form>
  );
}
