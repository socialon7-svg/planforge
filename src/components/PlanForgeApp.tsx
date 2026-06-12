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
  itemName: "\uC18C\uADDC\uBAA8 \uC74C\uC2DD\uC810\uC744 \uC704\uD55C AI \uC7AC\uACE0 \uBC1C\uC8FC \uB3C4\uC6B0\uBBF8",
  oneLine:
    "\uB9E4\uCD9C \uD750\uB984\uACFC \uC7AC\uACE0 \uC785\uB825\uC744 \uBC14\uD0D5\uC73C\uB85C \uC2DD\uC790\uC7AC \uC218\uC694\uB97C \uC608\uCE21\uD558\uACE0 \uACB0\uD488\uACFC \uD3D0\uAE30\uC728\uC744 \uC904\uC774\uB294 SaaS \uB3C4\uAD6C",
  industry: "\uD478\uB4DC\uD14C\uD06C / \uB9AC\uD14C\uC77C\uD14C\uD06C",
  customers: "\uC18C\uADDC\uBAA8 \uC74C\uC2DD\uC810, \uCE74\uD398, \uD504\uB79C\uCC28\uC774\uC988 \uB9E4\uC7A5 \uAD00\uB9AC\uC790",
  customerProblem:
    "\uC18C\uADDC\uBAA8 \uB9E4\uC7A5\uC740 \uC218\uAE30 \uBC1C\uC8FC\uC640 \uACBD\uD5D8\uC5D0 \uC758\uC874\uD574 \uACB0\uD488, \uACFC\uC789 \uC7AC\uACE0, \uC2DD\uC790\uC7AC \uD3D0\uAE30, \uC9C1\uC6D0 \uC5C5\uBB34 \uBD80\uB2F4\uC774 \uBC18\uBCF5\uB429\uB2C8\uB2E4.",
  solution:
    "\uB9E4\uCD9C \uC774\uB825\uACFC \uAC04\uB2E8\uD55C \uC7AC\uACE0 \uC785\uB825\uC744 \uC5F0\uB3D9\uD574 \uC77C\uBCC4 \uAD8C\uC7A5 \uBC1C\uC8FC\uB7C9\uC744 \uC81C\uC548\uD558\uACE0 \uD3D0\uAE30 \uC704\uD5D8 \uC54C\uB9BC\uC744 \uC81C\uACF5\uD569\uB2C8\uB2E4.",
  coreTech:
    "\uC218\uC694 \uC608\uCE21, \uC7AC\uACE0 \uC774\uC0C1 \uD0D0\uC9C0, \uB300\uC2DC\uBCF4\uB4DC \uC54C\uB9BC, CSV/POS \uB370\uC774\uD130 \uAC00\uC838\uC624\uAE30, \uBAA8\uBC14\uC77C \uC911\uC2EC \uC5C5\uBB34 \uD750\uB984",
  competitors: "\uC5D1\uC140 \uC7AC\uACE0\uD45C, POS \uB9AC\uD3EC\uD2B8, \uC218\uAE30 \uBC1C\uC8FC, \uBC94\uC6A9 \uC7AC\uACE0\uAD00\uB9AC \uB3C4\uAD6C",
  revenueModel: "\uB9E4\uC7A5\uBCC4 \uC6D4 \uAD6C\uB3C5\uB8CC\uC640 \uB2E4\uC810\uD3EC \uACE0\uAC1D \uB300\uC0C1 \uCD08\uAE30 \uC628\uBCF4\uB529 \uBE44\uC6A9",
  currentStatus:
    "\uD0C0\uAE43 \uB9E4\uC7A5 \uC778\uD130\uBDF0\uB97C \uC644\uB8CC\uD588\uACE0 \uD074\uB9AD \uAC00\uB2A5\uD55C \uD504\uB85C\uD1A0\uD0C0\uC785\uACFC \uC218\uC694 \uC608\uCE21 \uD14C\uC2A4\uD2B8 \uB370\uC774\uD130\uB97C \uC900\uBE44\uD588\uC2B5\uB2C8\uB2E4.",
  team:
    "\uB300\uD45C\uC790\uB294 \uC81C\uD488 \uAE30\uD68D\uACFC \uACE0\uAC1D \uAC80\uC99D\uC744 \uB2F4\uB2F9\uD558\uACE0, \uAC1C\uBC1C\uC790\uB294 MVP \uAD6C\uCD95\uC744 \uB2F4\uB2F9\uD558\uBA70, \uC678\uBD80 \uC790\uBB38 \uC778\uB825\uC774 \uC678\uC2DD\uC5C5 \uC6B4\uC601 \uAD00\uC810\uC744 \uBCF4\uC644\uD569\uB2C8\uB2E4.",
  expectedBudget: "5,000\uB9CC \uC6D0",
  targetOutputs:
    "MVP, 5\uAC1C \uB9E4\uC7A5 \uD30C\uC77C\uB7FF, \uC218\uC694 \uC608\uCE21 \uAC80\uC99D \uB9AC\uD3EC\uD2B8, \uC720\uB8CC \uBCA0\uD0C0 \uC804\uD658 \uACC4\uD68D",
  notes:
    "\uACF5\uACF5\uC9C0\uC6D0\uC0AC\uC5C5 \uC81C\uCD9C\uC6A9 \uBB38\uCCB4\uB85C \uC791\uC131\uD558\uACE0 \uACFC\uC7A5\uB41C \uAD11\uACE0 \uBB38\uAD6C\uB294 \uD53C\uD574\uC8FC\uC138\uC694.",
};

