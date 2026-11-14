import { handleKeySettings,type SettingsEnv } from '@/lib/key-settings';
export const dynamic='force-dynamic';
function environment():SettingsEnv{return{PLANNER_OWNER_EMAIL:process.env.PLANNER_OWNER_EMAIL,PLANNER_SECRET_KEY:process.env.PLANNER_SECRET_KEY,DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY};}
export function GET(request:Request){return handleKeySettings(request,environment());}
export function POST(request:Request){return handleKeySettings(request,environment());}
