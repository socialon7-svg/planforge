export const sectionKeys = [
  "basicInfo",
  "itemSummary",
  "problem",
  "solution",
  "market",
  "competitor",
  "businessModel",
  "scaleUp",
  "budget",
  "roadmap",
  "team",
  "partners",
] as const;

export type SectionKey = (typeof sectionKeys)[number];

export type IdeaInput = {
  itemName: string;
  oneLine: string;
  industry: string;
  customers: string;
  customerProblem: string;
  solution: string;
  coreTech: string;
  competitors: string;
  revenueModel: string;
  currentStatus: string;
  team: string;
  expectedBudget: string;
  targetOutputs: string;
  notes: string;
};

export type PlanSection = {
  title: string;
  body: string;
};

export type DiagnosisStatus = "good" | "warning" | "missing";

export type DiagnosisItem = {
  label: string;
  status: DiagnosisStatus;
  comment: string;
};

export type GeneratedPlan = Record<SectionKey, PlanSection> & {
  selfDiagnosis: DiagnosisItem[];
};

export type RagChunk = {
  chunk_id: string;
  source_file?: string;
  page_range?: string;
  program_type?: string;
  industry?: string;
  section?: string;
  content?: string;
  purpose?: string;
  tags?: string[];
  reusable_logic?: string;
  do_not_copy_phrases?: string[];
  privacy_status?: string;
};

export type RagReference = {
  chunkId: string;
  section: string;
  industry?: string;
  purpose?: string;
  tags: string[];
  reusableLogic?: string;
  score: number;
};
