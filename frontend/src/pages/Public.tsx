import { useState, useEffect } from "react";
import { useRouter } from "../lib/router";
import { useTheme } from "../lib/theme";
import { Button, Field, Icon, Input, ThemeToggle, cx } from "../components/ui";

function TopBar() {
  const { navigate } = useRouter();
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-panel/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
          <Icon name="logo" className="size-7" />
          <span className="text-[15px] font-semibold tracking-tight">DocuMind AI</span>
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} toggle={toggle} />
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Log in</Button>
          <Button size="sm" onClick={() => navigate("/signup")}>Sign up</Button>
        </div>
      </div>
    </header>
  );
}

function ProductPreview() {
  return (
    <div className="dm-fade-up relative">
      {/* soft accent glow behind the panel — restrained */}
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-accent-soft/60 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-foreground/[0.08] ring-1 ring-foreground/[0.02]">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-surface/70 px-4 py-3">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <div className="ml-3 flex items-center gap-1.5 rounded-md bg-panel px-2.5 py-1 font-mono text-[11px] text-muted">
            <Icon name="library" className="size-3.5 text-accent" /> Generative AI Course
          </div>
        </div>
        {/* conversation */}
        <div className="space-y-4 px-5 py-5">
          <div className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[13px] leading-relaxed text-white">What is the difference between BM25 and vector search?</p>
          </div>
          <div className="flex gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background"><Icon name="sparkle" className="size-3.5" /></div>
            <div className="min-w-0">
              <p className="text-[13px] leading-relaxed text-foreground">
                BM25 ranks by keyword overlap — precise on exact terms. Vector search retrieves by <span className="rounded bg-accent-soft px-1 text-accent">semantic similarity</span>, capturing meaning across paraphrase. Hybrid retrieval fuses both.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { name: "Advanced RAG.pdf", loc: "Page 23", type: "doc" as const },
                  { name: "Course Notes.docx", loc: "§ BM25", type: "doc" as const },
                ].map((c) => (
                  <div key={c.name} className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-2.5 py-2">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"><Icon name="doc" className="size-3.5" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium">{c.name}</p>
                      <p className="font-mono text-[10px] text-accent">{c.loc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* input */}
        <div className="border-t border-border px-5 py-3.5">
          <div className="flex items-center gap-2 rounded-xl border border-border-strong bg-panel px-3 py-2">
            <span className="flex-1 text-[13px] text-faint">Ask anything about your knowledge…</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-white"><Icon name="send" className="size-3.5" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

const flowSteps = [
  { icon: "sources" as const, label: "Sources" },
  { icon: "layers" as const, label: "Retrieve" },
  { icon: "sparkle" as const, label: "Answer" },
  { icon: "quote" as const, label: "Cite" },
];

function FlowStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {flowSteps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-1.5">
            <Icon name={s.icon} className={cx("size-4", i === 2 ? "text-accent" : "text-muted")} />
            <span className="text-[13px] font-medium">{s.label}</span>
          </div>
          {i < flowSteps.length - 1 && <Icon name="arrow-right" className="size-4 text-faint" />}
        </div>
      ))}
    </div>
  );
}

