// Build a static copy of the Next.js UI, then bundle the shared server API and
// compressed assets as one Worker. The normal Next.js source remains untouched.
import { cp,mkdir,readFile,writeFile,readdir,rm,symlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve,join,extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
const root=process.cwd();const temp=resolve(root,'work/sites-export');
await rm(temp,{recursive:true,force:true});await mkdir(temp,{recursive:true});
for(const name of ['app','src','public','package.json','package-lock.json','tsconfig.json','postcss.config.mjs'])await cp(join(root,name),join(temp,name),{recursive:true});
await rm(join(temp,'app/api'),{recursive:true,force:true});
await writeFile(join(temp,'next.config.mjs'),`export default {output:'export',poweredByHeader:false};\n`);
await symlink(join(root,'node_modules'),join(temp,'node_modules'),'dir');
execFileSync(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:temp,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
const types={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const assets={};
async function walk(dir,prefix=''){for(const e of await readdir(dir,{withFileTypes:true})){if(e.isDirectory())await walk(join(dir,e.name),prefix+'/'+e.name);else{const bytes=await readFile(join(dir,e.name));assets[prefix+'/'+e.name]={body:gzipSync(bytes,{level:9}).toString('base64'),type:types[extname(e.name)]||'application/octet-stream'};}}}
await walk(join(temp,'out'));
await mkdir(join(root,'dist/server'),{recursive:true});await mkdir(join(root,'dist/.openai'),{recursive:true});
await build({entryPoints:[join(root,'scripts/worker.ts')],outfile:join(root,'dist/server/index.js'),bundle:true,format:'esm',target:'es2022',platform:'browser',minify:true,define:{SITE_ASSETS:JSON.stringify(assets)}});
await cp(join(root,'.openai/hosting.json'),join(root,'dist/.openai/hosting.json'));
console.log(`Sites Worker built: ${Object.keys(assets).length} compressed assets, shared DeepSeek API handler.`);
