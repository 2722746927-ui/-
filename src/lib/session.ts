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