export function Landing() {
  const { navigate } = useRouter();
  return (
    <div className="min-h-full bg-background">
      <TopBar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* subtle grid + radial wash, restrained */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55]" style={{ backgroundImage: "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)" }} />
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 font-mono text-xs text-muted shadow-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Retrieval-Augmented Generation
              </span>
              <h1 className="mt-6 text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-[3.5rem]">
                Turn your knowledge into an AI you can <span className="text-accent">ask anything</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Upload documents, add YouTube videos, and ask questions about your own knowledge using grounded Retrieval-Augmented Generation.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => navigate("/signup")} icon="plus">Create knowledge base</Button>
                <Button variant="secondary" onClick={() => navigate("/")} icon="arrow-right">See how it works</Button>
              </div>
              <div className="mt-8 flex items-center gap-5 text-[13px] text-muted">
                <span className="flex items-center gap-1.5"><Icon name="check" className="size-4 text-ready" /> Private by design</span>
                <span className="flex items-center gap-1.5"><Icon name="check" className="size-4 text-ready" /> Cited answers</span>
                <span className="hidden items-center gap-1.5 sm:flex"><Icon name="check" className="size-4 text-ready" /> No credit card</span>
              </div>
            </div>
            <ProductPreview />
          </div>
          <div className="mt-16"><FlowStrip /></div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">From scattered sources to answers you can trust</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { n: "01", icon: "upload" as const, t: "Add your sources", d: "Bring together PDFs, Word docs, spreadsheets, notes and YouTube lectures in one knowledge base." },
              { n: "02", icon: "chat" as const, t: "Ask in plain language", d: "Ask natural questions. DocuMind retrieves the most relevant passages before answering." },
              { n: "03", icon: "quote" as const, t: "Verify every answer", d: "Each response links back to the exact document and page it came from — no guessing." },
            ].map((c) => (
              <div key={c.n} className="group rounded-2xl border border-border bg-background p-6 transition-all hover:border-accent/40 hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-105"><Icon name={c.icon} className="size-5" /></div>
                  <span className="font-mono text-sm text-faint">{c.n}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature split */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-accent">Supported sources</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Everything your research already lives in</h2>
            <p className="mt-4 text-base leading-relaxed text-muted">Documents and video lectures are processed, chunked and indexed automatically. Add as many as you need — DocuMind keeps them organised and searchable.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["PDF", "DOCX", "TXT", "Markdown", "CSV", "XLSX", "YouTube"].map((t) => (
                <span key={t} className="rounded-lg border border-border bg-panel px-3.5 py-2 font-mono text-[13px] text-muted transition-colors hover:border-accent/40 hover:text-foreground">{t}</span>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: "sparkle" as const, t: "RAG-powered Q&A", d: "Answers are generated only from your sources — grounded in retrieved context, not the open internet." },
              { icon: "quote" as const, t: "Source citations", d: "Every claim links to the document, page or timestamp it came from." },
              { icon: "layers" as const, t: "Automatic indexing", d: "Files are chunked and embedded the moment you add them." },
              { icon: "logout" as const, t: "Private by design", d: "Your knowledge bases stay yours. Nothing is shared or trained on." },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-border bg-panel p-5">
                <Icon name={f.icon} className="size-5 text-accent" />
                <h3 className="mt-3 text-[15px] font-semibold">{f.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-foreground px-8 py-16 text-center text-background">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, var(--color-accent), transparent 60%)" }} />
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Build your first knowledge base in minutes</h2>
            <p className="mx-auto mt-4 max-w-md text-background/70">Private by design. Your sources stay yours.</p>
            <div className="mt-8"><Button variant="secondary" onClick={() => navigate("/signup")} className="bg-background text-foreground hover:opacity-90" icon="plus">Create knowledge base</Button></div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-panel">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted sm:flex-row">
          <div className="flex items-center gap-2"><Icon name="logo" className="size-5" /> <span className="font-medium text-foreground">DocuMind AI</span></div>
          <p>© 2026 DocuMind AI. A private knowledge workspace powered by RAG.</p>
        </div>
      </footer>
    </div>
  );
}

function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const { navigate } = useRouter();
  const { theme, toggle } = useTheme();
  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <div className="absolute right-4 top-4 sm:right-5 sm:top-5 z-10"><ThemeToggle theme={theme} toggle={toggle} /></div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-5 sm:py-12">
        <button onClick={() => navigate("/")} className="mb-6 sm:mb-8 flex items-center gap-2.5 self-center">
          <Icon name="logo" className="size-8" />
          <span className="text-base font-semibold tracking-tight">DocuMind AI</span>
        </button>
        <div className="rounded-2xl border border-border bg-panel p-5 sm:p-7 shadow-sm">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">{subtitle}</p>
          <div className="mt-5 sm:mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

import { signUpUser, verifyEmailOtp, resendEmailOtp, loginUser } from "../lib/supabase";

