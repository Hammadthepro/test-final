import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateEstimate, type EstimateResult } from "@/lib/estimate.functions";
import { Hammer, ArrowRight, ArrowLeft, Sparkles, Download, RotateCcw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildCost AI — Instant Construction Cost Estimates" },
      { name: "description", content: "AI-powered construction cost estimator. Get realistic project budgets in minutes via a guided 20-question interview." },
      { property: "og:title", content: "BuildCost AI" },
      { property: "og:description", content: "AI-powered construction cost estimates in minutes." },
    ],
  }),
  component: App,
});

type Phase = "landing" | "setup" | "chat" | "loading" | "result";

type Setup = { country: string; projectType: string; areaSize: string; areaUnit: string };

type Question = {
  id: string;
  prompt: string;
  type: "text" | "number" | "choice";
  choices?: string[];
  placeholder?: string;
};

const QUESTIONS: Question[] = [
  { id: "city", prompt: "Great — let's start with location. Which city is the project in?", type: "text", placeholder: "e.g. Lahore, Austin, Lagos" },
  { id: "soil", prompt: "What's the soil type at the site?", type: "choice", choices: ["Soft", "Medium", "Hard"] },
  { id: "floors", prompt: "How many floors will the structure have?", type: "number", placeholder: "e.g. 2" },
  { id: "basement", prompt: "Will the project include a basement?", type: "choice", choices: ["Yes", "No"] },
  { id: "structural", prompt: "What structural type do you prefer?", type: "choice", choices: ["Load-bearing", "RCC frame"] },
  { id: "quality", prompt: "Overall construction quality?", type: "choice", choices: ["Basic", "Medium", "Premium"] },
  { id: "cement", prompt: "Cement quality preference?", type: "choice", choices: ["Standard", "Branded mid-tier", "Premium branded"] },
  { id: "steel", prompt: "Steel reinforcement quality?", type: "choice", choices: ["Standard grade", "Grade 60", "Premium imported"] },
  { id: "brick", prompt: "Brick type?", type: "choice", choices: ["Clay (standard)", "Fly ash", "Concrete block", "Premium machine-made"] },
  { id: "roof", prompt: "Roof type?", type: "choice", choices: ["Flat (RCC)", "Sloped"] },
  { id: "electrical", prompt: "Electrical wiring quality?", type: "choice", choices: ["Basic", "Mid", "Premium"] },
  { id: "plumbing", prompt: "Plumbing quality?", type: "choice", choices: ["Basic (PVC)", "Mid (PPR/CPVC)", "Premium imported"] },
  { id: "flooring", prompt: "Flooring type?", type: "choice", choices: ["Tiles", "Marble", "Engineered wood", "Porcelain/Premium"] },
  { id: "windows", prompt: "Window material?", type: "choice", choices: ["Aluminum", "uPVC", "Wood", "Premium thermal-break"] },
  { id: "doors", prompt: "Door quality?", type: "choice", choices: ["Hollow flush", "Solid wood", "Premium engineered"] },
  { id: "paint", prompt: "Paint quality?", type: "choice", choices: ["Basic emulsion", "Mid weather-shield", "Premium"] },
  { id: "kitchen", prompt: "Kitchen finish level?", type: "choice", choices: ["Basic", "Modular mid", "Premium modular"] },
  { id: "bathroom", prompt: "Bathroom quality level?", type: "choice", choices: ["Basic", "Mid", "Luxury"] },
  { id: "luxury", prompt: "Any luxury features? (e.g. pool, smart home, lift) — type 'no' if none.", type: "text", placeholder: "e.g. smart home + lift, or 'no'" },
  { id: "timeline", prompt: "Finally — what's your timeline urgency?", type: "choice", choices: ["Normal", "Fast-track", "Urgent"] },
];

const COUNTRIES = ["Pakistan", "India", "United States", "United Kingdom", "Canada", "Australia", "United Arab Emirates", "Saudi Arabia", "Germany", "France", "Nigeria", "South Africa", "Brazil", "Mexico", "Other"];

