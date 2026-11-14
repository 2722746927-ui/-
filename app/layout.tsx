import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'人生规划 · Life Planner AI',description:'从理解自己开始，通过三轮信息收集，按认识自己、明确未来生活、倒推发展路径、建立内在行动动力四阶段完成个性化人生规划。',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