export function Login() {
  const { navigate } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginUser(email.trim(), password);
      if (data && data.access_token) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      if (err.status === 403 || (err.message && err.message.toLowerCase().includes("verify"))) {
        sessionStorage.setItem("dm-verify-email", email.trim());
        navigate("/verify");
      } else {
        setError(err.message || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your private knowledge workspace.">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-failed/20 bg-failed-soft p-3 text-xs font-medium text-failed">
            {error}
          </div>
        )}
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
            <button type="button" className="text-[13px] font-medium text-accent hover:underline">Forgot password?</button>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Don't have an account? <button onClick={() => navigate("/signup")} className="font-medium text-accent hover:underline">Create an account</button>
      </p>
    </AuthShell>
  );
}

export function Signup() {
  const { navigate } = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const data = await signUpUser(email.trim(), password, name.trim() || "Scholar");
      sessionStorage.setItem("dm-verify-email", email.trim());
      sessionStorage.setItem("dm-user-name", name.trim() || "Scholar");
      navigate("/verify");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start building private, source-grounded knowledge bases.">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-failed/20 bg-failed-soft p-3 text-xs font-medium text-failed">
            {error}
          </div>
        )}
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Muhammad Umair"
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
            placeholder="At least 6 characters"
            required
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending verification code…" : "Sign up"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account? <button onClick={() => navigate("/login")} className="font-medium text-accent hover:underline">Log in</button>
      </p>
    </AuthShell>
  );
}

