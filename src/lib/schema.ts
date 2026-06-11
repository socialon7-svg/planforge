import { z } from "zod";
import { sectionKeys } from "@/types/plan";

export const ideaInputSchema = z.object({
  itemName: z.string().min(1),
  oneLine: z.string().min(1),
  industry: z.string().min(1),
  customers: z.string().min(1),
  customerProblem: z.string().min(1),
  solution: z.string().min(1),
  coreTech: z.string().min(1),
  competitors: z.string().optional().default(""),
  revenueModel: z.string().min(1),
  currentStatus: z.string().min(1),
  team: z.string().min(1),
  expectedBudget: z.string().min(1),
  targetOutputs: z.string().min(1),
  notes: z.string().optional().default(""),
});

const sectionSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export const diagnosisSchema = z.object({
  label: z.string(),
  status: z.enum(["good", "warning", "missing"]),
  comment: z.string(),
});

export const generatedPlanSchema = z.object({
  ...Object.fromEntries(sectionKeys.map((key) => [key, sectionSchema])),
  selfDiagnosis: z.array(diagnosisSchema),
});
