import { z } from 'zod';
const text = z.string().trim().min(1).max(4000);
export const questionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  title: text,
  hint: z.string().max(800),
  type: z.enum(['text', 'single', 'multi']),
  options: z.array(z.string().min(1).max(120)).max(10),
  reason: z.string().max(600)
}).refine(q => q.type === 'text' || q.options.length >= 2, '选择题至少需要两个选项');
export const answerSchema = z.object({ questionId: z.string(), value: z.string().max(4000), skipped: z.boolean() });
export const roundSchema = z.object({
  round: z.number().int().min(1).max(3),
  summary: z.string().max(1800),
  questions: z.array(questionSchema).min(1).max(7),
  answers: z.array(answerSchema).max(7)
}).superRefine((r,ctx)=>{
  const ids=r.questions.map(q=>q.id);
  if(new Set(ids).size!==ids.length) ctx.addIssue({code:'custom',message:'问题标识重复'});
  const answered=new Set<string>();
  for(const a of r.answers){if(!ids.includes(a.questionId)||answered.has(a.questionId)) ctx.addIssue({code:'custom',message:'回答与问题不匹配'}); answered.add(a.questionId);}
});
export const interviewSchema = z.object({ rounds: z.array(roundSchema).min(1).max(3) }).superRefine((v,ctx)=>{
  v.rounds.forEach((r,i)=>{if(r.round!==i+1)ctx.addIssue({code:'custom',message:'访谈轮次必须连续'});});
});
export type Question = z.infer<typeof questionSchema>;
export type Round = z.infer<typeof roundSchema>;
export type Interview = z.infer<typeof interviewSchema>;
export const followupSchema = z.object({
  summary: z.string().min(1).max(1800),
  questions: z.array(questionSchema).min(1).max(5)
}).superRefine((v,ctx)=>{if(new Set(v.questions.map(q=>q.id)).size!==v.questions.length)ctx.addIssue({code:'custom',message:'重复的问题 ID'});});
export const findingSchema = z.object({
  statement: text,
  kind: z.enum(['fact','hypothesis','unknown']),
  evidence: z.array(z.string().max(100)).max(8)
});
export const reportSchema = z.object({
  title: z.string().min(1).max(120),
  overview: text,
  profile: z.object({stage:text,findings:z.array(findingSchema).min(3).max(12),coreNeeds:z.array(text).min(1).max(5),constraints:z.array(text).min(1).max(6)}),
  vision: z.object({life:text,goals:z.array(text).min(1).max(5),criteria:z.array(text).min(1).max(6),openQuestions:z.array(text).min(1).max(6)}),
  directions: z.array(z.object({name:text,rationale:text,evidence:z.array(z.string().max(100)).min(1).max(6),fit:text,feasibility:text,opportunities:text,barriers:text,risks:text,firstExperiment:text})).min(2).max(3),
  priority: z.object({direction:text,reason:text}),
  roadmap: z.array(z.object({horizon:z.enum(['长期愿景','3—5年','未来1年','未来90天']),goal:text,milestones:z.array(text).min(1).max(5),uncertainties:text})).length(4),
  actions: z.array(z.object({title:text,steps:z.array(text).min(2).max(6),time:text,resources:text,outcome:text,obstacle:text})).min(3).max(6),
  review: z.object({signals:z.array(text).min(2).max(6),changeTriggers:z.array(text).min(2).max(6),nextReview:text,questions:z.array(text).min(1).max(6)}),
  limitations:z.array(text).min(1).max(6)
}).superRefine((r,ctx)=>{if(new Set(r.roadmap.map(x=>x.horizon)).size!==4)ctx.addIssue({code:'custom',message:'阶段路径需要四个不同的时间范围'});});
export type Report = z.infer<typeof reportSchema>;
export const requestSchema=z.object({action:z.enum(['followup','report']),interview:interviewSchema});
export const savedSchema=z.object({version:z.literal(1),rounds:z.array(roundSchema).min(1).max(3),cursor:z.number().int().min(0).max(6),roundIndex:z.number().int().min(0).max(2),consent:z.boolean(),screen:z.enum(['home','interview','report']),report:reportSchema.nullable(),updatedAt:z.string()});
export type SavedSession=z.infer<typeof savedSchema>;