export function VerifyEmail() {
  const { navigate } = useRouter();
  const [email, setEmail] = useState(() => sessionStorage.getItem("dm-verify-email") || "");
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [verifyingText, setVerifyingText] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-detect confirmation link from Supabase email if clicked
  useEffect(() => {
    const fullUrl = window.location.href;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#[^?]*\??/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    const token = hashParams.get("token") || hashParams.get("token_hash") || hashParams.get("access_token") || searchParams.get("token");
    const emailParam = hashParams.get("email") || searchParams.get("email") || sessionStorage.getItem("dm-verify-email");

    if (emailParam && !email) setEmail(emailParam);

    if (token) {
      const targetEmail = (emailParam || email || "").trim();
      setLoading(true);
      setVerifyingText("Verifying your email…");
      verifyEmailOtp(targetEmail, token)
        .then(() => {
          sessionStorage.removeItem("dm-verify-email");
          navigate("/welcome");
        })
        .catch((err: any) => {
          setLoading(false);
          setVerifyingText(null);
          setError(err.message || "Invalid or expired code. Please click Resend.");
        });
    }
  }, []);

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 7) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/\s+/g, "");
    if (/^\d+$/.test(pasted)) {
      const chars = pasted.split("");
      const newOtp = ["", "", "", "", "", "", "", ""];
      chars.forEach((c, i) => {
        if (i < 8) newOtp[i] = c;
      });
      setOtp(newOtp);
      const targetIdx = Math.min(chars.length, 7);
      document.getElementById(`otp-input-${targetIdx}`)?.focus();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("").trim();
    if (fullOtp.length < 6) {
      setError("Please enter the verification code sent to your email.");
      return;
    }
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await verifyEmailOtp(email.trim(), fullOtp);
      sessionStorage.removeItem("dm-verify-email");
      navigate("/welcome");
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendTimer > 0) return;
    setResending(true);
    setError(null);
    try {
      await resendEmailOtp(email.trim());
      setSuccessMsg("A fresh verification code has been sent to your email!");
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Enter verification code"
      subtitle={
        email
          ? `We've sent a verification code to ${email}.`
          : "Enter the verification code sent to your email."
      }
    >
      <div className="space-y-5">
        {verifyingText && (
          <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 text-sm font-medium text-accent">
            <Icon name="sparkle" className="size-5 shrink-0 animate-spin" />
            <span>{verifyingText}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-failed/20 bg-failed-soft p-3 text-xs font-medium text-failed">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl border border-ready/20 bg-ready-soft p-3 text-xs font-medium text-ready">
            {successMsg}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          {!sessionStorage.getItem("dm-verify-email") && (
            <Field label="Email Address">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@work.com"
                required
              />
            </Field>
          )}

          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground">
              Verification Code
            </label>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="size-10 sm:size-11 rounded-xl border border-border bg-panel text-center font-mono text-lg font-bold tracking-tight text-foreground transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                  autoFocus={idx === 0}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || otp.join("").trim().length < 6}>
            {loading ? "Verifying code…" : "Verify and Continue"} <Icon name="arrow-right" className="size-4" />
          </Button>
        </form>

        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
          <span>Didn't receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendTimer > 0 || resending || !email}
            className={cx(
              "font-medium text-accent hover:underline",
              (resendTimer > 0 || resending || !email) && "cursor-not-allowed text-muted opacity-60"
            )}
          >
            {resending ? "Sending…" : resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-muted">
        <p>
          Need to change email?{" "}
          <button onClick={() => navigate("/signup")} className="font-medium text-accent hover:underline">
            Back to Sign up
          </button>
        </p>
      </div>
    </AuthShell>
  );
}

export function Welcome() {
  const { navigate } = useRouter();
  const { theme, toggle } = useTheme();
  const [userName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("dm-user") || "{}");
      return u.full_name || sessionStorage.getItem("dm-user-name") || "Scholar";
    } catch {
      return "Scholar";
    }
  });

  const steps = [
    { icon: "library" as const, title: "Create a knowledge base", body: "Group related material into a private, source-grounded workspace." },
    { icon: "upload" as const, title: "Add your sources", body: "Upload PDFs, docs and spreadsheets, or paste a YouTube link." },
    { icon: "chat" as const, title: "Ask anything", body: "Get answers grounded in your sources, with citations you can verify." },
  ];
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background">
      {/* ambient grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        style={{ backgroundImage: "linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)", backgroundSize: "44px 44px" }}
      />
      <div className="absolute right-5 top-5 z-10"><ThemeToggle theme={theme} toggle={toggle} /></div>

      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-14">
        <div className="dm-fade-up flex flex-col items-center text-center">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/25">
            <Icon name="sparkle" className="size-8" />
            <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-xl border border-border bg-panel text-accent"><Icon name="check" className="size-4" /></span>
          </div>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-accent">Account verified</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome to DocuMind AI, {userName}</h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
            Your private workspace is ready. Here's how to turn your documents and videos into answers you can trust.
          </p>
        </div>

        <div className="dm-fade-up mt-10 space-y-3" style={{ animationDelay: "80ms" }}>
          {steps.map((s, i) => (
            <div key={s.title} className="flex items-start gap-4 rounded-2xl border border-border bg-panel p-4 sm:p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon name={s.icon} className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-[15px] font-semibold tracking-tight">{s.title}</h3>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="dm-fade-up mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: "160ms" }}>
          <Button size="md" icon="arrow-right" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">Go to your dashboard</Button>
          <Button size="md" variant="secondary" icon="plus" onClick={() => navigate("/knowledge-bases")} className="w-full sm:w-auto">Create a knowledge base</Button>
        </div>
        <p className="dm-fade-up mt-5 text-center text-xs text-muted" style={{ animationDelay: "160ms" }}>
          Everything you add stays private to your account.
        </p>
      </div>
    </div>
  );
}

export function NotFound() {
  const { navigate } = useRouter();
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center sm:py-32">
      <div className="relative mb-8 flex size-24 items-center justify-center rounded-3xl bg-accent-soft text-accent">
        <span className="font-mono text-3xl font-semibold tracking-tight">404</span>
        <span className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-xl border border-border bg-panel text-faint"><Icon name="search" className="size-4" /></span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The page you're looking for doesn't exist or may have been moved. Check the URL, or head back to your workspace.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <Button icon="dashboard" onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
        <Button variant="secondary" onClick={() => navigate("/")}>Back to home</Button>
      </div>
    </div>
  );
}
