import type { SectionKey } from "@/types/plan";

export const sectionLabels: Record<SectionKey, string> = {
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
