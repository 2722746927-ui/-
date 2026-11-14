import { fetchDeepSeekJSON,DeepSeekError } from './deepseek-http';
/** Temporary operator diagnostic. Never reads or accepts a provider credential. */
export async function connectivityProbe(request:Request,expected:string|undefined){
 if(!expected||request.headers.get('authorization')!==`Bearer ${expected}`)return new Response('Not found',{status:404});
 const results=[];
 for(const redirect of ['error','manual'] as const){
  const started=Date.now();
  try{const r=await fetch('https://api.deepseek.com/models',{redirect,signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});const body=await r.text();let json=false;try{JSON.parse(body);json=true;}catch{}results.push({redirect,status:r.status,contentType:r.headers.get('content-type'),json,durationMs:Date.now()-started});}
  catch(error){const e=error as Error;results.push({redirect,name:e.name,message:e.message.slice(0,220),durationMs:Date.now()-started});}
 }
 try{await fetchDeepSeekJSON('https://api.deepseek.com/models',{},10000);results.push({repairedClient:true,unexpectedSuccess:true});}catch(error){if(error instanceof DeepSeekError)results.push({repairedClient:true,code:error.code,...error.diagnostic});}
 return Response.json({results},{headers:{'Cache-Control':'no-store'}});
}
