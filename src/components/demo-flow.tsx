'use client';
import { useEffect,useState } from 'react';
import { ArrowLeft,ArrowRight,ShieldCheck,Sparkles } from 'lucide-react';
import { DEMO_STORAGE_KEY,demoSession } from '@/lib/demo';
import { loadSession } from '@/lib/session';
import { EXAMPLE_REPORT,EXAMPLE_ROUNDS } from '@/lib/example';
import type { Round,SavedSession } from '@/lib/schema';
import QuestionForm from './question-form';
import ReportView from './report';
const names=['第一轮 · 基本探索','第二轮 · 深度追问','第三轮 · 现实验证'];
export default function DemoFlow({seed,onExit}:{seed:Round|null;onExit:()=>void}){
 const [state,setState]=useState<SavedSession>(()=>demoSession(seed));const [ready,setReady]=useState(false);const [saveError,setSaveError]=useState(false);
 useEffect(()=>{if(!seed)try{const saved=loadSession(localStorage.getItem(DEMO_STORAGE_KEY));if(saved&&saved.rounds.length===3)setState(saved);}catch{setSaveError(true);}setReady(true);},[seed]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify(state));}catch{setSaveError(true);}},[state,ready]);
 function update(p:Partial<SavedSession>){setState(s=>({...s,...p,updatedAt:new Date().toISOString()}));}
 const round=state.rounds[state.roundIndex];const question=round.questions[state.cursor];const answer=round.answers.find(a=>a.questionId===question.id);
 function save(value:string,skipped=false){const rounds=structuredClone(state.rounds);const current=rounds[state.roundIndex];current.answers=current.answers.filter(a=>a.questionId!==question.id).concat({questionId:question.id,value,skipped});update({rounds});return rounds;}
 function submit(value:string,skipped:boolean){const rounds=save(value,skipped);if(state.cursor<round.questions.length-1)update({rounds,cursor:state.cursor+1});else if(state.roundIndex<2)update({rounds,roundIndex:state.roundIndex+1,cursor:0});else update({rounds,screen:'report',report:EXAMPLE_REPORT});}
 function back(){if(state.cursor>0)update({cursor:state.cursor-1});else if(state.roundIndex>0){const i=state.roundIndex-1;update({roundIndex:i,cursor:state.rounds[i].questions.length-1});}else onExit();}
 const progress=state.screen==='report'?100:Math.round(((state.roundIndex+state.cursor/round.questions.length)/3)*100);
 return <div className="demo-shell"><div className="demo-banner"><Sparkles size={22}/><div><strong>完整流程演示 · 无需 API</strong><p>第二、三轮为预设示例问题，最后展示虚构示例报告，不会根据本次输入作个人分析。演示回答单独保存在本机，不发送给 AI，不覆盖正式规划。</p></div><button className="button secondary small" onClick={onExit}>退出演示</button></div>
 <nav className="demo-navigation" aria-label="演示步骤">{names.map((name,i)=><button key={name} aria-current={state.screen!=='report'&&state.roundIndex===i?'step':undefined} onClick={()=>update({roundIndex:i,cursor:0,screen:'interview'})}>{name}</button>)}<button aria-current={state.screen==='report'?'step':undefined} onClick={()=>update({screen:'report',report:EXAMPLE_REPORT})}>示例报告<ArrowRight size={13}/></button></nav>
 {saveError&&<p role="status" className="notice warning">此浏览器暂时无法保存演示进度，退出后可能需要重新开始。正式规划数据未改变。</p>}
 {state.screen==='report'?<ReportView report={EXAMPLE_REPORT} rounds={EXAMPLE_ROUNDS} example onBack={()=>update({screen:'interview',roundIndex:2,cursor:state.rounds[2].questions.length-1})}/>:<main className="demo-interview"><div className="question-area"><div className="question-topline"><span>{names[state.roundIndex]} · 演示</span><span>{progress}%</span></div><div className="progress-track" role="progressbar" aria-label="演示总进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width:`${progress}%`}}/></div><div className="round-context"><span className="tag">{round.questions.length} 个问题 · 可自由切换轮次</span><p>{state.roundIndex===0?'演示第一轮：体验基本信息和人生方向探索，允许跳过。':round.summary}</p></div><QuestionForm key={`${state.roundIndex}.${question.id}`} question={question} answer={answer?.value||''} skipped={answer?.skipped||false} index={state.cursor} total={round.questions.length} final={state.roundIndex===2} finalLabel="完成演示，查看示例报告" onDraft={value=>{save(value);}} onSubmit={submit} onBack={back}/><div className="interview-bottom"><span><ShieldCheck size={14}/>{saveError?'演示进度暂未保存':'演示进度独立保存在本机'}</span><button className="text-button" onClick={onExit}><ArrowLeft size={14}/>返回真实规划</button><button className="text-button" onClick={()=>{update({...demoSession()});}}>重置演示</button></div></div></main>}
 </div>;
}
