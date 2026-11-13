import { handlePlanner } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
export async function POST(request:Request){return handlePlanner(request,{DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY,DEEPSEEK_MODEL:process.env.DEEPSEEK_MODEL,DEEPSEEK_BASE_URL:process.env.DEEPSEEK_BASE_URL});}
