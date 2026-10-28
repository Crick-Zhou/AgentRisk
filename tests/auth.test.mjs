import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuth,makeAuthConfig} from '../server/auth.mjs';
const origin='https://203.0.113.10',password='fictional-password-for-tests-only';
const config=await makeAuthConfig('demo',password,origin);
const assets={'/login.html':'LOGIN','/login.css':'CSS','/login.js':'JS'};
function request(path,{method='GET',body,cookie,requestOrigin=origin,headers={}}={}){return new Request(origin+path,{method,headers:{...(method==='POST'?{'Content-Type':'application/json',Origin:requestOrigin}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
async function login(auth,extra={}){return auth.handle(request('/auth/login',{method:'POST',body:{username:'demo',password},...extra}),{client:'test',assets});}
test('auth fails closed and accepts only exact configured host with HTTPS proxy',()=>{
  assert.throws(()=>createAuth('{}'));
  assert.throws(()=>createAuth({...config,publicOrigin:'http://203.0.113.10'}));
  const auth=createAuth(config);
  assert.equal(auth.originFor('203.0.113.10','https'),origin);
  for(const host of ['evil.example','203.0.113.10.evil.example','203.0.113.10:8080'])assert.equal(auth.originFor(host,'https'),null);
  assert.equal(auth.originFor('203.0.113.10','http'),null);
});
test('all business routes and assets require authentication',async()=>{
  const auth=createAuth(config);
  for(const path of ['/','/app.js','/styles.css','/index.html','/concept/index.html'])assert.equal((await auth.handle(request(path),{assets})).status,303);
  for(const path of ['/api/runtime','/api/catalog','/api/health','/api/connect','/api/case','/api/report'])assert.equal((await auth.handle(request(path),{assets})).status,401);
  assert.equal(await (await auth.handle(request('/login'),{assets})).text(),'LOGIN');
  assert.equal(await (await auth.handle(request('/login.js'),{assets})).text(),'JS');
});
test('login creates Secure cookie, authorizes API, logout invalidates replay',async()=>{
  const auth=createAuth(config),response=await login(auth);assert.equal(response.status,200);
  const setCookie=response.headers.get('set-cookie');for(const value of ['__Host-agentrisk=','Secure','HttpOnly','SameSite=Strict','Path=/'])assert.ok(setCookie.includes(value));
  const cookie=setCookie.split(';')[0];
  assert.equal(await auth.handle(request('/api/catalog',{cookie})),null);
  const logout=await auth.handle(request('/auth/logout',{method:'POST',body:{},cookie}));assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal((await auth.handle(request('/api/catalog',{cookie}))).status,401);
});
test('expired, forged and wrong-origin sessions do not authorize',async()=>{
  let time=0;const auth=createAuth(config,{now:()=>time});const response=await login(auth),cookie=response.headers.get('set-cookie').split(';')[0];
  assert.equal((await auth.handle(request('/api/catalog',{cookie:cookie+'tampered'}))).status,401);
  assert.equal((await auth.handle(request('/api/case',{method:'POST',cookie,body:{},requestOrigin:'https://evil.example'}))).status,403);
  time=3600001;assert.equal((await auth.handle(request('/api/catalog',{cookie}))).status,401);
});
test('login CSRF, invalid credentials and repeated attempts are rejected',async()=>{
  const auth=createAuth(config);
  assert.equal((await login(auth,{requestOrigin:'https://evil.example'})).status,403);
  assert.equal((await login(auth,{body:{username:'demo',password:'wrong'}})).status,401);
  for(let i=0;i<7;i++)assert.equal((await login(auth,{body:{username:[],password:null}})).status,401);
  assert.equal((await login(auth)).status,429);
});
test('one expensive hash at a time and login rotation revoke previous session',async()=>{
  const auth=createAuth(config),responses=await Promise.all([login(auth),login(auth)]);
  assert.deepEqual(responses.map(x=>x.status).sort(),[200,429]);
  const cookie=responses.find(x=>x.status===200).headers.get('set-cookie').split(';')[0];
  const next=await login(auth,{cookie});assert.equal(next.status,200);
  assert.equal((await auth.handle(request('/api/catalog',{cookie}))).status,401);
});
