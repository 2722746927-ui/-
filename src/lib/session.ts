import { savedSchema, type SavedSession, type Round } from './schema';
import { freshRound } from './questions';
export const STORAGE_KEY='life-planner.session.v1';
export const blankSession=():SavedSession=>({version:1,rounds:[freshRound()],cursor:0,roundIndex:0,consent:false,screen:'home',report:null,updatedAt:new Date().toISOString()});
export function loadSession(raw:string|null):SavedSession|null{if(!raw)return null;try{const s=savedSchema.parse(JSON.parse(raw));if(s.rounds.some((r,i)=>r.round!==i+1))return null;const round=s.rounds[s.roundIndex];if(!round)return null;if(s.cursor>=round.questions.length)return null;if(s.screen==='report'&&!s.report)return null;return s;}catch{return null;}}
export function reviseAnswer(rounds:Round[],roundIndex:number,questionId:string,value:string,skipped=false):Round[]{
  const existing=rounds[roundIndex].answers.find(a=>a.questionId===questionId);
  const changed=!existing||existing.value!==value||existing.skipped!==skipped;
  const result=structuredClone(changed?rounds.slice(0,roundIndex+1):rounds);
  result[roundIndex].answers=result[roundIndex].answers.filter(a=>a.questionId!==questionId).concat({questionId,value,skipped});
  return result;
}

export function encodeBackup(session:SavedSession):string{
  return JSON.stringify({format:'life-planner-backup',version:1,session},null,2);
}
export function decodeBackup(raw:string):SavedSession{
  if(new TextEncoder().encode(raw).length>512_000)throw new Error('备份文件过大，请选择小于 500 KB 的规划备份。');
  let data;try{data=JSON.parse(raw);}catch{throw new Error('文件不是有效的 JSON 备份，请选择从本站导出的文件。');}
  if(data?.format!=='life-planner-backup'||data.version!==1)throw new Error('这不是可识别的 Life Planner 备份文件。');
  const session=loadSession(JSON.stringify(data.session));
  if(!session)throw new Error('备份内容不完整或格式不兼容，未修改当前数据。');
  // Consent is device-specific and must be given again before sending answers.
  return{...session,consent:false,screen:'home',updatedAt:new Date().toISOString()};
}
export function downloadBackup(session:SavedSession){
  const url=URL.createObjectURL(new Blob([encodeBackup(session)],{type:'application/json;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='人生规划-本地备份.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
