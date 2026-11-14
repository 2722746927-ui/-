'use client';
import { useEffect,useState } from 'react';
import { ArrowLeft,CheckCircle2,Eye,EyeOff,KeyRound,LoaderCircle,LockKeyhole,ShieldCheck } from 'lucide-react';
type Status={configured:boolean;updatedAt:string|null;csrfToken:string};
type Failure={code:string;httpStatus:number;stage?:string;upstreamStatus?:number;reason?:string};
class ResponseFailure extends Error{constructor(message:string,public detail:Failure){super(message);}}
async function readReply(response:Response){
 let data;try{data=await response.json();}catch{throw new ResponseFailure(`网站服务器返回了非 JSON 响应（HTTP ${response.status}）。可能是登录状态失效或网关异常，请刷新设置页。`,{code:'WEBSITE_NON_JSON',httpStatus:response.status});}
 if(!response.ok){const d=data?.diagnostic;throw new ResponseFailure(typeof data?.error==='string'?data.error:`网站请求失败（HTTP ${response.status}）。`,{code:/^[A-Z0-9_]{1,60}$/.test(data?.code)?data.code:'WEBSITE_ERROR',httpStatus:response.status,stage:['connect','http','decode','validate'].includes(d?.stage)?d.stage:undefined,upstreamStatus:Number.isInteger(d?.upstreamStatus)?d.upstreamStatus:undefined,reason:/^[A-Z0-9_]{1,60}$/.test(d?.reason)?d.reason:undefined});}
 return data;
}
export default function DeepSeekSettings(){
 const [status,setStatus]=useState<Status|null>(null);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [key,setKey]=useState('');const [visible,setVisible]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [failure,setFailure]=useState<Failure|null>(null);const [access,setAccess]=useState<'owner'|'sign-in'|'denied'|'unavailable'>('unavailable');
 async function refresh(){setLoading(true);setError('');try{const r=await fetch('/api/admin/deepseek',{cache:'no-store',credentials:'same-origin'});let data;try{data=await r.json();}catch{throw new ResponseFailure(`设置接口返回非 JSON 响应（HTTP ${r.status}），请检查网站网关或登录状态。`,{code:'WEBSITE_NON_JSON',httpStatus:r.status});}if(r.status===401){if(data.setupReady===false)throw new Error('网站安全配置尚未就绪，请稍后刷新；现在不需要填写密钥。');setAccess('sign-in');return;}if(r.status===403){setAccess('denied');return;}if(!r.ok)throw new Error(data.error||'设置暂时不可用，请稍后重试。');setAccess('owner');setStatus(data);}catch(e){setAccess('unavailable');setFailure(e instanceof ResponseFailure?e.detail:null);setError(e instanceof TypeError?'浏览器未能连接网站设置接口，请检查网络后刷新。':e instanceof Error?e.message:'无法加载安全设置，请刷新重试。');}finally{setLoading(false);}}
 useEffect(()=>{void refresh();},[]);
 useEffect(()=>{function hide(){if(document.visibilityState==='hidden')setVisible(false);}document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 async function save(event:React.FormEvent){
  event.preventDefault();if(saving||!status)return;setError('');setFailure(null);setMessage('');
  if(!key.trim()){setError('请先粘贴你的 DeepSeek API Key。');return;}
  setSaving(true);setVisible(false);
  try{
   let csrf=status.csrfToken;let data;
   for(let attempt=0;attempt<2;attempt++){
    try{const response=await fetch('/api/admin/deepseek',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({apiKey:key.trim()})});data=await readReply(response);break;}
    catch(error){if(attempt===0&&error instanceof ResponseFailure&&error.detail.code==='CSRF'){
     const fresh=await readReply(await fetch('/api/admin/deepseek',{cache:'no-store',credentials:'same-origin'}));csrf=fresh.csrfToken;setStatus(fresh);continue;
    }throw error;}
   }
   if(!data?.configured)throw new ResponseFailure('服务器未确认保存成功，请刷新查看状态。',{code:'SAVE_UNCONFIRMED',httpStatus:200});
   setKey('');setStatus({...status,csrfToken:csrf,configured:true,updatedAt:data.updatedAt});setMessage(data.message||'密钥已保存并生效。');
  }catch(error){
   if(error instanceof ResponseFailure){setFailure(error.detail);if(error.detail.code==='SIGN_IN'||error.detail.code==='OWNER_ONLY'){setKey('');setStatus(null);setAccess(error.detail.code==='SIGN_IN'?'sign-in':'denied');}setError(error.message);}
   else{setFailure({code:'WEBSITE_NETWORK',httpStatus:0});setError('浏览器未能完成与网站服务器的请求。请检查网络，再刷新查看保存状态；不要把密钥发到聊天中。');}
  }finally{setSaving(false);}
 }

 return <main className="settings-shell"><a className="text-button" href="/"><ArrowLeft size={15}/>返回 Life Planner AI</a><section className="settings-card"><div className="settings-icon"><KeyRound size={27}/></div><p className="eyebrow">LIFE PLANNER AI · 网站所有者设置</p><h1>连接 DeepSeek</h1><p className="settings-description">只需填写一次密钥，网站就可以为体验用户生成个性化追问和规划报告。</p>
 {loading?<div className="settings-loading" role="status"><LoaderCircle className="spin" size={19}/>正在验证管理员身份…</div>:access==='sign-in'?<div className="settings-auth"><LockKeyhole size={23}/><h2>先确认是你本人</h2><p>请使用创建这个网站的 ChatGPT 账号登录。普通体验用户没有配置权限。</p><a className="button primary" href="/signin-with-chatgpt?return_to=%2Fadmin%2Fdeepseek" target="_top">使用 ChatGPT 账号登录<ArrowLeft size={15} style={{transform:'rotate(180deg)'}}/></a></div>:access==='denied'?<div className="settings-auth"><ShieldCheck size={24}/><h2>仅限网站所有者</h2><p>当前账号没有修改密钥的权限。请切换为创建网站时使用的 ChatGPT 账号。</p><a className="button secondary" href="/signout-with-chatgpt?return_to=%2Fadmin%2Fdeepseek" target="_top">退出当前账号并重新登录</a></div>:access==='owner'&&status?<><div className={`connection-state ${status.configured?'connected':''}`}><span className="blue-dot"/>{status.configured?'已配置 DeepSeek，可填写新密钥进行替换':'尚未配置，填写下方密钥即可连接'}</div><form onSubmit={save} autoComplete="off"><label className="input-label" htmlFor="deepseek-key">DeepSeek API Key</label><div className="secret-input"><input id="deepseek-key" name="deepseek-key" type={visible?'text':'password'} value={key} onChange={e=>{setKey(e.target.value);setError('');setFailure(null);setMessage('');}} placeholder="sk-…" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={300} disabled={saving} aria-describedby="key-help"/><button type="button" aria-label={visible?'隐藏密钥':'显示密钥'} aria-pressed={visible} disabled={saving} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><p id="key-help" className="settings-help">仅填写密钥本身，不需要变量名、网址或模型名。已保存的密钥不会显示或返回到页面。</p><button type="submit" className="button primary settings-submit" disabled={saving||!key.trim()}>{saving?<><LoaderCircle size={17} className="spin"/>正在验证并加密保存…</>:<><KeyRound size={16}/>{status.configured?'验证并更新密钥':'保存并连接 DeepSeek'}</>}</button></form>{status.updatedAt&&<p className="settings-updated">最近更新：{new Date(status.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</p>}</>:<button className="button secondary" onClick={()=>void refresh()}>重新检查设置</button>}
 {error&&<div role="alert" className="error"><p>{error}</p>{failure&&<p className="settings-diagnostic">错误编号：{failure.code}{failure.httpStatus>0?` · 网站 HTTP ${failure.httpStatus}`:''}{failure.upstreamStatus?` · DeepSeek HTTP ${failure.upstreamStatus}`:''}{failure.stage?` · 阶段：${({connect:'建立连接',http:'服务响应',decode:'响应解析',validate:'模型权限校验'})[failure.stage as 'connect'|'http'|'decode'|'validate']}`:''}{failure.reason?` · ${failure.reason}`:''}</p>}{access==='unavailable'&&<button className="text-button" onClick={()=>void refresh()}>刷新设置</button>}</div>}{message&&<div role="status" className="settings-success"><CheckCircle2 size={20}/><div><strong>DeepSeek 已连接</strong><p>{message}</p><a href="/" className="text-button">返回网站开始真实规划</a></div></div>}
 <div className="settings-privacy"><ShieldCheck size={17}/><p>密钥只经 HTTPS 发送至本站服务端与 DeepSeek 官方接口，验证后加密保存。不会写入前端代码、浏览器本地存储或 GitHub；访客只能使用规划服务，不能查看密钥。</p></div></section></main>;
}