const fields: Array<{ key: keyof IdeaInput; label: string; placeholder: string; area?: boolean }> = [
  { key: "itemName", label: "\uCC3D\uC5C5\uC544\uC774\uD15C\uBA85", placeholder: "\uC608: \uC18C\uADDC\uBAA8 \uB9E4\uC7A5 AI \uC7AC\uACE0\uAD00\uB9AC SaaS" },
  { key: "oneLine", label: "\uD55C \uC904 \uC124\uBA85", placeholder: "\uB204\uAD6C\uC758 \uC5B4\uB5A4 \uBB38\uC81C\uB97C \uC5B4\uB5BB\uAC8C \uD574\uACB0\uD558\uB294\uC9C0 \uD55C \uBB38\uC7A5\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694" },
  { key: "industry", label: "\uC0B0\uC5C5 \uBD84\uC57C", placeholder: "\uC608: \uB9AC\uD14C\uC77C\uD14C\uD06C, \uD478\uB4DC\uD14C\uD06C, \uC5D0\uB4C0\uD14C\uD06C, \uD5EC\uC2A4\uCF00\uC5B4" },
  { key: "customers", label: "\uC8FC\uC694 \uACE0\uAC1D", placeholder: "\uC608: \uC18C\uADDC\uBAA8 \uCE74\uD398\uC640 \uC74C\uC2DD\uC810 \uC6B4\uC601\uC790" },
  { key: "customerProblem", label: "\uACE0\uAC1D \uBB38\uC81C", placeholder: "\uACE0\uAC1D\uC774 \uACAA\uB294 \uBE44\uC6A9, \uC2DC\uAC04, \uD488\uC9C8, \uC5C5\uBB34 \uBE44\uD6A8\uC728 \uBB38\uC81C\uB97C \uC785\uB825\uD558\uC138\uC694", area: true },
  { key: "solution", label: "\uD574\uACB0 \uBC29\uBC95", placeholder: "\uC81C\uD488 \uB610\uB294 \uC11C\uBE44\uC2A4\uAC00 \uBB38\uC81C\uB97C \uD574\uACB0\uD558\uB294 \uBC29\uC2DD\uC744 \uC785\uB825\uD558\uC138\uC694", area: true },
  { key: "coreTech", label: "\uD575\uC2EC \uAE30\uC220 \uB610\uB294 \uC81C\uD488 \uAE30\uB2A5", placeholder: "\uD575\uC2EC \uAE30\uB2A5, \uB370\uC774\uD130, \uC790\uB3D9\uD654, AI \uC801\uC6A9 \uBC94\uC704\uB97C \uC785\uB825\uD558\uC138\uC694", area: true },
  { key: "competitors", label: "\uACBD\uC7C1 \uC81C\uD488 \uB610\uB294 \uB300\uCCB4\uC7AC", placeholder: "\uC9C1\uC811 \uACBD\uC7C1\uC0AC, \uC5D1\uC140, \uC218\uC791\uC5C5, \uAE30\uC874 \uC5C5\uBB34 \uBC29\uC2DD \uB4F1" },
  { key: "revenueModel", label: "\uC218\uC775\uBAA8\uB378", placeholder: "\uC608: \uC6D4 \uAD6C\uB3C5\uB8CC, \uAD6C\uCD95\uBE44, \uC0AC\uC6A9\uB7C9 \uAE30\uBC18 \uACFC\uAE08" },
  { key: "currentStatus", label: "\uD604\uC7AC \uC900\uBE44 \uC0C1\uD0DC", placeholder: "\uC608: \uD504\uB85C\uD1A0\uD0C0\uC785 \uC81C\uC791 \uC911, \uACE0\uAC1D \uC778\uD130\uBDF0 10\uAC74 \uC644\uB8CC", area: true },
  { key: "team", label: "\uD300 \uAD6C\uC131", placeholder: "\uC5ED\uD560\uACFC \uC5ED\uB7C9 \uC911\uC2EC\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694. \uAC1C\uC778\uC815\uBCF4\uB294 \uD3EC\uD568\uD558\uC9C0 \uB9C8\uC138\uC694.", area: true },
  { key: "expectedBudget", label: "\uC608\uC0C1 \uC815\uBD80\uC9C0\uC6D0\uC0AC\uC5C5\uBE44", placeholder: "\uC608: 5,000\uB9CC \uC6D0" },
  { key: "targetOutputs", label: "\uBAA9\uD45C \uC0B0\uCD9C\uBB3C", placeholder: "\uC608: MVP, PoC 3\uAC74, \uBCA0\uD0C0 \uACE0\uAC1D 20\uACF3" },
  { key: "notes", label: "\uAE30\uD0C0 \uCC38\uACE0\uC0AC\uD56D", placeholder: "\uC81C\uC57D\uC870\uAC74, \uAC15\uC870\uD560 \uC810, \uC6D0\uD558\uB294 \uBB38\uCCB4 \uB4F1\uC744 \uC785\uB825\uD558\uC138\uC694", area: true },
];

