/** Server-side HTTP boundary. No raw provider body, exception or credential is echoed. */
export type DeepSeekDiagnostic={stage:'connect'|'http'|'decode'|'validate';upstreamStatus?:number;reason?:string};
export class DeepSeekError extends Error{
 constructor(public status:number,public code:string,message:string,public diagnostic:DeepSeekDiagnostic){super(message);this.name='DeepSeekError';}
}
const safeCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT','ERR_TLS_CERT_ALTNAME_INVALID']);
function connectionFailure(error:unknown,timeoutMs:number):DeepSeekError{
 const e=error as {name?:string;message?:string;cause?:{code?:string};code?:string};
 if(e?.name==='AbortError'||e?.name==='TimeoutError')return new DeepSeekError(504,'DEEPSEEK_TIMEOUT',`服务器等待 DeepSeek 响应超过 ${Math.round(timeoutMs/1000)} 秒，连接验证超时。请重试；若持续发生，需要检查服务器出站网络。`,{stage:'connect',reason:'TIMEOUT'});
 const raw=e?.cause?.code||e?.code;const reason=raw&&safeCodes.has(raw)?raw:'FETCH_FAILED';
 if(reason==='ENOTFOUND'||reason==='EAI_AGAIN')return new DeepSeekError(502,'DEEPSEEK_DNS','服务器无法解析 DeepSeek 的域名，尚未收到 API 响应。需要检查服务器的 DNS 与出站网络。',{stage:'connect',reason});
 if(reason.includes('CERT')||reason.includes('TLS')||reason==='UNABLE_TO_VERIFY_LEAF_SIGNATURE')return new DeepSeekError(502,'DEEPSEEK_TLS','服务器与 DeepSeek 的 HTTPS 证书校验失败。需要修复服务器证书或代理设置；不要关闭证书校验。',{stage:'connect',reason});
 if(/redirect/i.test(e?.message||'')&&/invalid|unsupported|not supported|won.t be implemented/i.test(e?.message||''))return new DeepSeekError(502,'DEEPSEEK_RUNTIME','服务器运行时不支持当前 HTTP 重定向设置，验证请求未能发出。请联系网站维护者修复请求配置。',{stage:'connect',reason:'UNSUPPORTED_REDIRECT_MODE'});
 return new DeepSeekError(502,'DEEPSEEK_NETWORK',reason==='ECONNREFUSED'?'服务器连接 DeepSeek 时被拒绝，尚未收到 API 响应。需要检查服务器出站访问与代理。':reason==='ECONNRESET'?'服务器与 DeepSeek 的连接被中断，尚未完成验证。请重新尝试。':'服务器未能与 DeepSeek 建立完整连接，尚未收到有效 API 响应。需要检查出站网络、代理或服务可用性。',{stage:'connect',reason});
}
function httpFailure(status:number):DeepSeekError{
 const d:DeepSeekDiagnostic={stage:'http',upstreamStatus:status};
 if(status>=300&&status<400)return new DeepSeekError(502,'DEEPSEEK_REDIRECT',`DeepSeek 接口返回了重定向（HTTP ${status}）。为防止密钥发往其他地址，本次请求已停止；需要检查 API 地址或代理。`,d);
 switch(status){
  case 400:return new DeepSeekError(422,'DEEPSEEK_BAD_REQUEST','DeepSeek 拒绝了请求格式（HTTP 400），需要检查 API 参数与接口兼容性。',d);
  case 401:return new DeepSeekError(422,'KEY_REJECTED','DeepSeek 未接受这个密钥（HTTP 401）。请检查是否复制完整，以及是否已被撤销。',d);
  case 402:return new DeepSeekError(422,'DEEPSEEK_BALANCE','DeepSeek 返回账户余额不足（HTTP 402）。请在 DeepSeek 后台检查余额，充值后再验证。',d);
  case 403:return new DeepSeekError(422,'DEEPSEEK_FORBIDDEN','DeepSeek 拒绝访问（HTTP 403）。请检查 API 账号权限或服务地区限制；这不一定表示密钥填写错误。',d);
  case 404:return new DeepSeekError(502,'DEEPSEEK_ENDPOINT','DeepSeek 接口地址不存在（HTTP 404），需要检查服务器的 API 基础地址和接口路径。',d);
  case 429:return new DeepSeekError(503,'PROVIDER_BUSY','DeepSeek 返回请求频率限制（HTTP 429）。请稍后再验证；现有配置未改变。',d);
  case 500:return new DeepSeekError(502,'DEEPSEEK_SERVER','DeepSeek 服务内部错误（HTTP 500）。请稍后重试；现有配置未改变。',d);
  case 502:case 503:case 504:return new DeepSeekError(502,'PROVIDER_ERROR',`DeepSeek 或中间网关暂时不可用（HTTP ${status}）。请稍后重试；现有配置未改变。`,d);
  default:return new DeepSeekError(502,'PROVIDER_ERROR',`DeepSeek 请求未成功（HTTP ${status}），未完成验证。`,d);
 }
}
export async function fetchDeepSeekJSON(url:string,init:RequestInit,timeoutMs:number,fetcher:typeof fetch=fetch):Promise<unknown>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);let response:Response|undefined;
 try{
  // workerd supports only manual/follow. Inspect 3xx explicitly; never forward keys on a redirect.
  response=await fetcher(url,{...init,redirect:'manual',signal:controller.signal});
  if(!response.ok)throw httpFailure(response.status);
  let text:string;try{text=await response.text();}catch(error){throw connectionFailure(error,timeoutMs);}
  try{return JSON.parse(text);}catch{
   const type=(response.headers.get('content-type')||'').toLowerCase();const reason=type.includes('text/html')?'HTML_RESPONSE':type.includes('application/json')?'MALFORMED_JSON':'NON_JSON_RESPONSE';
   throw new DeepSeekError(502,'DEEPSEEK_INVALID_RESPONSE',`DeepSeek 返回了无法解析的${reason==='HTML_RESPONSE'?' HTML 页面':' JSON 数据'}（HTTP ${response.status}），而不是有效的 API 响应。需要检查网关、代理或服务状态。`,{stage:'decode',upstreamStatus:response.status,reason});
  }
 }catch(error){if(error instanceof DeepSeekError)throw error;throw connectionFailure(error,timeoutMs);}finally{clearTimeout(timer);}
}
export const DEFAULT_DEEPSEEK_MODEL='deepseek-flash';
export function deepSeekChatBody(model:string,messages:unknown[],maxTokens:number){
 return{model,messages,thinking:{type:'disabled'},response_format:{type:'json_object'},max_tokens:maxTokens,temperature:0.45,stream:false};
}
type ModelEntry={id?:unknown;input_modalities?:unknown;output_modalities?:unknown};
export function selectDeepSeekModel(data:unknown,preferred?:string):string{
 const list=data as {data?:unknown}|null;
 if(!list||!Array.isArray(list.data))throw new DeepSeekError(502,'DEEPSEEK_INVALID_MODELS','DeepSeek 返回的模型列表格式不正确（HTTP 200），无法确认模型权限，未保存密钥。',{stage:'validate',upstreamStatus:200,reason:'INVALID_MODEL_LIST'});
 const models=list.data.filter((entry:unknown):entry is ModelEntry=>entry!==null&&typeof entry==='object').filter(entry=>typeof entry.id==='string'&&/^deepseek-[A-Za-z0-9_.-]{1,100}$/.test(entry.id)&&(!Array.isArray(entry.input_modalities)||entry.input_modalities.includes('text'))&&(!Array.isArray(entry.output_modalities)||entry.output_modalities.includes('text'))).map(entry=>entry.id as string);
 if(models.includes(DEFAULT_DEEPSEEK_MODEL))return DEFAULT_DEEPSEEK_MODEL;
 if(preferred&&models.includes(preferred))return preferred;
 if(models.includes('deepseek-v4-pro'))return 'deepseek-v4-pro';
 if(models.length)return models.slice().sort()[0];
 throw new DeepSeekError(422,'MODEL_UNAVAILABLE','DeepSeek 已返回模型列表，但列表中没有可用于文本对话的模型。未进行调用，也未保存密钥。',{stage:'validate',upstreamStatus:200,reason:'NO_COMPATIBLE_MODELS'});
}
export type VerifiedDeepSeek={model:string;validatedAt:string};
export async function verifyDeepSeekKey(key:string,preferredModel:string|undefined,fetcher:typeof fetch=fetch):Promise<VerifiedDeepSeek>{
 const headers={Authorization:`Bearer ${key}`,Accept:'application/json'};
 const list=await fetchDeepSeekJSON('https://api.deepseek.com/models',{method:'GET',headers},30000,fetcher);
 const model=selectDeepSeekModel(list,preferredModel);
 // A listed model alone is insufficient: perform exactly one tiny real call,
 // with the same non-thinking JSON profile used for interviews and reports.
 const result=await fetchDeepSeekJSON('https://api.deepseek.com/chat/completions',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(deepSeekChatBody(model,[{role:'system',content:'Return only a JSON object.'},{role:'user',content:'Return exactly {"ok":true} as JSON.'}],32))},30000,fetcher) as {choices?:{finish_reason?:string;message?:{content?:unknown}}[]}|null;
 const choice=result?.choices?.[0];const content=choice?.message?.content;
 if(choice?.finish_reason!=='stop'||typeof content!=='string'||!content.trim())throw new DeepSeekError(502,'MODEL_PROBE_INCOMPLETE','模型列表获取成功，但真实模型调用未返回完整的最终回答，未保存密钥。',{stage:'validate',upstreamStatus:200,reason:'INCOMPLETE_MODEL_PROBE'});
 let json;try{json=JSON.parse(content);}catch{throw new DeepSeekError(502,'MODEL_PROBE_INVALID','真实模型调用返回了无效 JSON，尚不能确认网站所需的结构化输出能力，未保存密钥。',{stage:'validate',upstreamStatus:200,reason:'INVALID_PROBE_JSON'});}
 if(json?.ok!==true)throw new DeepSeekError(502,'MODEL_PROBE_INVALID','模型未通过最小调用验证，未保存密钥。',{stage:'validate',upstreamStatus:200,reason:'PROBE_NOT_CONFIRMED'});
 return{model,validatedAt:new Date().toISOString()};
}
