import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authRedirectUrl } from "./auth";

type Auth = SupabaseClient["auth"];

export async function requestPasswordReset(
  auth: Pick<Auth, "resetPasswordForEmail">,
  email: string,
  origin: string,
) {
  const parsed = z.email().safeParse(email.trim());
  if (!parsed.success) throw new Error("Escribe un correo válido.");
  const { error } = await auth.resetPasswordForEmail(parsed.data, {
    redirectTo: authRedirectUrl(origin, true),
  });
  if (error) throw error;
}

export async function updateRecoveredPassword(
  auth: Pick<Auth, "updateUser">,
  password: string,
  confirmation: string,
) {
  if (password.length < 10) throw new Error("Usa al menos 10 caracteres.");
  if (password !== confirmation)
    throw new Error("Las contraseñas no coinciden.");
  const { error } = await auth.updateUser({ password });
  if (error) throw error;
}
