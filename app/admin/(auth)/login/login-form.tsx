"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError, SubmitButton, TextField } from "@/components/forms/fields";

export function LoginForm({ callbackUrl, initialError }: { callbackUrl: string; initialError: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const result = await signIn("credentials", {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      redirect: false,
    });
    setPending(false);
    if (!result || result.error) {
      setError(
        result?.error && result.error !== "CredentialsSignin"
          ? result.error
          : "That email and password don't match an active account.",
      );
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4" noValidate>
      <TextField tone="dark" label="Email" name="email" type="email" autoComplete="username" required />
      <TextField tone="dark" label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormError tone="dark" message={error} />
      <SubmitButton tone="dark" pending={pending}>
        Sign in
      </SubmitButton>
    </form>
  );
}
