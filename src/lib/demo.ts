import { freshRound } from './questions';
import { blankSession } from './session';
import type { Round,SavedSession } from './schema';
export const DEMO_STORAGE_KEY='life-planner.demo.v1';
export function demoSession(seed:Round|null=null):SavedSession{
 return {...blankSession(),screen:'interview',roundIndex:seed?1:0,rounds:[seed?structuredClone(seed):freshRound(),{
  round:2,summary:'演示第二轮：少量补充关键画像信息，同时开始探索未来生活期待。真实流程由AI基于回答动态生成，此处为预设示例。',answers:[],questions:[
   {id:'demo_future_day',title:'如果未来生活能多保留一种让你感到满足的状态，你希望是什么？',hint:'可以从一天的工作节奏、自由、关系或成长谈起。不知道具体职业也没有关系。',type:'text',options:[],reason:'把第一轮的兴趣与价值线索连接到未来生活。',topic:'future'},
   {id:'demo_tradeoff',title:'当理想生活中的期待发生冲突时，你会如何取舍？',hint:'例如自由与稳定、成就与陪伴。选当前想优先保障的一项，并可说明原因。',type:'single',options:['先保障经济与生活安全','先争取自主与探索空间','先照顾学业、健康或家庭责任','还不确定，想通过尝试比较'],reason:'理解愿景中的价值排序，不代替你决定。',topic:'future'},
   {id:'demo_gap',title:'关于自己的能力或现实条件，还有哪一点会影响你对未来的选择？',hint:'只补充尚未说清且真正重要的信息；可以说不知道或跳过。',type:'text',options:[],reason:'补足会影响愿景可行性的关键缺口，不重复盘问画像。',topic:'self'},
   {id:'demo_future_interest',title:'有什么方向让你愿意长期了解，或者有什么生活状态是你不想失去的？',hint:'可以谈方向，也可以只说想保留的关系、成长或自主空间，不必承诺唯一目标。',type:'text',options:[],reason:'开始澄清长期意愿并允许保留不确定性。',topic:'future'}
  ]
 },{
  round:3,summary:'演示第三轮：重点澄清理想生活、重要选择、可能方向及其现实取舍。不是再次深入盘问自己，也不是提前分配行动计划。',answers:[],questions:[
   {id:'demo_ideal_life',title:'把理想中的工作、生活和个人状态放在一起，你希望未来怎样度过普通的一天？',hint:'可谈节奏、自由、关系与成长。没有画面时，也可以只说最希望保留或改变的部分。',type:'text',options:[],reason:'澄清未来生活图景，而非把它直接等同于一个职业。',topic:'future'},
   {id:'demo_choices',title:'面对几种可能的人生选择，哪些标准是你最不愿意牺牲的？',hint:'可以多选并补充取舍；不清楚时保留待探索状态。',type:'multi',options:['基本经济安全','自主安排与自由','重要关系与陪伴','健康与生活边界','持续成长与创造','暂时无法排序'],reason:'让后续路径从你的真实意愿和选择标准出发。',topic:'future'},
   {id:'demo_direction',title:'目前有没有一条愿意进一步探索的长期方向？哪些地方仍不确定？',hint:'可以回答没有确定方向，描述愿意探索的生活假设，不需要作长期承诺。',type:'text',options:[],reason:'给规划提供暂定方向与信息边界，不强行制造人生目标。',topic:'future'},
   {id:'demo_constraints',title:'如果向这些未来生活靠近，哪些现实边界必须被计划尊重？',hint:'例如时间、预算、地域、学业或照顾责任，可说明愿意调整与不愿牺牲的部分。',type:'text',options:[],reason:'把现实约束与愿景选择对应，为倒推路径提供条件。',topic:'constraints'}
  ]
 }]};
}
