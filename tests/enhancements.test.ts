import { describe,it,expect } from 'vitest';
import { decodeChoice,encodeChoice } from '../src/lib/answers';
import { blankSession,decodeBackup,encodeBackup } from '../src/lib/session';
import { EXAMPLE_REPORT,EXAMPLE_ROUNDS } from '../src/lib/example';
import { validateEvidence } from '../src/lib/server';
import { interview,report } from './fixtures';
describe('choice answer recovery',()=>{
 it('restores supplement-only answers without duplicating their prefix',()=>{const value=encodeChoice([],'暂时没有明确阶段');expect(decodeChoice(value,[])).toEqual({selected:[],detail:'暂时没有明确阶段'});expect(encodeChoice([],decodeChoice(value,[]).detail)).toBe(value);});
 it('round-trips choices containing punctuation and multiline supplements',()=>{const selected=['学习、研究','创造与表达'];const detail='第一行\n第二行\n补充：这是原文';const encoded=encodeChoice(selected,detail);expect(decodeChoice(encoded,selected)).toEqual({selected,detail});});
 it('reads previously saved legacy choice formats',()=>{expect(decodeChoice('经济安全、自主与自由\n补充：希望先试试',['经济安全','自主与自由'])).toEqual({selected:['经济安全','自主与自由'],detail:'希望先试试'});expect(decodeChoice('其他 / 不愿透露',['其他 / 不愿透露'])).toEqual({selected:['其他 / 不愿透露'],detail:''});});
});
describe('private local backups',()=>{
 it('restores a full report with answers while requiring fresh consent',()=>{const session={...blankSession(),rounds:interview().rounds,report:report(),consent:true,screen:'report' as const,roundIndex:2};const restored=decodeBackup(encodeBackup(session));expect(restored.report).toEqual(session.report);expect(restored.rounds).toEqual(session.rounds);expect(restored.consent).toBe(false);expect(restored.screen).toBe('home');});
 it('rejects unrelated, oversized, corrupt and incompatible backups',()=>{for(const raw of ['broken','{}',JSON.stringify({format:'life-planner-backup',version:2}),'x'.repeat(512001),JSON.stringify({format:'life-planner-backup',version:1,session:{...blankSession(),cursor:99}})])expect(()=>decodeBackup(raw)).toThrow();});
});
it('keeps the authored fictional report structurally valid with real example references',()=>{expect(validateEvidence(EXAMPLE_REPORT,{rounds:EXAMPLE_ROUNDS})).toEqual(EXAMPLE_REPORT);expect(EXAMPLE_REPORT.title).toContain('示例');expect(EXAMPLE_REPORT.limitations[0]).toContain('不基于访客回答');});
