"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "../lib/theme";
import { Button, ThemeToggle, cx } from "../components/ui";
import { Icon } from "../components/Icons";

function TopBar() {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-panel/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Icon name="logo" className="size-7 transition-transform group-hover:scale-105" />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">DocuMind AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} toggle={toggle} />
          <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
            Log in
          </Button>
          <Button size="sm" onClick={() => router.push("/signup")}>
            Sign up
          </Button>
        </div>
      </div>
    </header>
  );
}

function ProductPreview() {
  const [mockQuery, setMockQuery] = useState("");

  return (
    <div className="dm-fade-up relative w-full">
      {/* Soft accent glow behind the preview card */}
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-accent-soft/80 blur-2xl transition-all"
      />
      
      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-foreground/[0.06] ring-1 ring-foreground/[0.03] transition-colors">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-border bg-surface/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-border-strong" />
            <span className="size-2.5 rounded-full bg-border-strong" />
            <span className="size-2.5 rounded-full bg-border-strong" />
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-panel px-2.5 py-1 font-mono text-[11px] text-muted">
            <Icon name="library" className="size-3.5 text-accent" />
            <span>Generative AI Course</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Conversation display */}
        <div className="space-y-4 px-5 py-5">
          {/* User message bubble */}
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[13px] leading-relaxed text-white shadow-sm">
              What is the difference between BM25 and vector search?
            </p>
          </div>

          {/* Assistant message */}
          <div className="flex gap-3 items-start">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
              <Icon name="sparkle" className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-relaxed text-foreground">
                BM25 ranks by keyword overlap — precise on exact terms. Vector search retrieves by{" "}
                <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent">
                  semantic similarity
                </span>
                , capturing meaning across paraphrase. Hybrid retrieval fuses both.
              </p>

              {/* Verified Citations */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { name: "Advanced RAG.pdf", loc: "Page 23", type: "doc" },
                  { name: "Course Notes.docx", loc: "§ BM25", type: "doc" },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-3 py-2 transition-colors hover:border-border-strong"
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                      <Icon name="doc" className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-foreground">{c.name}</p>
                      <p className="font-mono text-[10px] font-medium text-accent">{c.loc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-border bg-surface/30 px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMockQuery("");
            }}
            className="flex items-center gap-2 rounded-xl border border-border-strong bg-panel px-3.5 py-2 shadow-inner focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all"
          >
            <input
              type="text"
              value={mockQuery}
              onChange={(e) => setMockQuery(e.target.value)}
              placeholder="Ask anything about your knowledge…"
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-faint focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Send"
              className="flex size-7 items-center justify-center rounded-lg bg-accent text-white shadow-sm transition-transform active:scale-95 hover:bg-accent-hover"
            >
              <Icon name="send" className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const flowSteps = [
  { icon: "sources", label: "Sources" },
  { icon: "layers", label: "Retrieve" },
  { icon: "sparkle", label: "Answer" },
  { icon: "quote", label: "Cite" },
];

function FlowStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
      {flowSteps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-1.5 shadow-sm transition-all hover:border-border-strong">
            <Icon
              name={s.icon}
              className={cx("size-4", i === 2 ? "text-accent" : "text-muted")}
            />
            <span className="text-[13px] font-medium text-foreground">{s.label}</span>
          </div>
          {i < flowSteps.length - 1 && (
            <Icon name="arrow-right" className="size-3.5 text-faint shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors flex flex-col selection:bg-accent/20 selection:text-accent">
      <TopBar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        {/* Subtle grid + radial wash background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.45] dark:opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          }}
        />

        <div className="mx-auto max-w-6xl px-5">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            {/* Left Column Text */}
            <div className="text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-1 font-mono text-xs text-muted shadow-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                <span>Retrieval-Augmented Generation</span>
              </div>

              {/* Main Headline */}
              <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.08] tracking-tight sm:text-[3.4rem] text-foreground">
                Turn your knowledge into an AI you can{" "}
                <span className="text-accent">ask anything</span>
              </h1>

              {/* Supporting Subheadline */}
              <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-muted">
                Upload documents, add YouTube videos, and ask questions about your own knowledge using grounded
                Retrieval-Augmented Generation.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="md"
                  onClick={() => router.push("/dashboard")}
                  icon="plus"
                  className="w-full sm:w-auto"
                >
                  Create knowledge base
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={scrollToHowItWorks}
                  icon="arrow-right"
                  iconPosition="right"
                  className="w-full sm:w-auto"
                >
                  See how it works
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="mt-8 flex items-center gap-5 text-[13px] text-muted">
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon name="check" className="size-4 text-ready" /> Private by design
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon name="check" className="size-4 text-ready" /> Cited answers
                </span>
                <span className="hidden items-center gap-1.5 font-medium sm:flex">
                  <Icon name="check" className="size-4 text-ready" /> No credit card
                </span>
              </div>
            </div>

            {/* Right Column Product Preview */}
            <div className="w-full">
              <ProductPreview />
            </div>
          </div>

          {/* Process Flow Strip */}
          <div className="mt-16 sm:mt-20">
            <FlowStrip />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="border-y border-border bg-panel py-20 transition-colors">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl text-left">
            <p className="font-mono text-xs uppercase tracking-wider text-accent font-medium">HOW IT WORKS</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
              From scattered sources to answers you can trust
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                n: "01",
                icon: "upload",
                t: "Add your sources",
                d: "Bring together PDFs, Word docs, spreadsheets, notes and YouTube lectures in one knowledge base.",
              },
              {
                n: "02",
                icon: "chat",
                t: "Ask in plain language",
                d: "Ask natural questions. DocuMind retrieves the most relevant passages before answering.",
              },
              {
                n: "03",
                icon: "quote",
                t: "Verify every answer",
                d: "Each response links back to the exact document and page it came from — no guessing.",
              },
            ].map((c) => (
              <div
                key={c.n}
                className="group rounded-2xl border border-border bg-background p-6 transition-all duration-200 hover:border-accent/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-105">
                    <Icon name={c.icon} className="size-5" />
                  </div>
                  <span className="font-mono text-sm font-medium text-faint">{c.n}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground tracking-tight">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Sources & Features Section */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left info */}
          <div className="text-left">
            <p className="font-mono text-xs uppercase tracking-wider text-accent font-medium">SUPPORTED SOURCES</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
              Everything your research already lives in
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Documents and video lectures are processed, chunked and indexed automatically. Add as many as you need —
              DocuMind keeps them organised and searchable.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["PDF", "DOCX", "TXT", "Markdown", "CSV", "XLSX", "YouTube"].map((t) => (
                <span
                  key={t}
                  className="rounded-xl border border-border bg-panel px-3.5 py-2 font-mono text-[13px] text-muted transition-colors hover:border-accent/40 hover:text-foreground shadow-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right 2x2 grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: "sparkle",
                t: "RAG-powered Q&A",
                d: "Answers are generated only from your sources — grounded in retrieved context, not the open internet.",
              },
              {
                icon: "quote",
                t: "Source citations",
                d: "Every claim links to the document, page or timestamp it came from.",
              },
              {
                icon: "layers",
                t: "Automatic indexing",
                d: "Files are chunked and embedded the moment you add them.",
              },
              {
                icon: "shield",
                t: "Private by design",
                d: "Your knowledge bases stay yours. Nothing is shared or trained on.",
              },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-2xl border border-border bg-panel p-5 text-left transition-colors hover:border-border-strong"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon name={f.icon} className="size-4.5" />
                </div>
                <h3 className="mt-3.5 text-[15px] font-semibold text-foreground tracking-tight">{f.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="mx-auto max-w-6xl px-5 pb-20 w-full">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-foreground px-8 py-16 text-center text-background shadow-xl">
          {/* Radial accent glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 0%, var(--color-accent), transparent 65%)",
            }}
          />

          <div className="relative z-10">
            <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl text-background">
              Build your first knowledge base in minutes
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm sm:text-base text-background/70">
              Private by design. Your sources stay yours.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                size="md"
                variant="secondary"
                onClick={() => router.push("/dashboard")}
                icon="plus"
                className="bg-background text-foreground hover:opacity-90 shadow-md font-semibold px-6"
              >
                Create knowledge base
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-panel transition-colors">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <Icon name="logo" className="size-5" />
            <span className="font-semibold text-foreground tracking-tight">DocuMind AI</span>
          </div>
          <p className="text-xs sm:text-sm">© 2026 DocuMind AI. A private knowledge workspace powered by RAG.</p>
        </div>
      </footer>

      {/* Floating help trigger */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={scrollToHowItWorks}
          aria-label="Help"
          className="flex size-9 items-center justify-center rounded-full border border-border bg-panel text-muted shadow-lg hover:border-border-strong hover:text-foreground transition-transform active:scale-95"
        >
          <Icon name="help" className="size-4" />
        </button>
      </div>
    </div>
  );
}
