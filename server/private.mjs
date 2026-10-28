import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHandler} from './core.mjs';
import {createPrivateRuntime} from './private-config.mjs';
import {createAuth} from './auth.mjs';
const root=new URL('../',import.meta.url);
const port=Number(process.env.PORT||18475);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw new Error('Invalid private service port');
let runtime,auth;
try{
  runtime=createPrivateRuntime(await readFile(process.env.AGENTRISK_CREDENTIAL_FILE||'/run/secrets/dev.env','utf8'));
  auth=createAuth(await readFile(process.env.AGENTRISK_AUTH_FILE||'/run/secrets/auth.json','utf8'));
  runtime.publicConfig={...runtime.publicConfig,access:'password-protected',authentication:true};
}
catch{console.error('AgentRisk private configuration is unavailable or invalid; no credentials were printed.');process.exit(1);}
const files={'/index.html':'app/index.html','/styles.css':'app/styles.css','/app.js':'app/app.js','/i18n.mjs':'app/i18n.mjs','/concept/index.html':'dist/index.html','/concept/styles.css':'dist/styles.css','/concept/app.js':'dist/app.js','/login.html':'app/login.html','/login.css':'app/login.css','/login.js':'app/login.js'};
const assets=Object.fromEntries(await Promise.all(Object.entries(files).map(async([path,file])=>[path,await readFile(new URL(file,root),'utf8')])));
const handler=createHandler(assets,runtime);
let active=0;
const server=http.createServer(async(req,res)=>{
  const fail=(status,text)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({error:text}));};
  const send=async response=>{const output=runtime.sanitize(await response.text());res.writeHead(response.status,Object.fromEntries(response.headers));res.end(req.method==='HEAD'?undefined:output);};
  const origin=auth.originFor(req.headers.host,req.headers['x-forwarded-proto']);
  if(!origin||!req.url.startsWith('/')||req.url.startsWith('//')){fail(403,'访问地址未获允许。');return;}
  if(req.headers.origin&&req.headers.origin!==origin){fail(403,'拒绝跨站请求。');return;}
  if(!['GET','HEAD'].includes(req.method)&&(req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')){fail(403,'拒绝跨站请求。');return;}
  const client=origin===auth.publicOrigin?req.headers['x-agentrisk-client-ip']||req.socket.remoteAddress:req.socket.remoteAddress;
  let loginRequest;
  try{
    const check=new Request(`${origin}${req.url}`,{method:req.method,headers:req.headers});
    loginRequest=new URL(check.url).pathname==='/auth/login'&&req.method==='POST';
    if(!loginRequest){const gate=await auth.handle(check,{client,assets});if(gate){req.resume();await send(gate);return;}}
  }catch{fail(400,'请求格式不正确。');return;}
  if(active>=3){fail(429,'已有任务在执行，请稍后再试。');return;}
  active++;
  const controller=new AbortController();
  res.on('close',()=>{if(!res.writableEnded)controller.abort();});
  try{
    const bodyLimit=req.url.startsWith('/auth/')?2048:800000;
    if(Number(req.headers['content-length']||0)>bodyLimit){fail(413,'请求太大。');return;}
    const chunks=[];let size=0;
    const bodyTimer=setTimeout(()=>{controller.abort();if(!res.writableEnded)fail(408,'请求上传超时。');req.destroy();},10000);
    try{for await(const chunk of req){size+=chunk.length;if(size>bodyLimit){fail(413,'请求太大。');return;}chunks.push(chunk);}}
    finally{clearTimeout(bodyTimer);}
    const request=new Request(`${origin}${req.url}`,{method:req.method,headers:req.headers,signal:controller.signal,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await auth.handle(request,{client,assets})||await handler(request);
    await send(response);
  }catch{if(!res.writableEnded)fail(500,'服务暂时无法完成请求；未输出敏感信息。');}
  finally{active--;}
});
server.requestTimeout=30000;
server.headersTimeout=15000;
const bind=process.env.AGENTRISK_CONTAINER_NETWORK==='bridge'?'0.0.0.0':'127.0.0.1';
server.listen(port,bind,()=>console.log(`AgentRisk authenticated service ready on port ${port}; credentials loaded without disclosure.`));
const stop=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),12000).unref();};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
