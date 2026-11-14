// Fail closed: a static-only build must never pass as this full-stack product.
import { readFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
const requireFile=path=>{if(!existsSync(join(root,path)))throw new Error(`Missing full-stack build artifact: ${path}`);};
const json=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
try{
 for(const file of ['.next/BUILD_ID','.next/standalone/server.js','.edgeone/cloud-functions/ssr-node/index.mjs','.edgeone/cloud-functions/ssr-node/handler.js','.edgeone/cloud-functions/ssr-node/config.json','.edgeone/assets/index.html','.edgeone/assets/fonts/NotoSansSC.ttf','.edgeone/assets/fonts/OFL.txt'])requireFile(file);
 const config=json('.next/required-server-files.json').config;
 if(config.output!=='standalone')throw new Error('Next.js must retain standalone server output; static export is not supported here.');
 const manifest=json('.next/server/app-paths-manifest.json');
 const routes=json('.edgeone/cloud-functions/ssr-node/config.json');
 for(const path of ['/api/planner','/api/health','/api/admin/deepseek']){
  if(!manifest[`${path}/route`])throw new Error(`Missing Next.js API route: ${path}`);
  requireFile(`.next/server/${manifest[`${path}/route`]}`);
  if(!routes.routes.some(route=>route.src===`^${path}$`))throw new Error(`Missing EdgeOne server routing: ${path}`);
 }
 const provenance=json('.edgeone/cloud-functions/ssr-node/app.json').config.generator;
 if(!provenance?.startsWith('@edgeone/opennextjs-pages@'))throw new Error('Missing official Next.js adapter provenance.');
 console.log(JSON.stringify({verified:true,adapter:provenance,next:routes.framework?.version,serverAPIs:3,chinesePDFAssets:true}));
}catch(error){console.error(`EdgeOne full-stack verification failed: ${error.message}`);process.exitCode=1;}
