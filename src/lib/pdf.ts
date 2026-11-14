import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { SavedReport } from './schema';
import { PLANNING_STAGES } from './workflow';
export async function createReportPDF(report:SavedReport,fontBytes:ArrayBuffer|Uint8Array,example=false){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(fontBytes,{subset:true});
 doc.setTitle(report.title);doc.setAuthor('Life Planner AI');doc.setSubject('个性化人生发展规划报告');
 const W=595.28,H=841.89,M=49,bodyWidth=W-M*2;let page:PDFPage;let y=0;let pageNo=0;
 function newPage(){page=doc.addPage([W,H]);pageNo++;y=H-65;page.drawText(example?'LIFE PLANNER AI | 虚构示例 · 非个人分析':'LIFE PLANNER AI | 人生规划',{x:M,y:H-31,size:8,font,color:rgb(.5,.59,.73)});page.drawLine({start:{x:M,y:43},end:{x:W-M,y:43},thickness:.5,color:rgb(.88,.91,.96)});page.drawText(String(pageNo),{x:W-M-10,y:27,size:8,font,color:rgb(.5,.59,.73)});}
 const characters=new Set(font.getCharacterSet());
 function safe(s:string){return Array.from(s).filter(c=>c==='\n'||c==='\t'||c.charCodeAt(0)>=32).map(c=>characters.has(c.codePointAt(0)!)?c:'?').join('').replace(/\t/g,'  ');}
 function wrap(s:string,size:number){const lines:string[]=[];for(const para of safe(s).split('\n')){let current='';for(const ch of Array.from(para)){if(font.widthOfTextAtSize(current+ch,size)>bodyWidth&&current){lines.push(current);current=ch;}else current+=ch;}lines.push(current);}return lines;}
 function text(s:string,size=10.5,color=rgb(.26,.33,.44),space=9){const lines=wrap(s,size);for(const line of lines){if(y<size*1.75+58)newPage();page.drawText(line,{x:M,y,size,font,color});y-=size*1.85;}y-=space;}
 function heading(s:string){if(y<140)newPage();y-=8;text(s,14,rgb(.18,.32,.57),12);}
 function list(items:string[]){items.forEach((s,i)=>text(`${i+1}. ${s}`,10.5,undefined,5));y-=5;}
 function chapter(n:string,title:string){newPage();text(`${n}  ${title}`,21,rgb(.14,.27,.47),20);}
 newPage();y-=45;text('个性化人生发展',29,rgb(.14,.27,.47),0);text('规划报告',29,rgb(.14,.27,.47),25);text('认识自己 / 明确未来生活 / 倒推路径 / 建立内在动力',12,rgb(.45,.56,.73),35);heading('核心结论');text(report.overview,12,undefined,25);text(example?'本报告是人工编写的虚构示例，不使用访客回答，也不是实时 AI 分析。仅展示报告内容与排版，不构成个人建议。':'本报告依据三轮访谈生成，区分用户事实、合理推测与待验证信息。规划仅作探索参考，不替代个人判断，不承诺就业、收入或升学结果。',10,rgb(.5,.56,.65));
 chapter('第一阶段',PLANNING_STAGES[0]);heading('当前阶段与个人画像');text(report.profile.stage);report.profile.findings.forEach(f=>{const tag=({fact:'用户明确提供',hypothesis:'合理推断 · 待验证',unknown:'信息不足 · 待探索'})[f.kind];heading(tag);text(f.statement);if(f.evidence.length)text('回答依据：'+f.evidence.join('、'),8,rgb(.5,.59,.72));});heading('兴趣、价值观与核心需求');list(report.profile.coreNeeds);heading('能力发展与现实条件');list(report.profile.constraints);
 chapter('第二阶段',PLANNING_STAGES[1]);heading('理想生活图景');text(report.vision.life);heading('初步长期目标与探索意愿');list(report.vision.goals);heading('重要选择与价值取舍');list(report.vision.criteria);heading('仍然不确定的部分');list(report.vision.openQuestions);heading('可能的人生方向');report.directions.forEach((d,i)=>{heading(`可能方向 ${i+1}：${d.name}`);text(d.rationale);for(const[k,v]of [['适配依据与不确定性',d.fit],['现实可行性',d.feasibility],['机会',d.opportunities],['门槛与差距',d.barriers],['风险与代价',d.risks],['方向验证方式',d.firstExperiment]])text(`${k}：${v}`);text('回答依据：'+d.evidence.join('、'),8,rgb(.5,.59,.72));});
 chapter('第三阶段',PLANNING_STAGES[2]);heading('优先探索：'+report.priority.direction);text(report.priority.reason);heading('长期方向倒推阶段目标');report.roadmap.forEach(s=>{heading(s.horizon);text(s.goal);list(s.milestones);text('待验证：'+s.uncertainties,10,rgb(.48,.56,.69));});heading('未来30天行动');report.actions.forEach((a,i)=>{heading(`${i+1}：${a.title}`);list(a.steps);for(const[k,v]of [['时间投入',a.time],['资源与预算',a.resources],['进展与成果标志',a.outcome],['障碍与应对策略',a.obstacle]])text(`${k}：${v}`);});heading('进展检查');list(report.review.signals);heading('风险与路线调整');list(report.review.changeTriggers);heading('下一次复盘');text(report.review.nextReview);list(report.review.questions);
 chapter('第四阶段',PLANNING_STAGES[3]);if(report.reportVersion===2){const m=report.motivation;for(const link of m.actionLinks){heading(`行动 ${link.actionIndex+1}：${report.actions[link.actionIndex].title}`);text(({fact:'用户明确提供',hypothesis:'合理推断 · 待验证',unknown:'信息不足 · 待探索'})[link.kind],9,rgb(.45,.56,.72));for(const[k,v]of [['期待的生活',link.desiredLife],['长期目标或探索方向',link.longTermGoal],['重视的价值',link.personalValue],['这一步如何帮助接近未来',link.whyThisAction],['为什么现在优先做',link.priorityReason]])text(`${k}：${v}`);if(link.evidence.length)text('回答依据：'+link.evidence.join('、'),8,rgb(.5,.59,.72));}heading('动力下降或计划受阻时');for(const s of m.lowMotivationStrategies){heading(s.trigger);text(s.adjustment);text('可选的最小一步：'+s.minimumStep);text('何时暂停或重新考虑：'+s.whenToPause);}heading('保持自主的自我检查');list(m.selfCheck);text(m.autonomyNote);}else{text('这份旧版报告尚未生成第四阶段，原有内容予以保留。请基于访谈重新生成四阶段报告；此处不会自动编造你的动机或未来目标。');}heading('信息边界');list(report.limitations);

 return doc.save();
}
let fontPromise:Promise<ArrayBuffer>|null=null;
function loadChineseFont():Promise<ArrayBuffer>{
 if(!fontPromise){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30_000);
  fontPromise=fetch('/fonts/NotoSansSC.ttf',{cache:'force-cache',signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('无法加载中文字体');return response.arrayBuffer();}).catch(error=>{fontPromise=null;throw error;}).finally(()=>clearTimeout(timer));
 }
 return fontPromise;
}
export async function downloadReport(report:SavedReport,example=false){
 const bytes=await createReportPDF(report,await loadChineseFont(),example);
 const blob=new Blob([bytes.slice().buffer as ArrayBuffer],{type:'application/pdf'});const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=example?'虚构示例-人生发展规划报告.pdf':'人生发展规划报告.pdf';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
