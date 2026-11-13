// Read the short-lived Sites credential from hidden stdin, never from arguments
// or a tracked file. Git receives authentication only in its process environment.
import { execFileSync } from 'node:child_process';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.includes('\n'))break;}
const credential=JSON.parse(input.trim());
const env={...process.env,GIT_TERMINAL_PROMPT:'0'};
if(credential.auth_mode!=='work_proxy'){
 if(!credential.token)throw new Error('Missing temporary source credential');
 env.GIT_CONFIG_COUNT='1';env.GIT_CONFIG_KEY_0='http.extraHeader';env.GIT_CONFIG_VALUE_0='Authorization: Bearer '+credential.token;
}
try{
 execFileSync('git',['push',credential.remote_url,`HEAD:refs/heads/${credential.branch}`],{env,stdio:['ignore','pipe','pipe']});
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const remote=execFileSync('git',['ls-remote',credential.remote_url,`refs/heads/${credential.branch}`],{env,encoding:'utf8'}).trim().split(/\s+/)[0];
 if(remote!==sha)throw new Error('Source branch verification failed');
 console.log(JSON.stringify({commit_sha:sha,verified:true}));
}catch(e){const message=String(e.stderr||e.message||'Source push failed');console.error(credential.token?message.split(credential.token).join('[REDACTED]'):message);process.exitCode=1;}
