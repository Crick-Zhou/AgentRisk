import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHandler} from './core.mjs';
const root=new URL('../',import.meta.url);
const port=Number(process.env.PORT||4175);
const files={'/index.html':'app/index.html','/styles.css':'app/styles.css','/app.js':'app/app.js','/i18n.mjs':'app/i18n.mjs','/concept/index.html':'dist/index.html','/concept/styles.css':'dist/styles.css','/concept/app.js':'dist/app.js'};
http.createServer(async(req,res)=>{
  try{
    if(!['127.0.0.1','localhost'].includes((req.headers.host||'').split(':')[0])){res.writeHead(403);res.end('Invalid host');return;}
    const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>800000){res.writeHead(413);res.end('Too large');return;}chunks.push(chunk);}
    const assets=Object.fromEntries(await Promise.all(Object.entries(files).map(async([path,file])=>[path,await readFile(new URL(file,root),'utf8')])));
    const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,signal:controller.signal,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await createHandler(assets)(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"本地服务异常，请检查项目文件。"}');}
}).listen(port,'127.0.0.1',()=>console.log(`AgentRisk ready: http://127.0.0.1:${port}`));
