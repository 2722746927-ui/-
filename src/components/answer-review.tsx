'use client';
import { ArrowRight,Download,X } from 'lucide-react';
import type { SavedSession } from '@/lib/schema';
import { downloadBackup } from '@/lib/session';
import Dialog from './dialog';
export default function AnswerReview({session,onClose,onJump}:{session:SavedSession;onClose:()=>void;onJump:(round:number,cursor:number)=>void}){
 const answered=session.rounds.flatMap(r=>r.answers).filter(a=>a.skipped||a.value.trim()).length;
 return <Dialog titleId="answers-title" onClose={onClose}><button className="modal-close" onClick={onClose} aria-label="关闭回答总览"><X size={20}/></button><p className="eyebrow">你的访谈记录</p><h2 id="answers-title">回看自己的回答</h2><p>已填写或跳过 {answered} 题。点击问题可以返回修改；修改前轮回答后，后续追问和报告会重新生成。</p><div className="answer-review">{session.rounds.map((r,ri)=><section key={r.round}><h3>第 {r.round} 轮</h3>{r.questions.map((q,qi)=>{const answer=r.answers.find(a=>a.questionId===q.id);return <button key={q.id} onClick={()=>onJump(ri,qi)} className="answer-review-item"><span className="answer-review-question">{qi+1}. {q.title}<ArrowRight size={13}/></span><span className={`answer-review-value ${answer?.skipped?'muted':''}`}>{answer?.skipped?'已跳过':answer?.value.trim()||'尚未回答'}</span></button>;})}</section>)}</div><div className="backup-note"><p>备份文件包含你的回答和报告，请仅保存在自己的设备中，不要公开上传。</p><button className="button secondary small" onClick={()=>downloadBackup(session)}><Download size={14}/>备份本次规划</button></div></Dialog>;
}
