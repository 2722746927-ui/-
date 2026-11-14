import type { SavedSession } from './schema';
import { freshRound } from './questions';
export function isLegacyInterview(session:SavedSession){
 return session.workflowVersion!==2||session.rounds[0].questions.some(q=>q.id==='future')||session.rounds.slice(1).some(r=>r.questions.some(q=>!q.topic));
}
/** A user-triggered migration. Keep old questions/answers/report rather than clearing storage. */
export function upgradeInterview(session:SavedSession):SavedSession{
 if(!isLegacyInterview(session))return session;
 const first=freshRound();const old=session.rounds[0];
 first.answers=first.questions.flatMap(q=>{const answer=old.answers.find(a=>a.questionId===q.id);return answer?[structuredClone(answer)]:[];});
 const missing=first.questions.findIndex(q=>!first.answers.some(a=>a.questionId===q.id&&(a.skipped||a.value.trim())));
 return{...session,workflowVersion:2,rounds:[first],roundIndex:0,cursor:missing<0?first.questions.length-1:missing,screen:'interview',report:null,previousRounds:structuredClone(session.rounds),previousReport:session.report||session.previousReport||null,updatedAt:new Date().toISOString()};
}
