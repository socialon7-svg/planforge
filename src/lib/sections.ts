import type { SectionKey } from "@/types/plan";

export const sectionLabels: Record<SectionKey, string> = {
  basicInfo: "\uAE30\uBCF8 \uC815\uBCF4",
  itemSummary: "\uC544\uC774\uD15C \uC694\uC57D",
  problem: "\uBB38\uC81C \uC778\uC2DD (Problem)",
  solution: "\uD574\uACB0 \uBC29\uC548 (Solution)",
  market: "\uC2DC\uC7A5 \uBD84\uC11D",
  competitor: "\uACBD\uC7C1 \uBD84\uC11D",
  businessModel: "\uBE44\uC988\uB2C8\uC2A4 \uBAA8\uB378",
  scaleUp: "\uC131\uC7A5\uC804\uB7B5 (Scale-up)",
  budget: "\uC0AC\uC5C5\uBE44 \uACC4\uD68D",
  roadmap: "\uCD94\uC9C4 \uC77C\uC815",
  team: "\uD300 \uAD6C\uC131 (Team)",
  partners: "\uD611\uB825\uAE30\uAD00",
};

export const sectionDatasetLabels: Record<SectionKey, string> = {
  basicInfo: "Basic Info",
  itemSummary: "Item Summary",
  problem: "Problem",
  solution: "Solution",
  market: "Market",
  competitor: "Competitor",
  businessModel: "Business Model",
  scaleUp: "Scale-up",
  budget: "Budget",
  roadmap: "Roadmap",
  team: "Team",
  partners: "Partners",
};

export const sectionGuides: Record<SectionKey, string> = {
  basicInfo: "Summarize item name, industry, customer, preparation status, and target output for a Korean public grant form.",
  itemSummary: "Make it clear what is provided to whom, through which functions, and what outcome is expected.",
  problem: "Follow market change -> customer pain -> limits of current alternatives -> need to solve.",
  solution: "Follow solution method -> core features -> MVP scope -> differentiation.",
  market: "Follow target market -> initial customers -> expansion market; mark statistics as requiring verification.",
  competitor: "Follow competitor groups -> limits of current methods -> differentiation points.",
  businessModel: "Follow revenue source -> pricing or billing model -> sales channel.",
  scaleUp: "Follow initial entry -> validation -> partnerships -> expansion strategy.",
  budget: "Follow expense category plan -> calculation basis -> commercialization relevance.",
  roadmap: "Follow agreement-period schedule -> year 1 -> year 2-3 expansion.",
  team: "Follow founder capability -> team roles -> plan to fill missing capabilities.",
  partners: "Follow partner institution type -> purpose -> timing of cooperation.",
};

export const sectionPlaceholders: Record<SectionKey, string> = {
  basicInfo: "BASIC_INFO",
  itemSummary: "ITEM_SUMMARY",
  problem: "PROBLEM",
  solution: "SOLUTION",
  market: "MARKET",
  competitor: "COMPETITOR",
  businessModel: "BUSINESS_MODEL",
  scaleUp: "SCALE_UP",
  budget: "BUDGET",
  roadmap: "ROADMAP",
  team: "TEAM",
  partners: "PARTNERS",
};
