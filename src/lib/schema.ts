import { z } from "zod";
import { sectionKeys } from "@/types/plan";

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const ideaInputSchema = z.object({
  itemName: requiredText(200),
  oneLine: requiredText(500),
  industry: requiredText(300),
  customers: requiredText(1000),
  customerProblem: requiredText(3000),
  solution: requiredText(3000),
  coreTech: requiredText(3000),
  competitors: optionalText(1000),
  revenueModel: requiredText(1000),
  currentStatus: requiredText(3000),
  team: requiredText(3000),
  expectedBudget: requiredText(300),
  targetOutputs: requiredText(1000),
  notes: optionalText(3000),
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
