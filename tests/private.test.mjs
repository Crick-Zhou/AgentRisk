import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePrivateEnv,createPrivateRuntime} from '../server/private-config.mjs';
import {createHandler} from '../server/core.mjs';
const fixture='openai_api_key=fictional_openai_secret\ndeepseek_api_key="fictional_deepseek_secret"\nUNRELATED=ignore_me';
test('private credentials parse only two permitted fields without shell expansion',()=>{
  assert.deepEqual(parsePrivateEnv(fixture),{assessor:'fictional_openai_secret',target:'fictional_deepseek_secret'});
  assert.equal(parsePrivateEnv('openai_api_key=$(echo_never_execute)\ndeepseek_api_key=demo').assessor,'$(echo_never_execute)');
  assert.throws(()=>parsePrivateEnv('openai_api_key=fictional_openai_secret'),error=>!error.message.includes('fictional_openai_secret'));
  assert.throws(()=>parsePrivateEnv(fixture+'\nopenai_api_key=duplicate'));
});
test('server credentials bind both role and official provider, ignoring client keys',()=>{
  const runtime=createPrivateRuntime(fixture);
  for(const path of ['/api/plan','/api/report']){const out=runtime.configureBody({useAssessor:true,config:{key:'attacker-key'}},path);assert.equal(out.config.key,'fictional_openai_secret');assert.equal(out.config.endpoint,'https://api.openai.com/v1');}
  const target=runtime.configureBody({mode:'wrapped'},'/api/case');assert.equal(target.config.key,'fictional_deepseek_secret');assert.equal(target.config.endpoint,'https://api.deepseek.com');
  assert.equal(runtime.configureBody({mode:'reference',config:{key:'not_allowed'}},'/api/case').config,undefined);
  assert.equal(runtime.configureBody({provider:'assessor'},'/api/connect').config.key,'fictional_openai_secret');
  assert.throws(()=>runtime.configureBody({provider:'unknown'},'/api/connect'));
  for(const endpoint of ['https://api.deepseek.com','https://evil.example','https://api.openai.com@evil.example','http://api.openai.com','https://api.openai.com/v1?key=wrong'])assert.throws(()=>runtime.configureBody({useAssessor:true,config:{endpoint}},'/api/plan'));
});
test('runtime metadata and error responses never expose server credentials',async()=>{
  const runtime=createPrivateRuntime(fixture),handle=createHandler({},runtime);
  const result=await (await handle(new Request('http://127.0.0.1:18475/api/runtime'))).json();
  assert.deepEqual(result.configured,{assessor:true,target:true});assert.equal(result.serverCredentials,true);assert.ok(!JSON.stringify(result).includes('fictional_'));
  assert.equal(runtime.sanitize('fictional_openai_secret fictional_deepseek_secret'),'[SERVER KEY REDACTED] [SERVER KEY REDACTED]');
  const bad=new Request('http://127.0.0.1:18475/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({useAssessor:true,config:{endpoint:'https://evil.example'}})});
  const response=await handle(bad);assert.equal(response.status,400);assert.ok(!(await response.text()).includes('fictional_'));
});
test('private deployment still executes reference tasks without network requests',async()=>{
  const handle=createHandler({},createPrivateRuntime(fixture));
  const response=await handle(new Request('http://127.0.0.1:18475/api/case',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'S06',mode:'reference',profile:'guarded'})}));
  const data=await response.json();assert.equal(data.status,'PASS');assert.equal(data.apiCalls,0);
});
