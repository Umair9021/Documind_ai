"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "../../lib/theme";
import { Button, Field, Input, ThemeToggle } from "../../components/ui";
import { Icon } from "../../components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("aditi@research.edu");
  const [password, setPassword] = useState("password");

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
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Log in to your knowledge workspace.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@work.com"
                required
              />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">Password</span>
                <button
                  type="button"
                  className="text-[13px] font-medium text-accent hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Log in
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
