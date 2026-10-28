import {initLanguage,getLanguage,L,text,addTranslations,translateDocument} from '/i18n.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={mode:'reference',catalog:[],selected:new Set(['S01','B03','S06']),results:[],running:false,busy:false,filter:'all',controller:null,run:null,extraCalls:0,serverCredentials:false,configured:{},draft:null};
const C=(zh,en)=>{addTranslations({[zh]:en});return L(zh,en);};
const S=(zh,en)=>{addTranslations({[zh]:en});return zh;};
const customDefinitions=()=>state.catalog.filter(t=>t.custom).map(t=>t.definition);
const labels={PASS:'通过',FAIL:'失败',PARTIAL:'业务未完成',INCONCLUSIVE:'待复核',NOT_SUPPORTED:'不可观测',ERROR:'执行错误'};
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),5000);}
function config(which){return {endpoint:$(which+'Endpoint').value.trim(),model:$(which+'Model').value.trim(),key:$(which+'Key').value.trim()};}
function clean(text){let value=String(text||'');for(const name of ['target','assessor']){const key=$(name+'Key').value;if(key)value=value.split(key).join('[Key 已移除]');}return value.replace(/\bsk-[a-zA-Z0-9_-]{8,}\b/g,'[Key 已移除]');}
async function api(path,body,signal){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,language:body.language||getLanguage()}),signal});let data;try{data=await response.json();}catch{throw new Error('服务返回异常，请稍后重试。');}if(response.status===401){showRelogin();throw new Error('登录已过期。请先导出已有结果，再点击顶部“重新登录”；无需刷新当前页面。');}if(!response.ok||data.error)throw new Error(data.error||'请求失败');return data;}
function showRelogin(){if(document.getElementById('reloginLink'))return;const link=document.createElement('a');link.id='reloginLink';link.href='/login';link.target='_blank';link.rel='noopener';link.textContent='重新登录';document.querySelector('.topright').append(link);}
async function loadPublicConfig(path){const response=await fetch(path);if(response.status===401){location.replace('/login');throw new Error('LOGIN_REQUIRED');}if(!response.ok)throw new Error('服务未就绪');return response.json();}
function message(role,text,rows,raw=false){const block=document.createElement('div');block.className='chatmsg '+role;block.innerHTML=`<span class="chatname">${role==='user'?'YOU':role==='error'?'提示':'AGENTRISK'}</span><p ${role==='user'||raw?'data-i18n-raw':''}>${esc(clean(text))}</p>`;if(rows){block.innerHTML+=`<div class="chattable"><table><thead><tr><th>任务</th><th>判定</th><th>依据</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(labels[r.status]||r.status)}</td><td>${esc(r.reason)}</td></tr>`).join(''):'<tr><td colspan="3">没有匹配记录。未执行项目不算通过。</td></tr>'}</tbody></table></div>`;}$('chatLog').append(block);$('chatLog').scrollTop=$('chatLog').scrollHeight;}
function log(text){const row=document.createElement('div');row.innerHTML=`<time>${new Date().toLocaleTimeString(getLanguage()==='en'?'en-GB':'zh-CN',{hour12:false})}</time> <span>${esc(clean(text))}</span>`;$('liveLog').append(row);$('liveLog').scrollTop=$('liveLog').scrollHeight;}
function useAssessor(){return state.mode!=='reference'&&$('useAssessor').checked;}
function checkKeys(target=false,assessor=false){if((target&&!state.configured.target&&!config('target').key)||(assessor&&!state.configured.assessor&&!config('assessor').key)){$('settingsDialog').showModal();throw new Error('请先填写对应的 API Key。Key 只保留在当前页面。');}}
function setBusy(busy){state.busy=busy;$('sendButton').disabled=busy||state.running;$('runButton').disabled=busy||state.running||!state.selected.size;document.querySelectorAll('[data-mode],.connect,#profile,#seed,#selectAll,[data-prompt],#settingsButton,[data-custom-action]').forEach(el=>el.disabled=busy||state.running);document.querySelectorAll('.testcard input').forEach(el=>el.disabled=busy||state.running);$('reportButton').disabled=busy||state.running;}
function renderPlan(){
  const sorted=[...state.catalog].sort((a,b)=>Number(state.selected.has(b.id))-Number(state.selected.has(a.id)));
  $('testList').innerHTML=sorted.map(t=>`<div class="testcard"><input type="checkbox" id="test-${t.id}" data-test="${t.id}" ${state.selected.has(t.id)?'checked':''}><div><label for="test-${t.id}"><strong><b>${t.custom?C('自定义','Custom'):t.id}</b><span ${t.custom?'data-i18n-raw':''}>${esc(t.name)}</span></strong></label><span>${esc(t.category)} · ${t.kind==='sandbox'?(state.mode==='blackbox'?'黑盒不可观测':'工具沙箱'):'聊天探针'}</span><p class="test-description" ${t.custom?'data-i18n-raw':''}>${esc(t.description)}</p>${t.custom?`<p class="small muted">${C('预期表现需人工复核；免密钥模式仅记录草案。','Expected behavior needs human review. No-key mode records a draft only.')}</p><button class="textbutton" data-remove-custom="${t.id}" data-custom-action>${C('移除项目','Remove test')}</button>`:''}</div></div>`).join('');
  document.querySelectorAll('[data-test]').forEach(el=>el.onchange=()=>{el.checked?state.selected.add(el.dataset.test):state.selected.delete(el.dataset.test);cost();});
  document.querySelectorAll('[data-remove-custom]').forEach(el=>el.onclick=()=>{if(state.busy||state.running)return;state.selected.delete(el.dataset.removeCustom);state.catalog=state.catalog.filter(t=>t.id!==el.dataset.removeCustom);renderPlan();});
  cost();$('promptPreview').textContent=(getLanguage()==='en'?state.promptsEn:state.prompts)?.[$('profile').value]||'';
}
function cost(){const n=state.selected.size;$('catalogCount').textContent=`共 ${state.catalog.length} 项 · ${state.catalog.filter(t=>t.kind==='sandbox').length} 项沙箱测试 + ${state.catalog.filter(t=>t.kind==='chat').length} 项聊天探针 · 已选 ${n} 项`;$('costNotice').textContent=state.mode==='reference'?`${n} 项任务 · 仅合成数据 · 0 次外部模型调用`:`${n} 项任务 · 每项最多 6 轮银行模型调用 · 按服务商计费`;$('runButton').disabled=state.running||state.busy||!n;}
function setMode(mode){if(state.running||state.busy)return;state.mode=mode;document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('active',el.dataset.mode===mode));$('modeNote').textContent={reference:'当前不会调用大模型，不消耗 API 额度。',wrapped:'OpenAI 做测评，DeepSeek 做银行业务；判定器独立验证。',blackbox:'不添加银行系统角色或工具；仅检查聊天回复，资金项不可观测。'}[mode];$('plannerLabel').textContent=mode==='reference'?'规则模式':$('useAssessor').checked?'OpenAI 测评智能体':'规则规划';$('runButton').textContent=mode==='reference'?'▶ 开始试跑':'▶ 开始真实 API 测评';renderPlan();}
function stats(){const r=state.results,s=r.filter(x=>typeof x.safety==='boolean'),u=r.filter(x=>typeof x.utility==='boolean'),f=r.filter(x=>x.status==='FAIL');return {total:r.length,safe:s.filter(x=>x.safety).length,sn:s.length,utility:u.filter(x=>x.utility).length,un:u.length,fail:f.length,calls:r.reduce((a,b)=>a+(b.apiCalls||0),0),attempts:r.reduce((a,b)=>a+(b.unsafeAttempts||0),0),blocked:r.reduce((a,b)=>a+(b.blocked||0),0)};}
function renderResults(){const s=stats();$('emptyState').classList.toggle('hidden',state.running||s.total>0);$('resultsArea').classList.toggle('hidden',!s.total);$('stats').innerHTML=[[C('已生成结果','Results recorded'),`${s.total} <span class="micro">/ ${state.run?.ids.length||0}</span>`],['安全通过 / 可判定',`${s.safe}<span class="micro"> / ${s.sn}</span>`],['业务完成 / 可判定',`${s.utility}<span class="micro"> / ${s.un}</span>`],['已观察失败',String(s.fail)]].map(([a,b],i)=>`<div><small>${a}</small><strong class="${i===3&&s.fail?'danger':''}">${b}</strong></div>`).join('');const rows=state.results.filter(r=>state.filter==='all'||r.status!=='PASS');$('resultRows').innerHTML=rows.map(r=>`<tr><td>${esc(r.name)}<small>${esc(r.id)} · ${esc(r.category)}</small></td><td><span class="status ${esc(r.status)}">${esc(labels[r.status])}</span></td><td>${r.unsafeAttempts} <span class="muted">/ ${r.blocked}</span></td><td>${r.mode==='blackbox'?'—':r.after.ledger.length+' 笔'}</td><td><button class="evidencebtn" data-evidence="${r.id}">查看证据 ↗</button></td></tr>`).join('')||'<tr><td colspan="5">没有匹配记录。</td></tr>';document.querySelectorAll('[data-evidence]').forEach(el=>el.onclick=()=>evidence(el.dataset.evidence));$('progressFill').style.width=(state.run?.ids.length?s.total/state.run.ids.length*100:0)+'%';$('gateNote').innerHTML=`<strong>${s.fail?'发现需要整改的安全失败':'仅在本次已执行范围内未记录安全失败'}</strong><br>危险工具尝试 ${s.attempts} 次，外部网关拦截 ${s.blocked} 次。未测、错误、不可观测与待复核不计入通过。${state.catalog.length} 项种子测试不能推出生产级安全或信用评级。`;
  if(state.run){$('runMeta').classList.remove('hidden');$('runMeta').textContent=`本轮：${state.run.mode==='reference'?'规则参考驱动器（非大模型）':state.run.mode==='wrapped'?'真实 API · 工具沙箱':'真实 API · 聊天黑盒'} / ${state.run.profile==='guarded'?'增强架构':'基础架构'} / ${state.run.id} / 已完成模型调用 ${s.calls+state.extraCalls} 次`;}
}
function parseConnection(text){const urls=text.match(/https:\/\/[^\s，。；"'<>]+/g)||[];let changed=false;for(const raw of urls){try{const u=new URL(raw);const who=u.hostname==='api.openai.com'?'assessor':u.hostname==='api.deepseek.com'?'target':null;if(who&&!u.search&&!u.username&&!u.password){$(who+'Endpoint').value=raw;changed=true;}}catch{}}const ds=text.match(/\bdeepseek-[a-zA-Z0-9.-]+/),oa=text.match(/\bgpt-[a-zA-Z0-9.-]+/);if(ds){$('targetModel').value=ds[0];changed=true;}if(oa){$('assessorModel').value=oa[0];changed=true;}return changed;}
async function submit(text,forceReport=false){
  if(state.busy||state.running||!text.trim())return;
  const sanitized=clean(text.trim());if(sanitized!==text.trim()){message('error','检测到疑似 API Key，未发送该消息。请将密钥填入连接设置中的密码框。');$('chatInput').value='';return;}
  $('chatInput').value='';message('user',sanitized);
  if(/^(确认加入|确认添加|confirm add|add this draft)[。.!！\s]*$/i.test(sanitized)&&state.draft){await confirmDraft();return;}
  if(/^(取消草案|cancel draft)[。.!！\s]*$/i.test(sanitized)){state.draft=null;message('assistant',C('已取消草案，原有结果未改变。','Draft cancelled. Existing results are unchanged.'));return;}
  if(parseConnection(sanitized))message('assistant','已识别官方接口地址 / 模型名并填入连接设置。密钥仍需在密码框单独填写。');
  setBusy(true);
  try{
    const newTest=/(新增|添加|创建|增加|新建|加一个|加一项).{0,20}(测试|用例|项目)|(?:add|create|new)\b.{0,35}\b(?:test|case|probe)\b/i.test(sanitized);
    const revise=state.draft&&/修改|改成|改为|改一下|change|revise|update draft/i.test(sanitized);
    const isReport=!newTest&&!revise&&state.results.length&&(forceReport||(/报告|表格|汇总|总结|哪些|问题|结果|列出|report|table|summar|issue|result|list/i.test(sanitized)&&!/测试计划|重新测|重测|只测|安排|完整测试|plan|retest|test only|schedule|full suite/i.test(sanitized)));
    checkKeys(false,useAssessor());
    if(newTest||revise){
      if(!revise&&customDefinitions().length>=20)throw new Error(C('最多保留20项自定义测试。请先导出或移除不需要的项目。','Keep at most 20 custom tests. Export or remove unneeded tests first.'));
      const out=await api('/api/draft',{request:sanitized,previousDraft:revise?state.draft:undefined,useAssessor:useAssessor(),config:useAssessor()?config('assessor'):undefined});
      state.draft=out.draft;state.extraCalls+=out.apiCalls||0;message('assistant',out.message+'\n'+C('也可继续聊天修改草案，或发送“确认加入”。','You can revise the draft in chat, or send “confirm add”.'),undefined,true);showDraft();
    }else if(isReport){
      const out=await api('/api/report',{question:sanitized,results:state.results,customTests:customDefinitions(),useAssessor:useAssessor(),config:useAssessor()?config('assessor'):undefined});state.extraCalls+=out.apiCalls||0;message('assistant',out.answer,out.rows,true);renderResults();
    }else{
      const plan=await api('/api/plan',{request:sanitized,mode:state.mode,customTests:customDefinitions(),useAssessor:useAssessor(),config:useAssessor()?config('assessor'):undefined});state.selected=new Set(plan.ids);state.extraCalls+=plan.apiCalls||0;$('planReason').textContent=plan.reason;message('assistant',`${plan.planner}已安排 ${plan.ids.length} 项：${plan.ids.join('、')}。\n${plan.reason}\n请检查右侧范围，再点击“开始”执行。`);renderPlan();
    }
  }catch(error){message('error',error.message);}finally{setBusy(false);}
}
async function run(){
  if(state.running||state.busy||!state.selected.size)return;
  if(state.results.length&&!confirm(C('开始新一轮会清空当前结果。请先导出需要保留的证据，继续吗？','A new run clears the current results. Export any evidence you need first. Continue?')))return;
  try{checkKeys(state.mode!=='reference',false);}catch(e){toast(e.message);return;}
  state.running=true;state.results=[];state.extraCalls=0;state.controller=new AbortController();
  state.run={id:'RUN-'+crypto.randomUUID().slice(0,8).toUpperCase(),mode:state.mode,profile:$('profile').value,seed:$('seed').value,language:getLanguage(),ids:state.catalog.filter(x=>state.selected.has(x.id)).map(x=>x.id),customTests:JSON.parse(JSON.stringify(customDefinitions().filter(x=>state.selected.has(x.id)))),started:new Date().toISOString(),targetModel:state.mode==='reference'?'规则参考驱动器':config('target').model};
  const runConfig=state.mode==='reference'?undefined:config('target'),extraPrompt=$('extraPrompt').value;
  $('liveLog').replaceChildren();setBusy(false);$('stopButton').classList.remove('hidden');$('runStatus').textContent='正在执行';$('runStatus').classList.remove('neutral');renderResults();log(`创建 ${state.run.id} · 每个测试使用独立沙箱`);
  try{
    for(const id of state.run.ids){
      if(state.controller.signal.aborted)break;
      const task=state.catalog.find(x=>x.id===id);log(`开始 ${id} ${task.name}`);
      const result=await api('/api/case',{id,customTest:state.run.customTests.find(t=>t.id===id),mode:state.run.mode,profile:state.run.profile,seed:state.run.seed,runId:state.run.id,language:state.run.language,extraPrompt,config:runConfig},state.controller.signal);
      registerResultTranslations(result);state.results.push(result);renderResults();log(`${id} ${labels[result.status]} · ${result.trace.filter(x=>x.type==='tool').length} 次工具调用 · ${result.after.ledger.length} 笔入账`);
      if(result.status==='ERROR'){log('接口或执行异常：停止后续任务，避免重复消耗额度。');break;}
    }
  }catch(error){if(error.name!=='AbortError'){message('error',error.message);log('运行中断：'+error.message);}else log('已停止，不再发起后续调用。进行中的服务商请求仍可能产生费用。');}
  finally{
    state.running=false;setBusy(false);$('stopButton').classList.add('hidden');const complete=state.results.length===state.run.ids.length;$('runStatus').textContent=complete?'本轮已完成':'本轮未完整执行';$('runStatus').classList.add('neutral');renderResults();const s=stats();
    message('assistant',`${state.run.mode==='reference'?'免密钥规则试跑':'真实 API 测评'}${complete?'完成':'已停止'}：执行 ${s.total}/${state.run.ids.length} 项，发现 ${s.fail} 项安全失败。\n安全通过 ${s.safe}/${s.sn} 个可判定任务；业务完成 ${s.utility}/${s.un} 个可判定任务。\n你可以点“查看证据”，或问我“列出有问题的部分”。${state.run.mode==='reference'?'\n注意：内置项目使用规则参考驱动器；自定义项目只记录待实测草案。均不是 DeepSeek 实测结果。':''}`);
    if(state.run.customTests.length)message('assistant',C('自定义任务的预期表现需要人工复核。免密钥模式中的自定义任务仅记录草案，尚未调用被测模型。','Custom expectations need human review. In no-key mode custom tasks are drafts only; the target model was not called.'));
  }
}
function evidence(id){const r=state.results.find(x=>x.id===id);if(!r)return;$('evidenceTitle').textContent=r.id+' · '+r.name;const section=(title,html)=>`<section class="evidencesection"><h3>${title}</h3>${html}</section>`;const pre=o=>`<pre>${esc(typeof o==='string'?o:JSON.stringify(o,null,2))}</pre>`;$('evidenceBody').innerHTML=`<span class="status ${r.status}">${esc(labels[r.status])}</span><p class="muted small">${esc(r.reason)}</p><p class="muted small">原始输入、回复和工具数据保留执行时语言；界面切换不修改证据。</p>`+section(r.executionState==='draft_only'?C('01 / 待发送的测试输入（尚未执行）','01 / Planned input (not executed)'):'01 / 发给银行助手的真实任务',pre(r.input))+section('02 / 银行助手的最终回复',pre(r.answer||'无最终回复'))+section('03 / 独立判定断言',`<div class="tablewrap"><table><thead><tr><th>检查项</th><th>期望</th><th>实际</th><th>判定</th></tr></thead><tbody>${r.checks.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(JSON.stringify(c.expected))}</td><td>${esc(JSON.stringify(c.actual))}</td><td>${c.passed===null?'待复核':c.passed?'符合':'不符'}</td></tr>`).join('')}</tbody></table></div>`)+section('04 / 工具调用与模型轨迹',r.trace.map(t=>t.type==='tool'?`<div class="traceitem"><strong>${esc(t.index+'. '+t.name)}</strong><small>${t.dangerous?'危险尝试 · ':''}${t.blocked?'网关拒绝':'已执行'}</small>${pre({arguments:t.args,result:t.output})}</div>`:`<div class="traceitem"><strong>${t.type==='input'?'输入':t.type==='error'?C('执行错误','Execution error'):'模型回复'}</strong>${pre(t.text)}</div>`).join('')||'<p class="muted">本任务没有工具调用。聊天输出不能证明工具执行。</p>')+section('05 / 模拟账本前后状态',`<div class="ledgergrid"><div><p>执行前</p>${pre(r.before)}</div><div><p>执行后</p>${pre(r.after)}</div></div>`)+section('06 / 复核信息',pre({run_id:r.run_id,model:r.model,mode:r.mode,profile:r.profile,version:r.version,started:r.started,finished:r.finished,apiCalls:r.apiCalls,usage:r.usage,fingerprint:r.fingerprint,evidenceHash:r.evidenceHash,limits:r.limits,language:r.language,note:L('SHA-256 用于导出完整性复核，不是数字签名或第三方认证。','SHA-256 supports export-integrity checks, not a digital signature or third-party certification.')}));$('evidenceDialog').showModal();}
function download(kind){
  if(!state.results.length)return;
  const limitations=L('仅合成数据与已测范围，不是银行安全认证。规则试跑不代表任何真实大模型的表现。','Synthetic data and executed scope only; not bank certification. Rule trials do not represent real model performance.');
  const payload={version:'agentrisk-0.4.0',displayLanguage:getLanguage(),run:state.run,summary:stats(),results:state.results,notRun:state.run.ids.filter(id=>!state.results.some(r=>r.id===id)),limitations};
  let data,type;const rows=state.results,show=value=>text(String(value??''));
  if(kind==='json'){data=JSON.stringify(payload,null,2);type='application/json';}
  else if(kind==='csv'){
    const cell=x=> '"'+String(x??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
    const headers=L(['任务ID','测试项','类别','判定','依据','危险尝试','已拦截','入账笔数','模型','模式'],['Task ID','Test','Category','Verdict','Reason','Unsafe attempts','Blocked','Ledger entries','Model','Mode']);
    data='\uFEFF'+[headers,...rows.map(r=>[r.id,show(r.name),show(r.category),show(labels[r.status]),show(r.reason),r.unsafeAttempts,r.blocked,r.mode==='blackbox'?L('不可观测','Not observable'):r.after.ledger.length,show(r.model),r.mode])].map(row=>row.map(cell).join(',')).join('\r\n');type='text/csv';
  }else{
    const safe=x=>String(x).replace(/\|/g,'\\|').replace(/\n/g,' ');
    data='# '+L('AgentRisk 金融智能体测评报告','AgentRisk Financial Agent Evaluation Report')+'\n\n'+L('运行','Run')+': '+state.run.id+'\n'+L('模式','Mode')+': '+state.run.mode+' / '+state.run.profile+'\n'+L('执行语言','Execution language')+': '+state.run.language+'\n'+L('被测模型','Target model')+': '+show(state.run.targetModel)+'\n'+L('种子','Seed')+': '+state.run.seed+'\n\n> '+limitations+'\n\n| '+L('任务 | 测试项 | 判定 | 证据摘要','Task | Test | Verdict | Evidence summary')+' |\n|---|---|---|---|\n'+rows.map(r=>'|'+[r.id,show(r.name),show(labels[r.status]),show(r.reason)].map(safe).join('|')+'|').join('\n');
    data+='\n\n## '+L('覆盖与限制','Coverage & limitations')+'\n\n'+L('已执行','Executed')+': '+rows.length+'/'+state.run.ids.length+'; '+L('未执行','Not run')+': '+(payload.notRun.join(', ')||L('无','None'))+'. '+L('未测、错误、待复核不算通过。','Unexecuted, erroneous and review-required tests are not passes.')+'\n\n'+rows.map(r=>'- '+r.id+': '+L('证据摘要','Evidence digest')+' SHA-256: '+r.evidenceHash).join('\n');type='text/markdown';
  }
  const blob=new Blob([clean(data)],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`AgentRisk-${state.run.id}-${getLanguage()}.${kind}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出。报告不包含 API Key。');
}
function registerResultTranslations(r){const en=r.presentation?.en;if(!en)return;const pairs={[r.name]:en.name,[r.category]:en.category,[r.reason]:en.reason,[r.limits]:en.limits};r.checks.forEach((c,i)=>{pairs[c.name]=en.checks[i].name;if(typeof c.expected==='string')pairs[c.expected]=en.checks[i].expected;if(typeof c.actual==='string')pairs[c.actual]=en.checks[i].actual;});addTranslations(pairs);}
function draftFromFields(){return state.draft?{...state.draft,name:$('draftName').value,prompt:$('draftPrompt').value,expected:$('draftExpected').value,baseId:$('draftBase').value}:null;}
function showDraft(){
  if(!state.draft)return;
  $('draftName').value=state.draft.name;$('draftPrompt').value=state.draft.prompt;$('draftExpected').value=state.draft.expected;
  $('draftBase').replaceChildren();
  for(const item of [{id:'chat',name:C('开放聊天探针（无资金工具）','Open chat probe (no money tools)')},...state.catalog.filter(t=>!t.custom)]){
    const option=document.createElement('option');option.value=item.id;option.textContent=item.id==='chat'?item.name:getLanguage()==='en'?item.nameEn:item.name;$('draftBase').append(option);
  }
  $('draftBase').value=state.draft.baseId;if(!$('customDialog').open)$('customDialog').showModal();
}
async function confirmDraft(){
  if(!state.draft||state.running||state.busy)return;
  const spec=$('customDialog').open?draftFromFields():{...state.draft};
  if([spec.name,spec.prompt,spec.expected].some(v=>clean(v)!==v)){message('error',C('草案中含疑似密钥，请移除后重试。','The draft appears to contain a key. Remove it before continuing.'));return;}
  spec.id='U-'+crypto.randomUUID().replaceAll('-','').slice(0,12);
  setBusy(true);
  try{
    const out=await api('/api/custom-tests',{tests:[...customDefinitions(),spec]});
    state.catalog=[...state.catalog.filter(t=>!t.custom),...out.tests];state.selected.add(spec.id);state.draft=null;$('customDialog').close();renderPlan();
    message('assistant',C('已加入新的自定义测试。你可以继续新增、导出测试集，或点击开始。新输入需切换真实API模式执行；预期表现仍需人工复核。','A new custom test was added. Add more, export the test set, or press Start. New inputs require live API mode, and expectations still need human review.'));
  }catch(error){message('error',error.message);}finally{setBusy(false);}
}
function saveTestSet(){
  const definitions=customDefinitions();if(!definitions.length){toast(C('尚无自定义测试。','No custom tests yet.'));return;}
  const payload={format:'agentrisk-test-set-v1',tests:definitions};
  const blob=new Blob([clean(JSON.stringify(payload,null,2))],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AgentRisk-custom-tests.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importTestSet(file){
  if(!file||state.busy||state.running)return;setBusy(true);
  try{
    if(file.size>600000)throw new Error(C('测试集文件不能超过600KB。','The test set must be under 600 KB.'));
    const raw=await file.text();if(clean(raw)!==raw)throw new Error(C('文件含疑似密钥，已拒绝导入。','The file appears to contain a key. Import rejected.'));
    const payload=JSON.parse(raw);if(payload.format!=='agentrisk-test-set-v1'||!Array.isArray(payload.tests))throw new Error(C('测试集格式不正确。','Invalid test-set format.'));
    const merged=[...customDefinitions()];
    for(const spec of payload.tests){const old=merged.find(x=>x.id===spec?.id);if(old){if(JSON.stringify(old)!==JSON.stringify(spec))throw new Error(C('编号冲突，请在原测试集修改后重新导出。','Conflicting ID. Revise and re-export the original test set.'));}else merged.push(spec);}
    const out=await api('/api/custom-tests',{tests:merged});state.catalog=[...state.catalog.filter(t=>!t.custom),...out.tests];renderPlan();message('assistant',C('测试集已导入。请勾选需要的项目，导入不会自动执行或清空已有结果。','Test set imported. Select the tests to run. Importing does not execute tests or clear results.'));
  }catch(error){message('error',error.message);}finally{$('customImport').value='';setBusy(false);}
}
function setupCustomTests(){
  addTranslations({'自定义测试':'Custom tests'});
  const bar=document.createElement('div');bar.className='custom-actions';
  const button=(label,action)=>{const b=document.createElement('button');b.className='secondary';b.textContent=label;b.dataset.customAction='';b.onclick=action;bar.append(b);};
  button(S('聊天新增测试','Add test via chat'),()=>{$('chatInput').value=C('新增一个测试：','Add a new test: ');$('chatInput').focus();});
  button(S('查看草案','View draft'),()=>state.draft?showDraft():toast(C('先在聊天中描述想新增的测试。','Describe the test you want to add in chat first.')));
  button(S('导出测试集','Export test set'),saveTestSet);button(S('导入测试集','Import test set'),()=>$('customImport').click());
  const input=document.createElement('input');input.id='customImport';input.type='file';input.accept='.json,application/json';input.hidden=true;input.onchange=()=>importTestSet(input.files[0]);bar.append(input);
  const note=document.createElement('p');note.className='small muted';note.textContent=S('自定义测试仅保留在本页，最多20项；刷新前请导出测试集。','Custom tests stay on this page, up to 20. Export the test set before refreshing.');
  $('testList').before(bar,note);
  const dialog=document.createElement('dialog');dialog.id='customDialog';
dialog.innerHTML=`<div class="dialoghead"><h2>${S('确认新测试草案','Review new test draft')}</h2><button id="closeCustom" class="close" aria-label="${S('关闭草案','Close draft')}">×</button></div><p class="small muted">${S('草案不会自动执行。修改并确认后加入计划；原始输入不会随界面语言切换而改写。','Drafts do not run automatically. Edit and confirm to add one to the plan. Switching the interface language does not rewrite the input.')}</p><label>${S('测试名称','Test name')}<input id="draftName" maxlength="100" data-i18n-raw></label><label>${S('发给被测助手的输入','Input sent to the target assistant')}<textarea id="draftPrompt" rows="4" maxlength="3000" data-i18n-raw></textarea></label><label>${S('预期表现（人工复核要求）','Expected behavior (human-review criteria)')}<textarea id="draftExpected" rows="3" maxlength="1200" data-i18n-raw></textarea></label><label>${S('执行场景','Execution scenario')}<select id="draftBase"></select></label><p class="small muted">${S('已有沙箱的金额、工具和审批规则不会被草案改变。新增输入需要真实API调用，按服务商计费；免密钥模式仅记录为待实测。','Drafts cannot change sandbox amounts, tools or approvals. New inputs require billable live API calls. No-key mode records them as awaiting execution.')}</p><div class="dialogfooter"><button id="cancelCustom" class="textbutton" data-custom-action>${S('取消草案','Cancel draft')}</button><button id="confirmCustom" class="primary" data-custom-action>${S('确认加入','Confirm and add')}</button></div>`;
  document.body.append(dialog);$('closeCustom').onclick=()=>{state.draft=draftFromFields();dialog.close();};dialog.addEventListener('cancel',()=>{state.draft=draftFromFields();});$('cancelCustom').onclick=()=>{state.draft=null;dialog.close();};$('confirmCustom').onclick=confirmDraft;
}
setupCustomTests();
initLanguage(document.querySelector('.topright'));
window.addEventListener('agentrisk-language',()=>{renderPlan();if(state.run)renderResults();if($('customDialog').open&&state.draft){state.draft=draftFromFields();showDraft();}setBusy(state.busy);translateDocument();});
document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>setMode(el.dataset.mode));
document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>$(el.dataset.close).close());
$('settingsButton').onclick=()=>$('settingsDialog').showModal();
$('clearKeys').onclick=()=>{$('targetKey').value='';$('assessorKey').value='';toast('两把 Key 已从当前页面清空。');};
$('useAssessor').onchange=()=>setMode(state.mode);
$('profile').onchange=renderPlan;
$('selectAll').onclick=()=>{state.selected=state.selected.size===state.catalog.length?new Set():new Set(state.catalog.map(x=>x.id));renderPlan();};
$('chatForm').onsubmit=e=>{e.preventDefault();submit($('chatInput').value);};
$('chatInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit($('chatInput').value);}};
document.querySelectorAll('[data-prompt]').forEach(el=>el.onclick=()=>submit(el.dataset.prompt));
$('runButton').onclick=run;
$('stopButton').onclick=()=>{state.controller?.abort();$('stopButton').disabled=true;setTimeout(()=>$('stopButton').disabled=false,500);};
document.querySelectorAll('[data-filter]').forEach(el=>el.onclick=()=>{state.filter=el.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===el));renderResults();});
$('reportButton').onclick=()=>submit(L('请汇总本轮结果，列出有问题、待复核和未测的部分，并解释改进方向。','Summarize this run: list issues, review-required and unexecuted tests, and explain improvements.'),true);
document.querySelectorAll('[data-export]').forEach(el=>el.onclick=()=>download(el.dataset.export));
document.querySelectorAll('[data-connection]').forEach(el=>el.onclick=async()=>{const name=el.dataset.connection;try{checkKeys(name==='target',name==='assessor');el.disabled=true;$(name+'Connection').textContent='正在发起一次真实、计费的短模型调用…';const out=await api('/api/connect',{provider:name,config:config(name)});$(name+'Connection').textContent=`连接成功 · ${out.model} · ${out.reply}`;}catch(error){$(name+'Connection').textContent=error.message;}finally{el.disabled=false;}});
window.addEventListener('beforeunload',e=>{if(state.running){e.preventDefault();e.returnValue='';}});
Promise.all([loadPublicConfig('/api/catalog'),loadPublicConfig('/api/runtime')]).then(([data,runtime])=>{
  state.catalog=data.tests;state.prompts=data.prompts;state.promptsEn=data.promptsEn;addTranslations(Object.fromEntries(data.tests.flatMap(t=>[[t.name,t.nameEn],[t.description,t.descriptionEn],[t.category,t.categoryEn]])));state.serverCredentials=runtime.serverCredentials;state.configured=runtime.configured||{};
  if(state.serverCredentials){
    for(const name of ['target','assessor']){$(name+'Key').disabled=true;$(name+'Key').placeholder='服务器已配置，不会返回浏览器';$(name+'Endpoint').readOnly=true;$(name+'Connection').textContent='已安全加载服务器配置，可直接测试连接。';}
    $('clearKeys').disabled=true;$('clearKeys').textContent='密钥仅由服务器管理';
    $('settingsDialog').querySelector('p').textContent='两把 Key 仅在你的服务器端加载，不会返回浏览器、写入报告或发送给另一个服务商。'+(runtime.authentication?'页面与测评接口均受登录保护。':'此部署仅通过 SSH 隧道访问。')+'模型调用仍按对应平台计费。';
    message('assistant','私人服务器模式已就绪：OpenAI 和 DeepSeek 的密钥均已在服务端加载，无需在页面填写。切换“双模型实测”即可使用。');
  }
  if(runtime.authentication){
    const logout=document.createElement('button');logout.className='secondary';logout.textContent='退出登录';
    logout.onclick=async()=>{if((state.running||state.results.length)&&!confirm(L('退出会离开当前页面。请确认已停止任务并导出需要保留的结果。继续退出？','Signing out leaves this page. Stop any tasks and export the results you want to keep. Sign out now?')))return;state.controller?.abort();try{const response=await fetch('/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok&&response.status!==401)throw new Error();location.replace('/login');}catch{toast(L('退出失败，请稍后重试。','Sign-out failed. Please try again.'));}};
    document.querySelector('.topright').append(logout);
  }
  $('toolList').innerHTML=data.tools.map(x=>`<span>${esc(x.function.name)}</span>`).join('');renderPlan();
}).catch(()=>{message('error','无法连接测评服务，请确认服务已启动并刷新。');$('runButton').disabled=true;});
