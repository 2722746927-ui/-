import {isLegacyInterview,upgradeInterview} from '../src/lib/interview-upgrade';
import { describe,it,expect,vi } from 'vitest';
import { reportSchema,savedReportSchema } from '../src/lib/schema';
import { generate,validateFollowupFocus,validateEvidence,transcript } from '../src/lib/server';
import { SYSTEM_PROMPT,REPORT_FORMAT,followupInstruction } from '../src/lib/prompts';
import { PLANNING_STAGES } from '../src/lib/workflow';
import { blankSession,loadSession,encodeBackup,decodeBackup } from '../src/lib/session';
import { interview,report } from './fixtures';
const config={DEEPSEEK_API_KEY:'test-only'};
const q=(id:string,topic:'self'|'future'|'constraints')=>({id,title:topic==='future'?`未来生活选择 ${id}？`:`补充条件 ${id}？`,hint:'可以不知道或跳过',type:'text' as const,options:[],reason:'基于当前访谈澄清关键意愿',topic});
const response=(data:unknown)=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(data)}}]});
describe('three collection rounds and four planning stages',()=>{
 it('defines the four ordered stages separately from collection rounds',()=>{expect(PLANNING_STAGES).toEqual(['认识自己','明确未来想要的生活','倒推个人发展路径','建立内在行动动力']);expect(SYSTEM_PROMPT).toContain('不能把一轮对应一个阶段');for(let i=0;i<3;i++)expect(SYSTEM_PROMPT.indexOf(`${i+1} ${PLANNING_STAGES[i]}`)).toBeLessThan(SYSTEM_PROMPT.indexOf(`${i+2} ${PLANNING_STAGES[i+1]}`));expect(REPORT_FORMAT).toContain('"reportVersion":2');expect(REPORT_FORMAT).toContain('actionIndex从0开始');});
 it('requires future-life exploration in round two and future-direction clarification in round three',()=>{expect(followupInstruction(2)).toContain('本轮必须开始探索用户对未来生活的期待');expect(followupInstruction(3)).toContain('未来方向澄清');expect(()=>validateFollowupFocus({questions:[q('a','self'),q('b','self'),q('c','future')]},2)).toThrow();expect(()=>validateFollowupFocus({questions:[q('a','future'),q('b','future'),q('c','self')]},3)).toThrow();expect(()=>validateFollowupFocus({questions:[q('a','future'),q('b','future'),q('c','constraints')]},3)).not.toThrow();});
 it('repairs a self-only second round instead of silently showing it as future exploration',async()=>{const data=interview();data.rounds=data.rounds.slice(0,1);const good={summary:'探索期待的生活',questions:[q('future_day','future')]};const f=vi.fn<typeof fetch>().mockResolvedValueOnce(response({summary:'继续盘问画像',questions:[q('a','self')]})).mockResolvedValueOnce(response(good));expect(await generate('followup',data,config,f)).toEqual(good);expect(f).toHaveBeenCalledTimes(2);const repair=JSON.parse(f.mock.calls[1][1]!.body as string);expect(repair.messages.at(-1).content).toContain('不能继续只深入个人画像');});
 it('passes each distinct user context to the model and returns personalized future questions',async()=>{const student=interview();student.rounds=student.rounds.slice(0,1);const caregiver=structuredClone(student);caregiver.rounds[0].answers[0].value='工作多年，需要照顾家人，重视陪伴';const f=vi.fn<typeof fetch>().mockImplementation(async(_url,init)=>{const text=JSON.parse(init!.body as string).messages[1].content;return response({summary:'依据个人生活诉求探索未来',questions:[{...q('future','future'),title:text.includes('照顾家人')?'未来怎样的工作安排能保留家人陪伴？':'毕业后希望怎样平衡成长与生活？'}]});});const a=await generate('followup',student,config,f);const b=await generate('followup',caregiver,config,f);expect(a).not.toEqual(b);expect(JSON.parse(f.mock.calls[1][1]!.body as string).messages[1].content).toContain('照顾家人');});
 it('requires an actual motivation section with one evidence-linked connection per action',()=>{const r=report();expect(reportSchema.safeParse(r).success).toBe(true);const missing=structuredClone(r) as Record<string,unknown>;delete missing.motivation;expect(reportSchema.safeParse(missing).success).toBe(false);expect(savedReportSchema.safeParse(missing).success).toBe(false);const duplicated=report();duplicated.motivation.actionLinks[1].actionIndex=0;expect(reportSchema.safeParse(duplicated).success).toBe(false);const badRef=report();badRef.motivation.actionLinks[0].evidence=['r9.invented'];expect(()=>validateEvidence(badRef,interview())).toThrow('证据编号无效');});
 it('does not accept ungrounded motivation hypotheses or missing action links',()=>{const a=report();a.motivation.actionLinks[0].evidence=[];expect(reportSchema.safeParse(a).success).toBe(false);const b=report();b.motivation.actionLinks.pop();expect(reportSchema.safeParse(b).success).toBe(false);});
 it('supports unknown future goals without forcing a fabricated ideal life',async()=>{const data=interview();for(const round of data.rounds)for(const answer of round.answers)if(answer.questionId!=='stage')answer.value='不知道，未来方向还不明确';const r=report();r.profile.findings=[{statement:'当前为大学生或研究生',kind:'fact',evidence:['r1.stage']},{statement:'兴趣尚不明确',kind:'unknown',evidence:[]},{statement:'未来生活期待尚待探索',kind:'unknown',evidence:[]}];r.vision.life='尚未明确，先探索愿意保留或改变的生活状态';r.vision.goals=['通过低成本经历形成更可靠的生活偏好线索'];for(const link of r.motivation.actionLinks){link.kind='unknown';link.desiredLife='尚未明确，行动用于探索而非证明既定人生目标';link.longTermGoal='先澄清自己的生活选择标准';link.evidence=[];}const f=vi.fn<typeof fetch>().mockResolvedValue(response(r));const result=await generate('report',data,config,f);expect(result).toMatchObject({reportVersion:2,vision:{life:expect.stringContaining('尚未明确')},motivation:{actionLinks:expect.arrayContaining([expect.objectContaining({kind:'unknown'})])}});expect(JSON.parse(f.mock.calls[0][1]!.body as string).messages[0].content).toContain('不强行编造理想');});
 it('keeps old reports and backup data readable without fabricating a fourth stage',()=>{const{reportVersion,motivation,...old}=report();const saved={...blankSession(),rounds:interview().rounds,screen:'report' as const,report:old};const restored=loadSession(JSON.stringify(saved));expect(restored?.report?.profile).toEqual(old.profile);expect(restored?.report?.motivation).toBeUndefined();const backup=decodeBackup(encodeBackup(saved));expect(backup.report?.directions).toEqual(old.directions);expect(backup.report?.motivation).toBeUndefined();expect(backup.consent).toBe(false);});
});


