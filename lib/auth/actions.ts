"use server";

import { redirect } from "next/navigation";
import { readSupabaseConfig } from "../supabase/config";
import { createIsolatedAuthClient, createSessionClient } from "../supabase/server";
import {
  accountDestination, formString, validEmail, validNewPassword, validOtp,
} from "./validation";

export type FormResult = { error: string } | { notice: string } | null;

const unavailable = { error: "Account services are unavailable. Try again later." };
const emailError = { error: "Enter a valid email address." };
const passwordError = { error: "Choose a password with at least 12 characters and no more than 72 UTF-8 bytes." };
const codeError = { error: "That code could not be verified. Check the email and code or request a new code." };

export async function signIn(_: FormResult, form: FormData): Promise<FormResult> {
  const client = await createSessionClient(true);
  if (!client) return unavailable;

  const email = formString(form, "email").trim();
  const password = formString(form, "password");
  if (!validEmail(email)) return emailError;
  if (!password || password.length > 1024) return { error: "Enter your password." };

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Sign-in failed. Check your email and password and make sure your email is confirmed." };
  }

  redirect(accountDestination(form.get("next")));
}

export async function signUp(_: FormResult, form: FormData): Promise<FormResult> {
  const config = readSupabaseConfig();
  if (!config) return unavailable;

  const email = formString(form, "email").trim();
  const password = formString(form, "password");
  if (!validEmail(email)) return emailError;
  if (!validNewPassword(password)) return passwordError;

  const client = createIsolatedAuthClient(config);
  const { data, error } = await client.auth.signUp({ email, password });
  if (data.session) {
    // This deployment has email confirmation disabled. Discard the isolated session.
    await client.auth.signOut({ scope: "local" });
    return unavailable;
  }
  if (error?.code === "weak_password") return { error: "Choose a stronger password." };
  if (error && (!error.status || error.status >= 500)) return unavailable;
  redirect("/auth/confirm?sent=1");
}

export async function resendConfirmation(_: FormResult, form: FormData): Promise<FormResult> {
  const config = readSupabaseConfig();
  if (!config) return unavailable;

  const email = formString(form, "email").trim();
  if (!validEmail(email)) return emailError;
  await createIsolatedAuthClient(config).auth.resend({ type: "signup", email });
  return { notice: "If this address needs confirmation, a new code will be sent. Check your inbox and spam folder." };
}

export async function confirmEmail(_: FormResult, form: FormData): Promise<FormResult> {
  const client = await createSessionClient(true);
  if (!client) return unavailable;

  const email = formString(form, "email").trim();
  const token = formString(form, "code").trim();
  if (!validEmail(email)) return emailError;
  if (!validOtp(token)) return { error: "Enter the six-digit code from your email." };

  const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session) return codeError;
  redirect("/dashboard");
}

export async function requestPasswordReset(_: FormResult, form: FormData): Promise<FormResult> {
  const config = readSupabaseConfig();
  if (!config) return unavailable;

  const email = formString(form, "email").trim();
  if (!validEmail(email)) return emailError;

  await createIsolatedAuthClient(config).auth.resetPasswordForEmail(email);
  redirect("/reset-password?sent=1");
}

export async function resetPassword(_: FormResult, form: FormData): Promise<FormResult> {
  const config = readSupabaseConfig();
  if (!config) return unavailable;

  const email = formString(form, "email").trim();
  const token = formString(form, "code").trim();
  const password = formString(form, "password");
  if (!validEmail(email)) return emailError;
  if (!validOtp(token)) return { error: "Enter the six-digit code from your email." };
  if (!validNewPassword(password)) return passwordError;
  if (password !== formString(form, "password_confirmation")) {
    return { error: "The passwords do not match." };
  }

  // The recovery session stays in memory and is never written to browser cookies.
  const client = createIsolatedAuthClient(config);
  const { data, error } = await client.auth.verifyOtp({ email, token, type: "recovery" });
  if (error || !data.session) return codeError;

  const { error: updateError } = await client.auth.updateUser({ password });
  if (updateError) {
    await client.auth.signOut({ scope: "local" });
    return { error: "Your password could not be updated. Request a new code and choose a different password." };
  }

  await client.auth.signOut({ scope: "global" });
  redirect("/sign-in?reset=1");
}

export async function signOut(): Promise<FormResult> {
  const client = await createSessionClient(true);
  if (!client) redirect("/sign-in");

  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) return { error: "Could not sign out. Try again." };
  redirect("/sign-in");
}
