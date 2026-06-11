"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeneratedPlan, IdeaInput, SectionKey } from "@/types/plan";
import { sectionKeys } from "@/types/plan";
import { planToMarkdown, planToPlainText } from "@/lib/export";
import { sectionLabels } from "@/lib/sections";

const initialInput: IdeaInput = {
  itemName: "",
  oneLine: "",
  industry: "",
  customers: "",
  customerProblem: "",
  solution: "",
  coreTech: "",
  competitors: "",
  revenueModel: "",
  currentStatus: "",
  team: "",
  expectedBudget: "",
  targetOutputs: "",
  notes: "",
};

const sampleInput: IdeaInput = {
  itemName: "AI inventory assistant for small restaurants",
  oneLine: "A SaaS tool that predicts ingredient demand and reduces stockouts and food waste.",
  industry: "Food tech / retail tech",
  customers: "Small restaurants, cafes, and franchise store managers",
  customerProblem:
    "Small stores rely on manual ordering and intuition, causing frequent stockouts, over-ordering, waste, and staff time loss.",
  solution:
    "The service connects sales history and simple inventory inputs, recommends daily order quantities, and provides waste-risk alerts.",
  coreTech:
    "Demand forecasting, inventory anomaly detection, dashboard alerts, CSV/POS import, and lightweight mobile workflows.",
  competitors: "Excel sheets, POS reports, manual ordering, and generic inventory tools",
  revenueModel: "Monthly subscription by store, with optional onboarding fee for multi-store customers",
  currentStatus: "Problem interviews completed with target stores; clickable prototype and forecasting test dataset prepared.",
  team: "Founder handles product planning and customer discovery; developer handles MVP build; external advisor supports food-service operations.",
  expectedBudget: "KRW 50,000,000",
  targetOutputs: "MVP, pilot with 5 stores, demand-forecast report, and paid beta conversion plan",
  notes: "Write in a practical Korean government grant proposal tone. Avoid exaggerated marketing language.",
};

