import { describe,it,expect,vi } from 'vitest';
import { handlePlanner,generate,transcript,validateEvidence } from '../src/lib/server';
import { interview,report } from './fixtures';
import { blankSession,loadSession,reviseAnswer } from '../src/lib/session';
import { followupSchema,reportSchema } from '../src/lib/schema';
const config={DEEPSEEK_API_KEY:'unit-test-only'};
const completion=(data:unknown)=>Response.json({choices:[{finish_reason:'stop',message:{content:typeof data==='string'?data:JSON.stringify(data)}}]});
const followup={summary:'结合写作经历开始探索未来生活期待',questions:[{id:'writing_example',title:'如果将写作放进未来生活，你最希望保留什么状态？',hint:'可回忆一次经历',type:'text',options:[],reason:'探索已有兴趣与未来生活的联系',topic:'future'}]};
const request=(body:unknown)=>new Request('https://planner.test/api/planner',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://planner.test'},body:JSON.stringify(body)});
describe('dynamic interview and AI contract',()=>{
 it('sends all available answers and generates a followup, with server-only key',async()=>{const i=interview();i.rounds=i.rounds.slice(0,1);const fetcher=vi.fn<typeof fetch>().mockResolvedValue(completion(followup));const r=await handlePlanner(request({action:'followup',interview:i}),config,fetcher);expect(r.status).toBe(200);expect((await r.json()).data).toEqual(followup);const init=fetcher.mock.calls[0][1]!;const body=JSON.parse(init.body as string);expect(body.messages[1].content).toContain('r1.experience');expect(body.messages[1].content).toContain('第二轮：个性化探索');expect(JSON.stringify(body)).not.toContain(config.DEEPSEEK_API_KEY);expect(init.headers).toMatchObject({Authorization:'Bearer unit-test-only'});});
 it('third-round context includes both earlier rounds and different user inputs',async()=>{const i=interview();i.rounds=i.rounds.slice(0,2);const f=vi.fn<typeof fetch>().mockResolvedValue(completion(followup));await generate('followup',i,config,f);const payload=JSON.parse(f.mock.calls[0][1]!.body as string);expect(payload.messages[1].content).toContain('第三轮：未来方向澄清');expect(payload.messages[1].content).toContain('校园人物采访');});
 it('repairs malformed JSON once',async()=>{const i=interview();i.rounds=i.rounds.slice(0,1);const f=vi.fn<typeof fetch>().mockResolvedValueOnce(completion('broken')).mockResolvedValueOnce(completion(followup));expect(await generate('followup',i,config,f)).toEqual(followup);expect(f).toHaveBeenCalledTimes(2);});
 it('rejects repeated question identifiers',()=>{expect(followupSchema.safeParse({...followup,questions:[followup.questions[0],followup.questions[0]]}).success).toBe(false);});
 it('rejects exact repetition of previous questions',async()=>{const i=interview();i.rounds=i.rounds.slice(0,1);const f=vi.fn<typeof fetch>().mockImplementation(async()=>completion({...followup,questions:[{...followup.questions[0],title:i.rounds[0].questions[0].title}]}));await expect(generate('followup',i,config,f)).rejects.toThrow('格式未通过检查');});
 it('validates all four planning stages and preserves real references',async()=>{const f=vi.fn<typeof fetch>().mockResolvedValue(completion(report()));const r=await handlePlanner(request({action:'report',interview:interview()}),config,f);expect(r.status).toBe(200);expect(reportSchema.safeParse((await r.json()).data).success).toBe(true);});
 it('rejects invented evidence',()=>{const r=report();r.directions[0].evidence=['r9.fake'];expect(()=>validateEvidence(r,interview())).toThrow('证据编号无效');});
 it('rejects evidence attributed to skipped answers',()=>{const i=interview();i.rounds[0].answers[0].skipped=true;expect(()=>validateEvidence(report(),i)).toThrow();});
 it('rejects duplicate roadmap horizons',()=>{const r=report();r.roadmap[1].horizon='长期愿景';expect(reportSchema.safeParse(r).success).toBe(false);});
 it('never silently falls back to a fake report without a key',async()=>{const f=vi.fn();const r=await handlePlanner(request({action:'report',interview:interview()}),{},f);expect(r.status).toBe(503);expect((await r.json()).code).toBe('NOT_CONFIGURED');expect(f).not.toHaveBeenCalled();});
 it('rejects premature reports and incomplete rounds',async()=>{const i=interview();i.rounds=i.rounds.slice(0,1);expect((await handlePlanner(request({action:'report',interview:i}),config)).status).toBe(400);i.rounds[0].answers=[];expect((await handlePlanner(request({action:'followup',interview:i}),config)).status).toBe(400);});
 it('rejects all-skipped report without pretending to understand a person',async()=>{const i=interview();i.rounds.forEach(r=>r.answers.forEach(a=>{a.skipped=true;a.value='';}));await expect(generate('report',i,config)).rejects.toThrow('没有可用于规划的信息');});
 it('handles malformed requests, oversized input, and cross-origin calls',async()=>{expect((await handlePlanner(request({bad:true}),config)).status).toBe(400);expect((await handlePlanner(request({text:'x'.repeat(100001)}),config)).status).toBe(413);const req=request({});req.headers.set('origin','https://other.test');expect((await handlePlanner(req,config)).status).toBe(403);});
 it('handles rate limits without exposing provider errors',async()=>{const f=vi.fn<typeof fetch>().mockResolvedValue(new Response('private provider message',{status:429}));const r=await handlePlanner(request({action:'report',interview:interview()}),config,f);expect(r.status).toBe(429);expect(await r.text()).not.toContain('private provider');});
 it('marks skipped answers as unknown in transcript',()=>{const i=interview();i.rounds[0].answers[0].skipped=true;expect(transcript(i)[0].answers[0].answer).toBe('[用户跳过]');});
});
it('runs the complete three-round service flow through report generation',async()=>{
 const all=interview();const flow={rounds:[all.rounds[0]]};
 const second={summary:all.rounds[1].summary,questions:all.rounds[1].questions};
 const third={summary:all.rounds[2].summary,questions:all.rounds[2].questions};
 const f=vi.fn<typeof fetch>().mockResolvedValueOnce(completion(second)).mockResolvedValueOnce(completion(third)).mockResolvedValueOnce(completion(report()));
 for(let n=0;n<2;n++){
  const response=await handlePlanner(request({action:'followup',interview:flow}),config,f);
  expect(response.status).toBe(200);const next=(await response.json()).data;
  flow.rounds.push({round:n+2,...next,answers:all.rounds[n+1].answers});
 }
 const final=await handlePlanner(request({action:'report',interview:flow}),config,f);
 expect(final.status).toBe(200);expect((await final.json()).data.directions).toHaveLength(2);
 expect(f).toHaveBeenCalledTimes(3);
});

describe('local session recovery and revision',()=>{
 it('round-trips a saved session and rejects corrupt state',()=>{const s=blankSession();expect(loadSession(JSON.stringify(s))).toEqual(s);expect(loadSession('{invalid')).toBeNull();expect(loadSession(JSON.stringify({...s,cursor:99}))).toBeNull();expect(loadSession(JSON.stringify({...s,screen:'report',report:null}))).toBeNull();});
 it('invalidates later rounds when earlier answers change',()=>{const i=interview();const changed=reviseAnswer(i.rounds,0,'stage','职场新人');expect(changed).toHaveLength(1);expect(i.rounds).toHaveLength(3);expect(changed[0].answers.find(a=>a.questionId==='stage')?.value).toBe('职场新人');});
 it('preserves later rounds if an answer was not changed',()=>{const i=interview();expect(reviseAnswer(i.rounds,0,'stage',i.rounds[0].answers[0].value)).toHaveLength(3);});
});
