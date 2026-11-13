import { freshRound } from './questions';
import { blankSession } from './session';
import type { Round,SavedSession } from './schema';
export const DEMO_STORAGE_KEY='life-planner.demo.v1';
export function demoSession(seed:Round|null=null):SavedSession{
 return {...blankSession(),screen:'interview',roundIndex:seed?1:0,rounds:[seed?structuredClone(seed):freshRound(),{
  round:2,summary:'演示 · 以下是预设的深度追问，用于查看第二轮交互。真实规划会由 AI 根据你的全部回答生成不同的问题。',answers:[],questions:[
   {id:'demo_moment',title:'回忆一次让你感到投入或满足的经历，具体发生了什么？',hint:'你当时在做什么？是哪个环节让你愿意继续？没有典型经历也可以写“不知道”。',type:'text',options:[],reason:'用具体经历区分对题材、工作过程和外部认可的兴趣。'},
   {id:'demo_tradeoff',title:'当理想生活中的期待发生冲突时，你会如何取舍？',hint:'例如自由与稳定、成就与陪伴。可以选出当前最愿意优先保障的一项，再补充原因。',type:'single',options:['先保障经济与生活安全','先争取自主与探索空间','先照顾学业、健康或家庭责任','还不确定，想通过尝试比较'],reason:'生活标准之间的取舍，会影响路径与行动的排序。'},
   {id:'demo_evidence',title:'别人认可你的哪些表现？你自己是否认同？',hint:'尽量描述一次具体反馈。不必把夸奖理解为确定的天赋，也可以说还没有收到反馈。',type:'text',options:[],reason:'比较自我感受与外部反馈，保留需要验证的能力线索。'},
   {id:'demo_gap',title:'你最想弄清楚、但目前还没有答案的是什么？',hint:'例如不知道喜欢什么、担心门槛太高，或分不清是害怕尝试还是确实不喜欢。',type:'text',options:[],reason:'把真正可能改变规划的信息缺口留给下一轮验证。'}
  ]
 },{
  round:3,summary:'演示 · 以下是预设的现实验证问题。它们用于展示第三轮页面，不是根据你的回答实时推导的结论。',answers:[],questions:[
   {id:'demo_time',title:'未来一个月，你愿意为一次小型尝试投入多少时间？',hint:'选一个不会挤占基本生活、学业或必要工作的范围。也可以在补充说明中写下自己的安排。',type:'single',options:['每周不到1小时','每周1—3小时','每周3—5小时','每周5小时以上','目前还无法确定'],reason:'让行动规模与现实时间相匹配，避免过度承诺。'},
   {id:'demo_limits',title:'开始尝试前，哪些现实边界必须优先考虑？',hint:'可多选，也可以不选择，仅补充你愿意透露的限制。不需要精确收入或家庭隐私。',type:'multi',options:['预算有限，尽量零成本','学业或工作时间固定','需要照顾家庭或他人','地域与出行受限','健康与精力需要照顾','暂时没有明确限制'],reason:'把边界作为计划的设计条件，而不是简单归因于意愿不足。'},
   {id:'demo_experiment',title:'如果只做一个低成本小实验，你愿意尝试什么？',hint:'例如一次访谈、一页研究简报、一个小作品，或与从业者交流。写出你愿意做到的最小一步。',type:'text',options:[],reason:'用实际行为验证对方向的想象，同时控制投入与风险。'},
   {id:'demo_review',title:'尝试之后，什么反馈会让你愿意继续，或决定换个方向？',hint:'可以同时考虑成果、过程中的感受、真实反馈和对生活的影响。不需要立刻作长期决定。',type:'text',options:[],reason:'提前建立验证标准，避免只凭一次成功或挫折决定方向。'}
  ]
 }]};
}
