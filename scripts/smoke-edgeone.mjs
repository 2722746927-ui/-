// Exercises the real generated Next.js handler using synthetic answers and a
// fake DeepSeek transport. No live credentials, network calls, or user data.
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { once } from 'node:events';
const fixture=await build({entryPoints:['tests/fixtures.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {interview,report}=await import('data:text/javascript;base64,'+Buffer.from(fixture.outputFiles[0].text).toString('base64'));
const all=interview();let providerCalls=0;
const replies=[...all.rounds.slice(1).map(({summary,questions})=>({summary,questions})),report()];
process.env.DEEPSEEK_API_KEY='sk-fixture-only-not-a-real-credential';
process.env.DEEPSEEK_MODEL='deepseek-flash';
process.env.NODE_ENV='production';
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
 assert.equal(String(url),'https://api.deepseek.com/chat/completions','Unexpected outbound request');
 const data=JSON.parse(init.body);assert.equal(data.model,'deepseek-flash');
 assert.equal(data.response_format.type,'json_object');
 assert.match(data.messages[1].content,/访谈数据/);
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(replies[providerCalls++])}}]});
};
const artifact=resolve('.edgeone/cloud-functions/ssr-node');
process.chdir(artifact);
let server;
try{
 const {default:handler}=await import(pathToFileURL(resolve('handler.js')));
 server=createServer(async(req,res)=>{try{const response=await handler(req);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const call=(path,init={})=>realFetch(base+path,{...init,headers:{'x-forwarded-proto':'https','eo-pages-host':'planner.test',...init.headers}});
 const health=await call('/api/health');assert.equal(health.status,200);assert.equal((await health.json()).configured,true);
 for(let count=1;count<=3;count++){
  const action=count===3?'report':'followup';
  const response=await call('/api/planner',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://planner.test'},body:JSON.stringify({action,interview:{rounds:all.rounds.slice(0,count)}})});
  const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));
  if(action==='report'){assert.equal(body.data.reportVersion,2);assert.equal(body.data.motivation.actionLinks.length,body.data.actions.length);}else assert.equal(body.data.questions[0].topic,'future');
 }
 const denied=await call('/api/admin/deepseek');assert.equal(denied.status,401);
 assert.equal(providerCalls,3);
 console.log(JSON.stringify({verified:true,generatedHandler:true,syntheticFollowups:2,fourStageReport:true,adminDenied:true,realProviderRequests:0}));
}catch(error){console.error('Generated EdgeOne handler smoke failed:',error.message);process.exitCode=1;}finally{globalThis.fetch=realFetch;delete process.env.DEEPSEEK_API_KEY;if(server){server.closeAllConnections();server.close();}}