describe('preserving an old questionnaire while switching workflows',()=>{
 it('keeps matching answers and archives the old future question and report',()=>{
  const old=blankSession();delete old.workflowVersion;old.screen='interview';old.report=report();
  old.rounds[0].questions=old.rounds[0].questions.map(q=>q.id==='strengths'?{...q,id:'future',title:'旧版未来问题'}:q);
  old.rounds[0].answers=old.rounds[0].questions.map(q=>({questionId:q.id,value:`原文 ${q.id}`,skipped:false}));
  const snapshot=structuredClone(old);const next=upgradeInterview(old);
  expect(next.workflowVersion).toBe(2);expect(next.rounds[0].questions[next.cursor].id).toBe('strengths');
  expect(next.rounds[0].answers).toHaveLength(5);expect(next.previousRounds).toEqual(old.rounds);expect(next.previousReport).toEqual(old.report);expect(next.report).toBeNull();expect(old).toEqual(snapshot);
  const restored=decodeBackup(encodeBackup(next));expect(restored.previousRounds).toEqual(old.rounds);expect(restored.previousReport).toEqual(old.report);
 });
 it('leaves current sessions alone',()=>{const current=blankSession();expect(isLegacyInterview(current)).toBe(false);expect(upgradeInterview(current)).toBe(current);});
 it('passes archived evidence with distinct references and rejects invented references',()=>{
  const data={...interview(),previousRounds:interview().rounds};data.previousRounds[0].answers[0].value='此前回答';
  const rows=transcript(data);expect(rows[0].source).toBe('previous');expect(rows[0].answers[0].ref).toBe('previous.r1.stage');expect(rows.at(-1)?.source).toBe('current');
  const r=report();r.motivation.actionLinks[0].evidence=['previous.r1.stage'];expect(()=>validateEvidence(r,data)).not.toThrow();r.motivation.actionLinks[0].evidence=['previous.r1.fake'];expect(()=>validateEvidence(r,data)).toThrow();
 });
});
