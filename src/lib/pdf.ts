import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Report } from './schema';
export async function createReportPDF(report:Report,fontBytes:ArrayBuffer|Uint8Array,example=false){
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
 newPage();y-=45;text('个性化人生发展',29,rgb(.14,.27,.47),0);text('规划报告',29,rgb(.14,.27,.47),25);text('以真实的你为起点，为未来保留可能。',12,rgb(.45,.56,.73),35);heading('核心结论');text(report.overview,12,undefined,25);text(example?'本报告是人工编写的虚构示例，不使用访客回答，也不是实时 AI 分析。仅展示报告内容与排版，不构成个人建议。':'本报告依据三轮访谈生成，区分用户事实、合理推测与待验证信息。规划仅作探索参考，不替代个人判断，不承诺就业、收入或升学结果。',10,rgb(.5,.56,.65));
 chapter('第一章','个人现状与深度画像');heading('当前阶段');text(report.profile.stage);report.profile.findings.forEach(f=>{const tag=({fact:'用户提供的事实',hypothesis:'合理推测 · 待验证',unknown:'信息不足 · 待验证'})[f.kind];heading(tag);text(f.statement);if(f.evidence.length)text('回答依据：'+f.evidence.join('、'),8,rgb(.5,.59,.72));});heading('核心需求');list(report.profile.coreNeeds);heading('当前限制');list(report.profile.constraints);
 chapter('第二章','理想生活与长期愿景');text(report.vision.life);heading('个人发展目标');list(report.vision.goals);heading('重要的选择标准');list(report.vision.criteria);heading('尚待探索的问题');list(report.vision.openQuestions);
 chapter('第三章','未来发展方向分析');report.directions.forEach((d,i)=>{heading(`方向 ${i+1}：${d.name}`);text(d.rationale);for(const[k,v]of [['适配判断',d.fit],['现实可行性',d.feasibility],['机会',d.opportunities],['门槛与差距',d.barriers],['风险与代价',d.risks],['第一次验证',d.firstExperiment]]){text(`${k}：${v}`);}text('回答依据：'+d.evidence.join('、'),8,rgb(.5,.59,.72));});heading('优先尝试：'+report.priority.direction);text(report.priority.reason);
 chapter('第四章','阶段性人生发展路径');report.roadmap.forEach(s=>{heading(s.horizon);text(s.goal);list(s.milestones);text('待验证：'+s.uncertainties,10,rgb(.48,.56,.69));});
 chapter('第五章','近期行动方案');report.actions.forEach((a,i)=>{heading(`${i+1}：${a.title}`);list(a.steps);for(const[k,v]of [['时间投入',a.time],['资源与预算',a.resources],['验收成果',a.outcome],['困难与应对',a.obstacle]])text(`${k}：${v}`);});
 chapter('第六章','验证与调整机制');heading('真实进展信号');list(report.review.signals);heading('调整路线的触发条件');list(report.review.changeTriggers);heading('下一次复盘');text(report.review.nextReview);list(report.review.questions);heading('报告边界');list(report.limitations);
 return doc.save();
}
let fontPromise:Promise<ArrayBuffer>|null=null;
function loadChineseFont():Promise<ArrayBuffer>{
 if(!fontPromise){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30_000);
  fontPromise=fetch('/fonts/NotoSansSC.ttf',{cache:'force-cache',signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('无法加载中文字体');return response.arrayBuffer();}).catch(error=>{fontPromise=null;throw error;}).finally(()=>clearTimeout(timer));
 }
 return fontPromise;
}
export async function downloadReport(report:Report,example=false){
 const bytes=await createReportPDF(report,await loadChineseFont(),example);
 const blob=new Blob([bytes.slice().buffer as ArrayBuffer],{type:'application/pdf'});const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=example?'虚构示例-人生发展规划报告.pdf':'人生发展规划报告.pdf';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
