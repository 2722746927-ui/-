import {it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=resolve('scripts/verify-edgeone-build.mjs');
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'planner-edgeone-'));
 const put=(name:string,value:unknown)=>{mkdirSync(resolve(root,name,'..'),{recursive:true});writeFileSync(join(root,name),typeof value==='string'?value:JSON.stringify(value));};
 for(const file of ['.next/BUILD_ID','.next/standalone/server.js','.edgeone/cloud-functions/ssr-node/index.mjs','.edgeone/cloud-functions/ssr-node/handler.js','.edgeone/assets/index.html','.edgeone/assets/fonts/NotoSansSC.ttf','.edgeone/assets/fonts/OFL.txt'])put(file,'fixture');
 const apis=['/api/planner','/api/health','/api/admin/deepseek'];
 put('.next/required-server-files.json',{config:{output:'standalone'}});
 put('.next/server/app-paths-manifest.json',Object.fromEntries(apis.map(path=>[`${path}/route`,`app${path}/route.js`])));
 for(const path of apis)put(`.next/server/app${path}/route.js`,'fixture');
 put('.edgeone/cloud-functions/ssr-node/config.json',{framework:{version:'16'},routes:apis.map(path=>({src:`^${path}$`}))});
 put('.edgeone/cloud-functions/ssr-node/app.json',{config:{generator:'@edgeone/opennextjs-pages@test'}});
 return{root,put,run:()=>spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'}),clean:()=>rmSync(root,{recursive:true,force:true})};
}
it('accepts actual SSR handler, all APIs, and PDF assets',()=>{const f=fixture();try{expect(f.run().status).toBe(0);}finally{f.clean();}});
it('rejects a pure-project fallback without the SSR handler',()=>{const f=fixture();try{rmSync(join(f.root,'.edgeone/cloud-functions/ssr-node/index.mjs'));expect(f.run().status).toBe(1);}finally{f.clean();}});
it('rejects static export even if stale server artifacts exist',()=>{const f=fixture();try{f.put('.next/required-server-files.json',{config:{output:'export'}});expect(f.run().status).toBe(1);}finally{f.clean();}});
it('does not confuse a catch-all with a registered planner API',()=>{const f=fixture();try{f.put('.edgeone/cloud-functions/ssr-node/config.json',{routes:[{src:'^/.*$'}]});expect(f.run().status).toBe(1);}finally{f.clean();}});
it('rejects missing Chinese font needed for PDF export',()=>{const f=fixture();try{rmSync(join(f.root,'.edgeone/assets/fonts/NotoSansSC.ttf'));expect(f.run().status).toBe(1);}finally{f.clean();}});
