import type { Round } from './schema';
export const FIRST_ROUND: Round = {round:1, summary:'先从你的生活出发。没有标准答案，也不需要现在就知道未来的方向。', answers:[], questions:[
{id:'stage',title:'你目前处于怎样的人生阶段？',hint:'选择最接近的一项，并可补充年龄区间、学习或工作状态。不需要姓名、学校或公司名称。',type:'single',options:['中学生','大学生 / 研究生','职场新人（工作 3 年内）','已有工作经验，正在探索变化','暂未工作 / 转换阶段','其他 / 不愿透露'],reason:''},
{id:'present',title:'最近的生活，让你感觉怎样？',hint:'如果用 0—10 分评价，你会打几分？最想改变或弄清楚的一件事是什么？',type:'text',options:[],reason:''},
{id:'experience',title:'有哪些经历，让你投入其中或觉得自己做得不错？',hint:'可以是学习、工作、生活中的小事。你做了什么、喜欢哪一部分、别人给过什么反馈？想不到也可以直接说“不知道”。',type:'text',options:[],reason:''},
{id:'values',title:'如果生活能更接近你的期待，你最在乎什么？',hint:'建议选出最重要的 2—3 项。也可以补充一次让你感到“这才是我想要的生活”的经历。',type:'multi',options:['经济安全','自主与自由','持续学习','创造与表达','帮助他人','亲密关系与陪伴','成就与影响力','健康与生活平衡','暂时不清楚'],reason:''},
{id:'future',title:'想象几年后的一个普通日子，你希望怎样度过？',hint:'在哪里生活、做什么、与谁相处、工作的节奏如何？如果已有目标，可以写出目标及其吸引你的原因；没有方向也没关系。',type:'text',options:[],reason:''},
{id:'resources',title:'从现在出发，你有哪些可用资源和现实限制？',hint:'例如每周能投入的时间、预算范围、已有技能、地域、学业或家庭责任。不必填写精确收入、住址等隐私信息。',type:'text',options:[],reason:''}
]};
export const freshRound=():Round=>structuredClone(FIRST_ROUND);