function App() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [setup, setSetup] = useState<Setup>({ country: "", projectType: "House", areaSize: "", areaUnit: "sq ft" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runEstimate = useServerFn(generateEstimate);

  const submit = async (final: Record<string, string>) => {
    setPhase("loading");
    setError(null);
    try {
      const r = await runEstimate({ data: { setup, answers: final } });
      setResult(r);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("chat");
    }
  };

  const reset = () => {
    setPhase("landing");
    setAnswers({});
    setStep(0);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <button onClick={reset} className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Hammer className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">BuildCost <span className="brand-gradient-text">AI</span></span>
        </button>
        <div className="text-xs text-muted-foreground hidden sm:block">AI-powered construction estimates</div>
      </header>

      <main className="px-6 pb-20 max-w-6xl mx-auto">
        {phase === "landing" && <Landing onStart={() => setPhase("setup")} />}
        {phase === "setup" && (
          <Setup
            value={setup}
            onChange={setSetup}
            onBack={() => setPhase("landing")}
            onNext={() => { setPhase("chat"); setStep(0); }}
          />
        )}
        {phase === "chat" && (
          <Chat
            setup={setup}
            answers={answers}
            setAnswers={setAnswers}
            step={step}
            setStep={setStep}
            onComplete={submit}
            onBackToSetup={() => setPhase("setup")}
            error={error}
          />
        )}
        {phase === "loading" && <LoadingScreen />}
        {phase === "result" && result && <Result setup={setup} result={result} onReset={reset} />}
      </main>
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section className="pt-16 sm:pt-24 text-center max-w-3xl mx-auto animate-in-up">
      <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground glass">
        <Sparkles className="size-3 text-primary" /> Powered by AI · Built for builders
      </div>
      <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
        AI Construction <br className="hidden sm:block" />
        <span className="brand-gradient-text">Cost Estimator</span>
      </h1>
      <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
        Get instant, intelligent building cost estimates in minutes. Answer 20 quick questions and receive a professional, project-grade budget.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium shadow-lg shadow-primary/20 hover:brightness-110 transition"
        >
          Start Estimation <ArrowRight className="size-4" />
        </button>
      </div>
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {[
          { t: "Guided interview", d: "20 structured questions, no guesswork." },
          { t: "Country-aware rates", d: "Local materials and labor pricing." },
          { t: "Detailed breakdown", d: "Foundation, structure, finishing & more." },
        ].map((f) => (
          <div key={f.t} className="glass rounded-2xl p-5">
            <div className="text-sm font-medium">{f.t}</div>
            <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Setup({ value, onChange, onBack, onNext }: { value: Setup; onChange: (s: Setup) => void; onBack: () => void; onNext: () => void }) {
  const valid = value.country && value.projectType && value.areaSize && Number(value.areaSize) > 0;
  return (
    <section className="pt-10 max-w-xl mx-auto animate-in-up">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-4" /> Back
      </button>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">Project setup</h2>
      <p className="text-muted-foreground mt-1">Tell us the basics. We'll handle the rest.</p>

      <div className="mt-8 glass rounded-2xl p-6 space-y-5">
        <Field label="Country">
          <select
            value={value.country}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Project type">
          <div className="grid grid-cols-3 gap-2">
            {["House", "Residential Building", "Commercial Building"].map((t) => (
              <button
                key={t}
                onClick={() => onChange({ ...value, projectType: t })}
                className={`rounded-lg border px-3 py-2.5 text-sm transition ${value.projectType === t ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-muted-foreground text-muted-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Area size">
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={value.areaSize}
              onChange={(e) => onChange({ ...value, areaSize: e.target.value })}
              placeholder="e.g. 2400"
              className="flex-1 bg-input border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={value.areaUnit}
              onChange={(e) => onChange({ ...value, areaUnit: e.target.value })}
              className="w-32 bg-input border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option>sq ft</option>
              <option>marla</option>
              <option>m²</option>
            </select>
          </div>
        </Field>

        <button
          disabled={!valid}
          onClick={onNext}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
        >
          Continue <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{label}</div>
      {children}
    </label>
  );
}

type Msg = { role: "ai" | "user"; text: string; qid?: string };

function Chat({
  setup, answers, setAnswers, step, setStep, onComplete, onBackToSetup, error,
}: {
  setup: Setup;
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  step: number;
  setStep: (n: number) => void;
  onComplete: (final: Record<string, string>) => void;
  onBackToSetup: () => void;
  error: string | null;
}) {
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build conversation from answers + current step
  const messages = useMemo<Msg[]>(() => {
    const msgs: Msg[] = [
      { role: "ai", text: `Hi! I'm your AI estimator. I'll ask 20 quick questions about your ${setup.projectType.toLowerCase()} (${setup.areaSize} ${setup.areaUnit}) in ${setup.country}. Ready when you are.` },
    ];
    for (let i = 0; i <= step && i < QUESTIONS.length; i++) {
      msgs.push({ role: "ai", text: QUESTIONS[i].prompt, qid: QUESTIONS[i].id });
      const a = answers[QUESTIONS[i].id];
      if (a !== undefined && i < step) msgs.push({ role: "user", text: a, qid: QUESTIONS[i].id });
    }
    return msgs;
  }, [step, answers, setup]);

  useEffect(() => {
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 500);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  const q = QUESTIONS[step];
  const progress = ((step) / QUESTIONS.length) * 100;

  const answer = (val: string) => {
    if (!val.trim()) return;
    if (q.type === "number" && (isNaN(Number(val)) || Number(val) < 0)) return;
    const next = { ...answers, [q.id]: val.trim() };
    setAnswers(next);
    setDraft("");
    if (step + 1 >= QUESTIONS.length) {
      onComplete(next);
    } else {
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step === 0) { onBackToSetup(); return; }
    setStep(step - 1);
  };

  return (
    <section className="pt-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> {step === 0 ? "Back to setup" : "Previous question"}
        </button>
        <div className="text-xs text-muted-foreground">Question {Math.min(step + 1, QUESTIONS.length)} of {QUESTIONS.length}</div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div ref={scrollRef} className="mt-6 glass rounded-2xl p-4 sm:p-6 h-[55vh] overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.text} />
        ))}
        {typing && <Bubble role="ai" typing />}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      <div className="mt-4">
        {q.type === "choice" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {q.choices!.map((c) => (
              <button
                key={c}
                onClick={() => answer(c)}
                className="rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/10 px-3 py-2.5 text-sm text-left transition"
              >
                {c}
              </button>
            ))}
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); answer(draft); }}
            className="flex gap-2"
          >
            <input
              autoFocus
              type={q.type === "number" ? "number" : "text"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={q.placeholder}
              className="flex-1 bg-input border border-border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-lg bg-primary text-primary-foreground px-5 font-medium disabled:opacity-50 hover:brightness-110 transition"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Bubble({ role, text, typing }: { role: "ai" | "user"; text?: string; typing?: boolean }) {
  const isAi = role === "ai";
  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"} animate-in-up`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isAi ? "bg-secondary text-secondary-foreground rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"}`}>
        {typing ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="dot">●</span><span className="dot">●</span><span className="dot">●</span>
            <span className="ml-2 text-xs">AI is thinking…</span>
          </span>
        ) : text}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <section className="pt-32 text-center animate-in-up">
      <div className="mx-auto size-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
        <Loader2 className="size-7 text-primary animate-spin" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight">AI analyzing cost…</h2>
      <p className="mt-2 text-muted-foreground">Crunching local rates, materials, labor and finishes.</p>
    </section>
  );
}

function Result({ setup, result, onReset }: { setup: Setup; result: EstimateResult; onReset: () => void }) {
  const breakdown = Object.entries(result.breakdown ?? {});
  const max = Math.max(...breakdown.map(([, v]) => Number(String(v).replace(/[^\d.]/g, "")) || 0), 1);
  const fmt = (v: string | number) => {
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    if (!isFinite(n)) return String(v);
    return n.toLocaleString();
  };

  return (
    <section className="pt-6 max-w-5xl mx-auto animate-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Estimate for</div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {setup.projectType} · {setup.areaSize} {setup.areaUnit} · {setup.country}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card hover:border-primary px-4 py-2.5 text-sm transition">
            <Download className="size-4" /> Download PDF
          </button>
          <button onClick={onReset} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground hover:brightness-110 px-4 py-2.5 text-sm transition">
            <RotateCcw className="size-4" /> New estimate
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-6 md:col-span-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total estimate</div>
          <div className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight">
            <span className="brand-gradient-text">
              {result.currency} {fmt(result.total_estimate_min)} – {fmt(result.total_estimate_max)}
            </span>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">Range reflects market variance and finish choices.</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Cost per sq ft</div>
          <div className="mt-2 text-3xl font-semibold">{result.currency} {fmt(result.cost_per_sqft)}</div>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Cost breakdown</h3>
        <div className="mt-4 space-y-3">
          {breakdown.map(([k, v]) => {
            const n = Number(String(v).replace(/[^\d.]/g, "")) || 0;
            const pct = (n / max) * 100;
            return (
              <div key={k}>
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{k}</span>
                  <span className="font-medium">{result.currency} {fmt(v)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Assumptions</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {(result.assumptions ?? []).map((a, i) => <li key={i}>{a}</li>)}
            {(!result.assumptions || result.assumptions.length === 0) && <li>No assumptions provided.</li>}
          </ul>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Notes</h3>
          <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{result.notes || "—"}</p>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Estimate generated by AI. Verify with a licensed quantity surveyor before procurement.
      </p>
    </section>
  );
}
