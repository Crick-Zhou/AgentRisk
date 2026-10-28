import {randomBytes, scrypt, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';

const derive=promisify(scrypt);
const hashOptions={N:131072,r:8,p:1,maxmem:192*1024*1024};
const digest=value=>createHash('sha256').update(value).digest('hex');
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8',...extra}});
const redirect=path=>new Response(null,{status:303,headers:{...headers,Location:path}});

export async function makeAuthConfig(username,password,publicOrigin=''){
  if(!/^[a-zA-Z0-9_.-]{3,64}$/.test(username)||typeof password!=='string'||password.length<20||password.length>200)throw new Error('Invalid account configuration');
  const salt=randomBytes(32).toString('hex');
  return {username,salt,passwordHash:(await derive(password,salt,64,hashOptions)).toString('hex'),publicOrigin};
}

export function createAuth(source,{now=Date.now}={}){
  const config=typeof source==='string'?JSON.parse(source):source;
  if(!config||!/^[a-zA-Z0-9_.-]{3,64}$/.test(config.username)||!/^[a-f0-9]{64}$/.test(config.salt)||!/^[a-f0-9]{128}$/.test(config.passwordHash))throw new Error('Authentication configuration missing or invalid');
  let publicOrigin='';
  if(config.publicOrigin){
    const u=new URL(config.publicOrigin);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash||!u.hostname.includes('.')||u.hostname==='127.0.0.1')throw new Error('Invalid public origin');
    publicOrigin=u.origin;
  }
  const sessions=new Map(),attempts=new Map();let hashing=false;
  const absoluteMs=8*60*60*1000,idleMs=60*60*1000,windowMs=15*60*1000;
  function originFor(host,forwardedProto){
    if(/^((127\.0\.0\.1)|(localhost))(:\d+)?$/.test(host||''))return `http://${host}`;
    if(publicOrigin&&host===new URL(publicOrigin).host&&forwardedProto==='https')return publicOrigin;
    return null;
  }
  function prune(){
    const time=now();
    for(const [id,s] of sessions)if(time>=s.created+absoluteMs||time>=s.seen+idleMs)sessions.delete(id);
    for(const [id,b] of attempts)if(time>=b.until)attempts.delete(id);
  }
  function cookieName(origin){return origin.startsWith('https:')?'__Host-agentrisk':'agentrisk_local';}
  function cookie(origin,value,age){return `${cookieName(origin)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${origin.startsWith('https:')?'; Secure':''}`;}
  function tokenFrom(request){
    const name=cookieName(new URL(request.url).origin),parts=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));
    if(parts.length!==1)return '';
    const token=parts[0].slice(name.length+1);return /^[A-Za-z0-9_-]{43}$/.test(token)?token:'';
  }
  function sessionFor(request){
    const token=tokenFrom(request),key=digest(token),s=sessions.get(key);
    if(!token||!s||s.origin!==new URL(request.url).origin)return null;
    s.seen=now();return {key,...s};
  }
  function limited(client){
    const entries=[['global',60],['ip:'+String(client).slice(0,100),8]];
    if(entries.some(([key,max])=>(attempts.get(key)?.count||0)>=max))return true;
    if(attempts.size>2000)return true;
    for(const [key] of entries){const b=attempts.get(key)||{count:0,until:now()+windowMs};b.count++;attempts.set(key,b);}
    return false;
  }
  async function handle(request,{client='local',assets={}}={}){
    prune();
    const url=new URL(request.url),origin=url.origin,path=url.pathname,method=request.method;
    if(!['GET','HEAD'].includes(method)&&(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site'))return json({error:'拒绝跨站请求，请在本网站内操作。'},403);
    // Only the container's loopback health check bypasses authentication.
    if(path==='/api/health'&&origin.startsWith('http://')&&['GET','HEAD'].includes(method)&&['127.0.0.1','::ffff:127.0.0.1','::1'].includes(client))return json({ok:true});
    const session=sessionFor(request);
    if(path==='/auth/login'&&method==='POST'){
      if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'请求必须为 JSON。'},415);
      if(hashing)return json({error:'正在验证登录，请稍后重试。'},429,{'Retry-After':'2'});
      if(limited(client))return json({error:'登录尝试过多，请 15 分钟后重试。'},429,{'Retry-After':'900'});
      let body;try{const text=await request.text();if(text.length>2048)throw new Error();body=JSON.parse(text);}catch{return json({error:'账号或密码不正确。'},401);}
      if(typeof body?.username!=='string'||typeof body?.password!=='string'||body.username.length>64||body.password.length>200)return json({error:'账号或密码不正确。'},401);
      if(hashing)return json({error:'正在验证登录，请稍后重试。'},429,{'Retry-After':'2'});
      hashing=true;let valid=false;
      try{const actual=await derive(body.password,config.salt,64,hashOptions);valid=timingSafeEqual(actual,Buffer.from(config.passwordHash,'hex'))&&body.username===config.username;}
      finally{hashing=false;}
      if(!valid)return json({error:'账号或密码不正确。'},401);
      if(session)sessions.delete(session.key);
      if(sessions.size>=64)sessions.delete(sessions.keys().next().value);
      const token=randomBytes(32).toString('base64url');sessions.set(digest(token),{origin,created:now(),seen:now()});
      attempts.delete('ip:'+String(client).slice(0,100));
      return json({ok:true},200,{'Set-Cookie':cookie(origin,token,absoluteMs/1000)});
    }
    if(path==='/login'&&['GET','HEAD'].includes(method)){
      if(session)return redirect('/');
      return new Response(method==='HEAD'?null:assets['/login.html'],{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
    }
    if(['/login.css','/login.js','/i18n.mjs'].includes(path)&&['GET','HEAD'].includes(method))return new Response(method==='HEAD'?null:assets[path],{headers:{...headers,'Content-Type':path.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'}});
    if(!session)return path.startsWith('/api/')||path.startsWith('/auth/')?json({error:'请先登录，或重新登录已过期的会话。',loginRequired:true},401):redirect('/login');
    if(path==='/auth/logout'&&method==='POST'){
      sessions.delete(session.key);return json({ok:true},200,{'Set-Cookie':cookie(origin,'',0),'Clear-Site-Data':'"cache"'});
    }
    if(path==='/auth/session'&&method==='GET')return json({username:config.username});
    return null;
  }
  return {handle,originFor,publicOrigin};
}