const fields: Array<{ key: keyof IdeaInput; label: string; placeholder: string; area?: boolean }> = [
  { key: "itemName", label: "\uCC3D\uC5C5\uC544\uC774\uD15C\uBA85", placeholder: "Example: AI inventory SaaS for small stores" },
  { key: "oneLine", label: "\uD55C \uC904 \uC124\uBA85", placeholder: "Who has what problem, and how you solve it" },
  { key: "industry", label: "\uC0B0\uC5C5 \uBD84\uC57C", placeholder: "Example: retail tech, edtech, healthcare" },
  { key: "customers", label: "\uC8FC\uC694 \uACE0\uAC1D", placeholder: "Example: small cafes and restaurants" },
  { key: "customerProblem", label: "\uACE0\uAC1D \uBB38\uC81C", placeholder: "Pain, cost, delay, or inefficiency customers face", area: true },
  { key: "solution", label: "\uD574\uACB0 \uBC29\uBC95", placeholder: "How your product or service solves the problem", area: true },
  { key: "coreTech", label: "\uD575\uC2EC \uAE30\uC220 \uB610\uB294 \uC81C\uD488 \uAE30\uB2A5", placeholder: "Core features, data, automation, AI scope", area: true },
  { key: "competitors", label: "\uACBD\uC7C1 \uC81C\uD488 \uB610\uB294 \uB300\uCCB4\uC7AC", placeholder: "Direct competitors, Excel, manual work, existing process" },
  { key: "revenueModel", label: "\uC218\uC775\uBAA8\uB378", placeholder: "Example: monthly subscription, setup fee, usage-based fee" },
  { key: "currentStatus", label: "\uD604\uC7AC \uC900\uBE44 \uC0C1\uD0DC", placeholder: "Example: prototype in progress, 10 customer interviews completed", area: true },
  { key: "team", label: "\uD300 \uAD6C\uC131", placeholder: "Describe roles and capabilities. Do not include personal data.", area: true },
  { key: "expectedBudget", label: "\uC608\uC0C1 \uC815\uBD80\uC9C0\uC6D0\uC0AC\uC5C5\uBE44", placeholder: "Example: KRW 50,000,000" },
  { key: "targetOutputs", label: "\uBAA9\uD45C \uC0B0\uCD9C\uBB3C", placeholder: "Example: MVP, 3 PoCs, 20 beta customers" },
  { key: "notes", label: "\uAE30\uD0C0 \uCC38\uACE0\uC0AC\uD56D", placeholder: "Constraints, tone, points to emphasize", area: true },
];

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PlanForgeApp() {
  const [input, setInput] = useState<IdeaInput>(initialInput);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("basicInfo");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [hwpxStatus, setHwpxStatus] = useState<{
    available: boolean;
    placeholders: string[];
    loaded: boolean;
  }>({ available: false, placeholders: [], loaded: false });

  const requiredReady = useMemo(
    () =>
      fields
        .filter((field) => field.key !== "competitors" && field.key !== "notes")
        .every((field) => input[field.key].trim().length > 0),
    [input],
  );

  const hwpxReady = hwpxStatus.available && hwpxStatus.placeholders.length > 0;

  useEffect(() => {
    let alive = true;
    fetch("/api/templates/hwpx/status")
      .then((response) => response.json())
      .then((status) => {
        if (!alive) return;
        setHwpxStatus({
          available: Boolean(status.available),
          placeholders: Array.isArray(status.placeholders) ? status.placeholders : [],
          loaded: true,
        });
      })
      .catch(() => {
        if (!alive) return;
        setHwpxStatus({ available: false, placeholders: [], loaded: true });
      });

    return () => {
      alive = false;
    };
  }, []);

  async function generatePlan() {
    setIsGenerating(true);
    setError("");
    setCopied("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed.");
      setPlan(data.plan);
      setActiveSection("basicInfo");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateSection(key: SectionKey, body: string) {
    if (!plan) return;
    setPlan({ ...plan, [key]: { ...plan[key], body } });
  }

  async function copyAll() {
    if (!plan) return;
    await navigator.clipboard.writeText(planToPlainText(plan));
    setCopied("Copied the full draft.");
  }

  async function exportHwpx() {
    if (!plan) return;
    setError("");
    const response = await fetch("/api/export/hwpx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "HWPX export failed.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "planforge-psst-draft.hwpx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">PlanForge RAG</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              \uC6B0\uC218 \uC0AC\uC5C5\uACC4\uD68D\uC11C \uC0AC\uB840 \uAE30\uBC18 AI \uC0AC\uC5C5\uACC4\uD68D\uC11C \uCD08\uC548 \uC0DD\uC131\uAE30
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Enter a startup idea and generate a Korean public grant proposal draft. RAG examples are used only as
              private writing-pattern references; raw chunks, source files, and personal data are never shown.
            </p>
          </div>
          <a
            href="#generator"
            className="inline-flex h-12 items-center justify-center rounded-md bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            \uC0AC\uC5C5\uACC4\uD68D\uC11C \uC0DD\uC131\uD558\uAE30
          </a>
        </div>
      </section>

      <section id="generator" className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[420px_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">\uC544\uC774\uB514\uC5B4 \uC785\uB825</h2>
            <p className="mt-1 text-sm text-slate-500">Fill the fields, then run local RAG search and AI generation.</p>
          </div>
          <button
            type="button"
            onClick={() => setInput(sampleInput)}
            className="mb-4 h-10 w-full rounded-md border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
          >
            \uC0D8\uD50C \uC785\uB825 \uBD88\uB7EC\uC624\uAE30
          </button>
          <div className="grid gap-4">
            {fields.map((field) => (
              <label key={field.key} className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">{field.label}</span>
                {field.area ? (
                  <textarea
                    value={input[field.key]}
                    placeholder={field.placeholder}
                    onChange={(event) => setInput({ ...input, [field.key]: event.target.value })}
                    rows={3}
                    className="min-h-24 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                ) : (
                  <input
                    value={input[field.key]}
                    placeholder={field.placeholder}
                    onChange={(event) => setInput({ ...input, [field.key]: event.target.value })}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={generatePlan}
            disabled={!requiredReady || isGenerating}
            className="mt-5 h-12 w-full rounded-md bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isGenerating ? "\uC0DD\uC131 \uC911..." : "\uC0AC\uC5C5\uACC4\uD68D\uC11C \uCD08\uC548 \uC0DD\uC131"}
          </button>
          {error ? <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="min-h-[720px] rounded-lg border border-slate-200 bg-white shadow-sm">
          {!plan ? (
            <div className="flex h-full min-h-[720px] flex-col items-center justify-center px-6 text-center">
              <h2 className="text-2xl font-semibold">\uC0DD\uC131 \uACB0\uACFC\uAC00 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4</h2>
              <p className="mt-3 max-w-xl text-slate-500">
                Edit each section, copy the full draft, or download JSON, Markdown, and HWPX files.
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h2 className="text-xl font-semibold">PSST \uC0AC\uC5C5\uACC4\uD68D\uC11C \uCD08\uC548</h2>
                  <p className="text-sm text-slate-500">Edit the generated sections before downloading.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50" onClick={copyAll}>
                    \uC804\uCCB4 \uBCF5\uC0AC
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                    onClick={() => downloadText("planforge-psst-draft.json", JSON.stringify(plan, null, 2), "application/json")}
                  >
                    JSON
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                    onClick={() => downloadText("planforge-psst-draft.md", planToMarkdown(plan), "text/markdown")}
                  >
                    Markdown
                  </button>
                  <button
                    className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    onClick={exportHwpx}
                    disabled={!hwpxReady}
                    title={!hwpxReady ? "Add supported placeholders to the HWPX template first." : "Download HWPX"}
                  >
                    HWPX \uB2E4\uC6B4\uB85C\uB4DC
                  </button>
                </div>
              </div>

              {copied ? <p className="mx-4 mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{copied}</p> : null}
              {hwpxStatus.loaded && !hwpxReady ? (
                <p className="mx-4 mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  HWPX template is present, but no supported placeholders were found. Add placeholders such as
                  {" {{PROBLEM}}"}, {" {{SOLUTION}}"}, and {" {{BUDGET}}"} to enable HWPX export.
                </p>
              ) : null}

              <div className="border-b border-slate-200 px-4 pt-4">
                <div className="flex gap-2 overflow-x-auto pb-3">
                  {sectionKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveSection(key)}
                      className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                        activeSection === key ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {sectionLabels[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{plan[activeSection].title}</h3>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                      onClick={async () => {
                        await navigator.clipboard.writeText(plan[activeSection].body);
                        setCopied(`Copied ${plan[activeSection].title}.`);
                      }}
                    >
                      \uC139\uC158 \uBCF5\uC0AC
                    </button>
                  </div>
                  <textarea
                    value={plan[activeSection].body}
                    onChange={(event) => updateSection(activeSection, event.target.value)}
                    rows={20}
                    className="min-h-[460px] w-full resize-y rounded-md border border-slate-300 bg-white p-4 text-sm leading-7 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-lg font-semibold">\uC790\uAC00\uC9C4\uB2E8</h3>
                  <div className="grid gap-2">
                    {plan.selfDiagnosis.map((item) => (
                      <div key={item.label} className="grid gap-1 rounded-md bg-white p-3 sm:grid-cols-[180px_1fr]">
                        <span
                          className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                            item.status === "good"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {item.status}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">{item.label}</p>
                          <p className="text-sm text-slate-500">{item.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
