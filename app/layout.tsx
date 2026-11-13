import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'人生规划 · Life Planner AI',description:'从理解自己开始，通过三轮深度访谈，探索人生方向与可执行的发展路径。',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