const uiText = {
  heroTitle:
    "\uC6B0\uC218 \uC0AC\uC5C5\uACC4\uD68D\uC11C \uC0AC\uB840 \uAE30\uBC18 AI \uC0AC\uC5C5\uACC4\uD68D\uC11C \uCD08\uC548 \uC0DD\uC131\uAE30",
  heroDescription:
    "\uCC3D\uC5C5 \uC544\uC774\uB514\uC5B4\uB97C \uC785\uB825\uD558\uBA74 PSST \uBB38\uCCB4\uC758 \uACF5\uACF5\uC9C0\uC6D0\uC0AC\uC5C5 \uC0AC\uC5C5\uACC4\uD68D\uC11C \uCD08\uC548\uC744 \uC0DD\uC131\uD569\uB2C8\uB2E4. RAG \uC0AC\uB840\uB294 \uB0B4\uBD80 \uC791\uC131 \uD328\uD134 \uCC38\uACE0\uC6A9\uC73C\uB85C\uB9CC \uC0AC\uC6A9\uD558\uBA70 \uC6D0\uBB38, \uCD9C\uCC98 \uD30C\uC77C, \uAC1C\uC778\uC815\uBCF4\uB294 \uD654\uBA74\uC5D0 \uB178\uCD9C\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  cta: "\uC0AC\uC5C5\uACC4\uD68D\uC11C \uC0DD\uC131\uD558\uAE30",
  ideaInput: "\uC544\uC774\uB514\uC5B4 \uC785\uB825",
  inputHelp:
    "\uD544\uC218 \uD56D\uBAA9\uC744 \uC785\uB825\uD55C \uB4A4 \uB85C\uCEEC RAG \uAC80\uC0C9\uACFC AI \uC0DD\uC131\uC744 \uC2E4\uD589\uD569\uB2C8\uB2E4.",
  loadSample: "\uC0D8\uD50C \uC785\uB825 \uBD88\uB7EC\uC624\uAE30",
  emptyTitle: "\uC0DD\uC131 \uACB0\uACFC\uAC00 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4",
  emptyDescription:
    "\uC139\uC158\uBCC4 \uC218\uC815, \uC804\uCCB4 \uBCF5\uC0AC, JSON/Markdown/HWPX \uB2E4\uC6B4\uB85C\uB4DC\uB97C \uBC14\uB85C \uD14C\uC2A4\uD2B8\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  resultTitle: "PSST \uC0AC\uC5C5\uACC4\uD68D\uC11C \uCD08\uC548",
  resultHelp:
    "\uC0DD\uC131\uB41C \uC139\uC158\uC744 \uD655\uC778\uD558\uACE0 \uD544\uC694\uD55C \uD45C\uD604\uC744 \uC9C1\uC811 \uC218\uC815\uD55C \uB4A4 \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC138\uC694.",
  copyAll: "\uC804\uCCB4 \uBCF5\uC0AC",
  hwpDownload: "HWPX \uB2E4\uC6B4\uB85C\uB4DC",
  hwpNoPlaceholders:
    "\uACF5\uC2DD PSST HWPX \uC591\uC2DD\uC758 \uD45C\uC640 \uBB38\uB2E8 \uAD6C\uC870\uB97C \uC720\uC9C0\uD55C \uCC44, \uC0DD\uC131 \uACB0\uACFC\uB97C \uC591\uC2DD \uB0B4\uC6A9\uC73C\uB85C \uCC44\uC6CC \uB0B4\uBCF4\uB0C5\uB2C8\uB2E4.",
  copySection: "\uC139\uC158 \uBCF5\uC0AC",
  diagnosis: "\uC790\uAC00\uC9C4\uB2E8",
};

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
  const [generationProgress, setGenerationProgress] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [hwpxStatus, setHwpxStatus] = useState<{
    available: boolean;
    placeholders: string[];
    generatedExport: boolean;
    loaded: boolean;
  }>({ available: false, placeholders: [], generatedExport: false, loaded: false });

  const requiredReady = useMemo(
    () =>
      fields
        .filter((field) => field.key !== "competitors" && field.key !== "notes")
        .every((field) => input[field.key].trim().length > 0),
    [input],
  );

  const hwpxReady = hwpxStatus.available && (hwpxStatus.placeholders.length > 0 || hwpxStatus.generatedExport);

  useEffect(() => {
    let alive = true;
    fetch("/api/templates/hwpx/status")
      .then((response) => response.json())
      .then((status) => {
        if (!alive) return;
        setHwpxStatus({
          available: Boolean(status.available),
          placeholders: Array.isArray(status.placeholders) ? status.placeholders : [],
          generatedExport: Boolean(status.generatedExport),
          loaded: true,
        });
      })
      .catch(() => {
        if (!alive) return;
        setHwpxStatus({ available: false, placeholders: [], generatedExport: false, loaded: true });
      });

    return () => {
      alive = false;
    };
  }, []);

  async function generatePlan() {
    setIsGenerating(true);
    setGenerationProgress("사업 아이디어와 입력값을 정리하고 있습니다...");
    setError("");
    setCopied("");
    const progressMessages = [
      "RAG 작성 패턴을 검색하고 있습니다...",
      "PSST 구조에 맞춰 초안을 구성하고 있습니다...",
      "자가진단 항목을 점검하고 있습니다...",
      "최종 JSON 응답을 정리하고 있습니다...",
    ];
    let progressIndex = 0;
    const progressTimer = window.setInterval(() => {
      setGenerationProgress(progressMessages[Math.min(progressIndex, progressMessages.length - 1)]);
      progressIndex += 1;
    }, 8000);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "\uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      setPlan(data.plan);
      setActiveSection("basicInfo");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "\uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      window.clearInterval(progressTimer);
      setIsGenerating(false);
      setGenerationProgress("");
    }
  }

  function updateSection(key: SectionKey, body: string) {
    if (!plan) return;
    setPlan({ ...plan, [key]: { ...plan[key], body } });
  }

  async function copyAll() {
    if (!plan) return;
    await navigator.clipboard.writeText(planToPlainText(plan));
    setCopied("\uC804\uCCB4 \uCD08\uC548\uC744 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.");
  }

  async function exportHwpx() {
    if (!plan) return;
    setError("");
    try {
      const response = await fetch("/api/export/hwpx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          data.error ??
            "HWPX 다운로드에 실패했습니다. Markdown 또는 JSON으로 먼저 내려받은 뒤 다시 시도해주세요.",
        );
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "planforge-psst-draft.hwpx";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {
      setError("HWPX 다운로드 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">PlanForge RAG</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{uiText.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">{uiText.heroDescription}</p>
          </div>
          <a
            href="#generator"
            className="inline-flex h-12 items-center justify-center rounded-md bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            {uiText.cta}
          </a>
        </div>
      </section>

      <section id="generator" className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[420px_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">{uiText.ideaInput}</h2>
            <p className="mt-1 text-sm text-slate-500">{uiText.inputHelp}</p>
          </div>
          <button
            type="button"
            onClick={() => setInput(sampleInput)}
            className="mb-4 h-10 w-full rounded-md border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
          >
            {uiText.loadSample}
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
            {isGenerating ? generationProgress || "\uC0DD\uC131 \uC911..." : "\uC0AC\uC5C5\uACC4\uD68D\uC11C \uCD08\uC548 \uC0DD\uC131"}
          </button>
          {error ? <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="min-h-[720px] rounded-lg border border-slate-200 bg-white shadow-sm">
          {!plan ? (
            <div className="flex h-full min-h-[720px] flex-col items-center justify-center px-6 text-center">
              <h2 className="text-2xl font-semibold">{uiText.emptyTitle}</h2>
              <p className="mt-3 max-w-xl text-slate-500">{uiText.emptyDescription}</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h2 className="text-xl font-semibold">{uiText.resultTitle}</h2>
                  <p className="text-sm text-slate-500">{uiText.resultHelp}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50" onClick={copyAll}>
                    {uiText.copyAll}
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
                    title={!hwpxReady ? "HWPX \uD15C\uD50C\uB9BF\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." : uiText.hwpDownload}
                  >
                    {uiText.hwpDownload}
                  </button>
                </div>
              </div>

              {copied ? <p className="mx-4 mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{copied}</p> : null}
              {hwpxStatus.loaded && hwpxReady && hwpxStatus.placeholders.length === 0 ? (
                <p className="mx-4 mt-4 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-800">{uiText.hwpNoPlaceholders}</p>
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
                        setCopied(`\uC139\uC158\uC744 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4. (${plan[activeSection].title})`);
                      }}
                    >
                      {uiText.copySection}
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
                  <h3 className="mb-3 text-lg font-semibold">{uiText.diagnosis}</h3>
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
