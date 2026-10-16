"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowRight, Upload, ShieldCheck } from "lucide-react";
import { Button, Field } from "./ui";
import { supabase } from "@/lib/supabase";
import { days, profileSchema, type Profile, type Game } from "@/lib/domain";
import type { FairwayData } from "@/lib/use-fairway";
import { authErrorMessage, authRedirectUrl } from "@/lib/auth";
const authSchema = z.object({
  email: z.email("Escribe un correo válido."),
  password: z.string().min(10, "Usa al menos 10 caracteres."),
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
    [message, setMessage] = useState(initialMessage),
    [resendBusy, setResendBusy] = useState(false),
    [resendWait, setResendWait] = useState(0);
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
      <form
        className="form"
        onSubmit={handleSubmit(async (values) => {
          if (!supabase) return;
          setBusy(true);
          setMessage("");
          const form = document.getElementById("auth-form") as HTMLFormElement;
          const fd = new FormData(form);
          const age = Number(fd.get("age"));
          if (signup && (!Number.isInteger(age) || age < 18 || age > 100)) {
            setMessage("Debes tener entre 18 y 100 años.");
            setBusy(false);
            return;
          }
          const result = signup
            ? await supabase.auth.signUp({
                ...values,
                options: {
                  data: { name: fd.get("name"), age },
                  emailRedirectTo: authRedirectUrl(window.location.origin),
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
          </div>
        )}
        <Field label="Correo electrónico">
          <input type="email" autoComplete="email" {...register("email")} />
          {errors.email && (
            <small className="error-text">{errors.email.message}</small>
          )}
        </Field>
        <Field label="Contraseña">
          <input
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            {...register("password")}
          />
          {errors.password && (
            <small className="error-text">{errors.password.message}</small>
          )}
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
        <Button disabled={busy || resendBusy || !supabase}>
          {busy ? "Conectando…" : signup ? "Crear cuenta" : "Iniciar sesión"}
          <ArrowRight size={17} />
        </Button>
        <button
          type="button"
          className="text-button"
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
          disabled={!supabase || busy || resendBusy || resendWait > 0}
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
                  emailRedirectTo: authRedirectUrl(window.location.origin),
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
            onClick={async () => {
              const input = document.querySelector<HTMLInputElement>(
                "#auth-form input[type=email]",
              );
              if (!input?.value || !supabase) {
                setMessage("Escribe primero tu correo.");
                return;
              }
              const { error } = await supabase.auth.resetPasswordForEmail(
                input.value,
                { redirectTo: authRedirectUrl(window.location.origin, true) },
              );
              setMessage(
                error
                  ? authErrorMessage(error)
                  : "Si existe la cuenta, recibirás un enlace de recuperación.",
              );
            }}
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
  const { register, handleSubmit } = useForm({
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
        <Field label="Ciudad">
          <input {...register("city")} />
        </Field>
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
      {err && <p className="error-text">{err}</p>}
      <Button disabled={busy}>
        {busy ? "Guardando…" : "Guardar mi perfil"}
      </Button>
    </form>
  );
}
export function GameForm({
  data,
  onDone,
}: {
  data: FairwayData;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const time = new Date(
          f.get("date") + "T" + f.get("time") + ":00-06:00",
        );
        if (time <= new Date()) {
          data.notify("Elige una fecha y hora futuras.");
          return;
        }
        setBusy(true);
        const ok = await data.run(
          () =>
            supabase!.from("games").insert({
              host_id: data.user!.id,
              club_id: f.get("club"),
              starts_at: time.toISOString(),
              holes: Number(f.get("holes")),
              capacity: Number(f.get("capacity")),
              format: f.get("format"),
              kind: f.get("kind"),
              privacy: f.get("privacy"),
              description: f.get("description"),
              access_conditions: f.get("access"),
            }),
          "Partida publicada. Tú apruebas las solicitudes de acceso.",
        );
        setBusy(false);
        if (ok) onDone();
      }}
    >
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
          <input name="date" type="date" required />
        </Field>
        <Field label="Hora (León)">
          <input name="time" type="time" required />
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
      <Field label="Privacidad">
        <select name="privacy">
          <option value="public">Pública</option>
          <option value="matches">Solo mis matches</option>
          <option value="invite">Por invitación</option>
        </select>
      </Field>
      <Field label="Descripción">
        <textarea name="description" required maxLength={1000} rows={3} />
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
      <Button disabled={busy}>{busy ? "Publicando…" : "Crear partida"}</Button>
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
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const ok = await data.run(
          () =>
            supabase!.from("reviews").insert({
              game_id: game.id,
              reviewer_id: data.user!.id,
              target_id: target.id,
              punctuality: Number(f.get("punctuality")),
              respect: Number(f.get("respect")),
              pace: Number(f.get("pace")),
              company: Number(f.get("company")),
              body: f.get("body"),
            }),
          "Evaluación registrada.",
        );
        if (ok) onDone();
      }}
    >
      <p>
        Evalúa tu experiencia como compañero de {target.name}, no su habilidad
        de golf.
      </p>
      {[
        ["punctuality", "Puntualidad"],
        ["respect", "Actitud y respeto"],
        ["pace", "Ritmo de juego"],
        ["company", "Convivencia general"],
      ].map(([k, l]) => (
        <Field label={l} key={k}>
          <select name={k}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} estrellas
              </option>
            ))}
          </select>
        </Field>
      ))}
      <Field label="Reseña">
        <textarea name="body" maxLength={1000} />
      </Field>
      <Button>Enviar evaluación</Button>
    </form>
  );
}
