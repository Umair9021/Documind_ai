"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "../../lib/theme";
import { Button, Field, Input, ThemeToggle } from "../../components/ui";
import { Icon } from "../../components/Icons";

export default function SignupPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState("Aditi Rao");
  const [email, setEmail] = useState("aditi@research.edu");
  const [password, setPassword] = useState("password123");

  const handleSubmit = (e) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground transition-colors justify-center px-5 py-12">
      <div className="absolute right-5 top-5">
        <ThemeToggle theme={theme} toggle={toggle} />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <Link href="/" className="mb-8 flex items-center gap-2.5 self-center group">
          <Icon name="logo" className="size-8 transition-transform group-hover:scale-105" />
          <span className="text-base font-semibold tracking-tight text-foreground">DocuMind AI</span>
        </Link>

        <div className="rounded-2xl border border-border bg-panel p-7 shadow-sm transition-colors">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Create your account</h1>
          <p className="mt-1 text-sm text-muted">
            Start building private, source-grounded knowledge bases.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aditi Rao"
                required
              />
            </Field>

            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@work.com"
                required
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </Field>

            <Button type="submit" className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
