"use client";
import { useState } from "react";
import { Button, Field } from "./ui";
import { RegistrationConsent } from "./legal-links";
import { supabase } from "@/lib/supabase";
import type { FairwayData } from "@/lib/use-fairway";
import { authErrorMessage } from "@/lib/auth";
import { DEFAULT_CITY } from "@/lib/cities";
import { profileSchema } from "@/lib/domain";
import { saveInitialSignupCity } from "@/lib/signup-city";
import { CityField } from "./city-field";

export function GoogleOnboarding({ data }: { data: FairwayData }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [city, setCity] = useState(() => {
    const parsed = profileSchema.shape.city.safeParse(
      data.user?.user_metadata.signup_city,
    );
    return parsed.success ? parsed.data : DEFAULT_CITY;
  });
  return (
    <main className="google-onboarding">
      <section className="panel">
        <span className="eyebrow">BIENVENIDO A FAIRWAY</span>
        <h1>Completa tu cuenta</h1>
        <p className="form-intro">
          Ya entraste con Google. Confirma tus datos para empezar. Fairway es
          exclusivo para mayores de 18 años.
        </p>
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!supabase || busy) return;
            const values = new FormData(event.currentTarget);
            const parsedCity = profileSchema.shape.city.safeParse(city);
            if (!parsedCity.success) {
              setError(parsedCity.error.issues[0].message);
              return;
            }
            setBusy(true);
            setError("");
            try {
              // Auth metadata preserves the choice if the flow is interrupted.
              const metadata = await supabase.auth.updateUser({
                data: { signup_city: parsedCity.data },
              });
              if (metadata.error) throw metadata.error;
              const { error } = await supabase.rpc("complete_google_signup", {
                profile_name: String(values.get("name") || "").trim(),
                profile_age: Number(values.get("age")),
                accepted_terms: values.get("consent") === "on",
              });
              if (error) throw error;
              await saveInitialSignupCity(
                supabase,
                data.user!.id,
                parsedCity.data,
              );
              await data.reload();
            } catch (error) {
              setError(
                (error as { code?: string }).code === "PGRST202"
                  ? "El registro con Google aún no está listo. Intenta más tarde."
                  : authErrorMessage(
                      error as { message?: string; code?: string },
                    ),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Nombre para tu perfil">
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={String(
                data.user?.user_metadata.full_name ||
                  data.user?.user_metadata.name ||
                  "",
              ).slice(0, 80)}
            />
          </Field>
          <Field label="Edad">
            <input
              name="age"
              type="number"
              min={18}
              max={100}
              step={1}
              required
            />
          </Field>
          <CityField
            label="¿En qué ciudad sueles jugar?"
            value={city}
            onChange={setCity}
            disabled={busy}
          />
          <label className="checkbox">
            <input name="consent" type="checkbox" required />
            <RegistrationConsent />
          </label>
          <button
            type="button"
            className="text-button"
            aria-expanded={showPrivacy}
            onClick={() => setShowPrivacy(!showPrivacy)}
          >
            Información de privacidad
          </button>
          {showPrivacy && (
            <p className="notice">
              Fairway utiliza tu nombre, edad, ciudad, club, disponibilidad y
              actividad para encontrar compañeros y organizar partidas. Google
              comparte tu nombre y correo para autenticarte. Tu correo no se
              publica. Puedes controlar la visibilidad de tu perfil, cerrar
              sesión y solicitar la eliminación de tu cuenta en Ajustes.
            </p>
          )}
          {(error || data.error) && (
            <p className="notice" role="alert">
              {error || data.error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? "Guardando…" : "Completar cuenta"}
          </Button>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={async () => {
              const result = await supabase?.auth.signOut();
              if (result?.error) setError(authErrorMessage(result.error));
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
