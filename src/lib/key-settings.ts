/** Server-only secret configuration. Never import this module into client code. */
import type { Config } from './server';
export type SecretBucket={get:(key:string)=>Promise<{text:()=>Promise<string>}|null>;put:(key:string,value:string,options?:unknown)=>Promise<unknown>};
export type SettingsEnv=Config&{CONFIG_BUCKET?:SecretBucket;PLANNER_SECRET_KEY?:string;PLANNER_OWNER_EMAIL?:string};
const OBJECT_KEY='private/deepseek-credential-v1.json';
const AAD='life-planner/deepseek/v1';
export class SettingsError extends Error{constructor(public status:number,public code:string,message:string){super(message);}}
type EncryptedRecord={version:1;ownerId:string;iv:string;ciphertext:string;updatedAt:string};
function b64(bytes:Uint8Array){let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text);}
function unb64(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
function encoder(value:string){return new TextEncoder().encode(value);}
async function cryptoKey(env:SettingsEnv,usage:KeyUsage[]){
 let bytes;try{bytes=unb64(env.PLANNER_SECRET_KEY||'');}catch{throw new SettingsError(503,'SETUP_PENDING','安全配置尚未就绪，请联系网站维护者。');}
 if(bytes.byteLength!==32)throw new SettingsError(503,'SETUP_PENDING','安全配置尚未就绪，请联系网站维护者。');
 return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,usage);
}
function requireStorage(env:SettingsEnv){if(!env.CONFIG_BUCKET)throw new SettingsError(503,'STORAGE_PENDING','安全存储尚未就绪，请稍后刷新此页面。');return env.CONFIG_BUCKET;}
async function readRecord(env:SettingsEnv):Promise<EncryptedRecord|null>{
 const object=await requireStorage(env).get(OBJECT_KEY);if(!object)return null;
 const r=JSON.parse(await object.text());
 if(r?.version!==1||typeof r.ownerId!=='string'||typeof r.iv!=='string'||typeof r.ciphertext!=='string'||typeof r.updatedAt!=='string')throw new Error('Invalid encrypted record');
 return r;
}
export async function encryptCredential(key:string,ownerId:string,env:SettingsEnv):Promise<EncryptedRecord>{
 const iv=crypto.getRandomValues(new Uint8Array(12));const secret=await cryptoKey(env,['encrypt']);
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder(AAD+':'+ownerId)},secret,encoder(key));
 return{version:1,ownerId,iv:b64(iv),ciphertext:b64(new Uint8Array(encrypted)),updatedAt:new Date().toISOString()};
}
export async function decryptCredential(record:EncryptedRecord,env:SettingsEnv):Promise<string>{
 const key=await cryptoKey(env,['decrypt']);
 const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(record.iv),additionalData:encoder(AAD+':'+record.ownerId)},key,unb64(record.ciphertext));
 return new TextDecoder().decode(decrypted);
}
export async function resolvePlannerConfig(env:SettingsEnv):Promise<Config>{
 if(!env.CONFIG_BUCKET)return{DEEPSEEK_API_KEY:env.DEEPSEEK_API_KEY,DEEPSEEK_MODEL:env.DEEPSEEK_MODEL,DEEPSEEK_BASE_URL:env.DEEPSEEK_BASE_URL};
 const record=await readRecord(env);return{DEEPSEEK_API_KEY:record?await decryptCredential(record,env):env.DEEPSEEK_API_KEY,DEEPSEEK_MODEL:env.DEEPSEEK_MODEL,DEEPSEEK_BASE_URL:env.DEEPSEEK_BASE_URL};
}
async function owner(request:Request,env:SettingsEnv,record:EncryptedRecord|null){
 // These headers are supplied and sanitized by Sites dispatch, never by a client session.
 const id=request.headers.get('oai-authenticated-user-id');const email=request.headers.get('oai-authenticated-user-email');
 if(!id||!email)throw new SettingsError(401,'SIGN_IN','请先使用创建网站的 ChatGPT 账号登录。');
 if(!env.PLANNER_OWNER_EMAIL)throw new SettingsError(503,'SETUP_PENDING','管理入口尚未初始化，请联系网站维护者。');
 if(record?record.ownerId!==id:email.trim().toLowerCase()!==env.PLANNER_OWNER_EMAIL.trim().toLowerCase())throw new SettingsError(403,'OWNER_ONLY','此页面仅限网站所有者使用。');
 return id;
}
async function csrfKey(env:SettingsEnv){let raw;try{raw=unb64(env.PLANNER_SECRET_KEY||'');}catch{throw new Error('Invalid CSRF root');}if(raw.length!==32)throw new Error('Missing CSRF root');return crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function csrfToken(id:string,env:SettingsEnv){const time=Math.floor(Date.now()/1000);const sig=await crypto.subtle.sign('HMAC',await csrfKey(env),encoder(`life-planner/csrf/v1:${id}:${time}`));return`${time}.${b64(new Uint8Array(sig))}`;}
async function verifyCSRF(token:string|null,id:string,env:SettingsEnv){try{const [time,signature]=token?.split('.')||[];const now=Math.floor(Date.now()/1000);if(!/^\d+$/.test(time)||Number(time)>now+60||now-Number(time)>1800)return false;return await crypto.subtle.verify('HMAC',await csrfKey(env),unb64(signature),encoder(`life-planner/csrf/v1:${id}:${time}`));}catch{return false;}}
const attempts=new Map<string,{count:number;reset:number}>();
function limit(id:string){const now=Date.now();if(attempts.size>100)for(const [k,v]of attempts)if(v.reset<now)attempts.delete(k);let a=attempts.get(id);if(!a||a.reset<now){a={count:0,reset:now+60000};attempts.set(id,a);}if(++a.count>5)throw new SettingsError(429,'RATE_LIMIT','请稍等一分钟，再尝试保存。');}
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
export async function handleKeySettings(request:Request,env:SettingsEnv,fetcher:typeof fetch=fetch):Promise<Response>{
 try{
  // Authenticate before reading the body or doing any external API call.
  const idHeader=request.headers.get('oai-authenticated-user-id');const emailHeader=request.headers.get('oai-authenticated-user-email');
  if(!idHeader||!emailHeader)throw new SettingsError(401,'SIGN_IN','请先使用创建网站的 ChatGPT 账号登录。');
  const record=env.CONFIG_BUCKET?await readRecord(env):null;
  const id=await owner(request,env,record);requireStorage(env);
  if(request.method==='GET'){
   await cryptoKey(env,['decrypt']);if(record)await decryptCredential(record,env);
   return json({configured:Boolean(record||env.DEEPSEEK_API_KEY),updatedAt:record?.updatedAt||null,csrfToken:await csrfToken(id,env)});
  }
  if(request.method!=='POST')return json({error:'不支持的请求方法。'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new SettingsError(403,'ORIGIN','请求来源校验失败，请从网站设置页面重试。');
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new SettingsError(415,'CONTENT_TYPE','请求格式不正确。');
  if(!await verifyCSRF(request.headers.get('x-csrf-token'),id,env))throw new SettingsError(403,'CSRF','页面已过期或安全校验失败，请刷新后重试。');
  limit(id);if(Number(request.headers.get('content-length'))>4096)throw new SettingsError(413,'TOO_LARGE','输入内容过长。');
  const raw=await request.text();if(encoder(raw).length>4096)throw new SettingsError(413,'TOO_LARGE','输入内容过长。');
  let data;try{data=JSON.parse(raw);}catch{throw new SettingsError(400,'FORMAT','请求格式不正确。');}
  const key=typeof data?.apiKey==='string'?data.apiKey.trim():'';
  if(!/^sk-[A-Za-z0-9_-]{16,256}$/.test(key))throw new SettingsError(400,'KEY_FORMAT','请粘贴以 sk- 开头的完整 DeepSeek API Key，不要填写网址或变量名。');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
   // Fixed endpoint and no redirect: never send a credential to a caller-selected host.
   const result=await fetcher('https://api.deepseek.com/models',{method:'GET',headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},redirect:'error',signal:controller.signal});
   if(result.status===401||result.status===403)throw new SettingsError(422,'KEY_REJECTED','DeepSeek 未接受这个密钥。请检查是否复制完整，或在 DeepSeek 后台确认密钥是否有效。');
   if(result.status===429)throw new SettingsError(503,'PROVIDER_BUSY','DeepSeek 暂时繁忙，未更改现有配置，请稍后重试。');
   if(!result.ok)throw new SettingsError(502,'PROVIDER_ERROR','暂时无法连接 DeepSeek，未更改现有配置，请稍后重试。');
   const modelList=await result.json();if(!Array.isArray(modelList?.data)||!modelList.data.some((m:{id?:string})=>m?.id===(env.DEEPSEEK_MODEL||'deepseek-chat')))throw new SettingsError(422,'MODEL_UNAVAILABLE','此密钥暂时不能访问网站所需的 DeepSeek 模型，未更改现有配置。');
  }catch(error){if(error instanceof SettingsError)throw error;throw new SettingsError(502,'CONNECTION','连接验证未完成，未保存密钥。请稍后重试。');}finally{clearTimeout(timer);}
  const encrypted=await encryptCredential(key,id,env);await requireStorage(env).put(OBJECT_KEY,JSON.stringify(encrypted),{httpMetadata:{contentType:'application/json'}});
  return json({configured:true,updatedAt:encrypted.updatedAt,message:'密钥已加密保存，DeepSeek 连接验证通过，网站已生效。'});
 }catch(error){if(error instanceof SettingsError)return json({error:error.message,code:error.code},error.status);return json({error:'安全设置暂时不可用，未返回任何密钥内容，请稍后重试。',code:'SETTINGS_UNAVAILABLE'},503);}
}
