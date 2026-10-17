"use client";
import { useState } from "react";
import { Button, Field } from "./ui";
import { supabase } from "@/lib/supabase";
import type { FairwayData } from "@/lib/use-fairway";
import { authErrorMessage } from "@/lib/auth";

export function GoogleOnboarding({ data }: { data: FairwayData }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);
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
            setBusy(true);
            setError("");
            try {
              const { error } = await supabase.rpc("complete_google_signup", {
                profile_name: String(values.get("name") || "").trim(),
                profile_age: Number(values.get("age")),
                accepted_terms: values.get("consent") === "on",
              });
              if (error) throw error;
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
          <Field label="Nombre y apellido">
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
          <label className="checkbox">
            <input name="consent" type="checkbox" required />
            Soy mayor de edad y acepto el tratamiento de mis datos para usar
            Fairway. He leído la información de privacidad.
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
              Fairway utiliza tu nombre, edad, club, disponibilidad y actividad
              para encontrar compañeros y organizar partidas. Google comparte tu
              nombre y correo para autenticarte. Tu correo no se publica. Puedes
              controlar la visibilidad de tu perfil, cerrar sesión y solicitar
              la eliminación de tu cuenta en Ajustes.
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
