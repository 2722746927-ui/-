/** Sites deployment adapter. Native Next.js API routes use the same handler. */
import { handlePlanner, type Config } from '../src/lib/server';
declare const SITE_ASSETS:Record<string,{body:string;type:string}>;
const buckets=new Map<string,{count:number;reset:number;active:number}>();
export default {
 async fetch(request:Request,env:Config):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==='/api/health')return Response.json({configured:Boolean(env.DEEPSEEK_API_KEY)},{headers:{'Cache-Control':'no-store'}});
  if(url.pathname==='/api/planner'){
   // Cloudflare sets this header; visitors cannot override it at the platform boundary.
   const identity=request.headers.get('cf-connecting-ip')||request.headers.get('oai-authenticated-user-id')||'unknown';
   const now=Date.now();if(buckets.size>2000)for(const[k,b]of buckets)if(b.reset<now&&b.active===0)buckets.delete(k);
   let b=buckets.get(identity);if(!b||b.reset<now){b={count:0,reset:now+15*60*1000,active:0};buckets.set(identity,b);}
   if(b.count>=15||b.active>=2)return Response.json({error:'请求较频繁，请稍后再试；你的回答已保留。',code:'RATE_LIMIT'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
   b.count++;b.active++;try{return await handlePlanner(request,env);}finally{b.active--;}
  }
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
  const path=url.pathname==='/'?'/index.html':url.pathname;
  const asset=SITE_ASSETS[path]||SITE_ASSETS[path+'.html'];
  if(!asset){const notFound=SITE_ASSETS['/404.html'];if(notFound)return serve(notFound,request,404);return new Response('Not found',{status:404});}
  return serve(asset,request,200,path.startsWith('/_next/')||path.startsWith('/fonts/'));
 }
};
function serve(asset:{body:string;type:string},request:Request,status:number,immutable=false){
 const headers={'Content-Type':asset.type,'Cache-Control':immutable?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Frame-Options':'SAMEORIGIN'};
 const binary=atob(asset.body);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 // The runtime handles HTTP compression. Decode embedded assets first to avoid
 // double-encoding the response at the Cloudflare boundary.
 const body=request.method==='HEAD'?null:new Response(bytes).body!.pipeThrough(new DecompressionStream('gzip'));
 return new Response(body,{status,headers});
}
