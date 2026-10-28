// UI-only translation. Never mutate evidence objects, input values or raw transcripts.
export const LANGUAGE_KEY='agentrisk.language';
let language='zh';try{if(globalThis.localStorage?.getItem(LANGUAGE_KEY)==='en')language='en';}catch{}
export const getLanguage=()=>language;
const dictionary=new Map(Object.entries({
  '智鉴 AgentRisk · 测评智能体':'AgentRisk · Evaluation Agent','登录 · 智鉴 AgentRisk':'Sign in · AgentRisk','AgentRisk 首页':'AgentRisk home','智鉴':'',
  '隔离实验环境':'Isolated test environment','⚙ API 连接设置':'⚙ API connections','不只听它怎么说，':'Beyond what an agent says,','验证它实际做了什么。':'verify what it actually does.',
  '用一个测评智能体，检查另一个金融智能体。':'Use an evaluation agent to test a financial agent.','从你的测试要求，到工具轨迹、沙箱账本与可复核报告。':'From your test request to tool traces, sandbox ledgers and reviewable reports.',
  '测评智能体':'Evaluation agent','规划 · 解释 · 报表':'Plan · Explain · Report','被测银行助手':'Target bank assistant','提示词 · 工具 · 业务':'Instructions · Tools · Tasks','独立规则判定 + 隔离工具沙箱':'Independent rule checks + isolated tool sandbox','证据优先':'Evidence first',
  '执行模式':'Execution mode','免密钥试跑':'No-key trial','规则参考驱动器（非大模型）':'Rule reference driver (not an LLM)','规则参考驱动器':'Rule reference driver','双模型实测':'Live dual-model test','聊天黑盒':'Chat-only test','只观测回复':'Responses only',
  '当前不会调用大模型，不消耗 API 额度。':'No model calls or API charges in this mode.','OpenAI 做测评，DeepSeek 做银行业务；判定器独立验证。':'OpenAI evaluates, DeepSeek performs bank tasks, and independent checks verify the outcome.','不添加银行系统角色或工具；仅检查聊天回复，资金项不可观测。':'No bank system role or tools are added. Chat responses only; financial controls are not observable.',
  '测评对话':'Evaluation chat','规则模式':'Rule mode','规则规划':'Rule planner','OpenAI 测评智能体':'OpenAI evaluation agent',
  '告诉我你想测什么。你可以让我检查隐私、审批绕过或重复执行，再根据结果生成问题表。':'Tell me what to test: privacy, approval bypass or duplicate execution. Then ask for an issue table based on the results.',
  '第一次建议用“三分钟演示”。免密钥模式用于验证流程，不是模型能力测评。':'Start with the three-minute demo. No-key mode validates the workflow, not a real model’s ability.',
  '三分钟演示 ↗':'Three-minute demo ↗','只测隐私 ↗':'Privacy only ↗','完整测试 ↗':'Full suite ↗',
  '请安排三分钟演示：正常业务、恶意文档和超时重试。':'Plan a three-minute demo: normal business, a malicious attachment and timeout retry.',
  '只测隐私保护，请列出测试计划。':'Test privacy only and list the test plan.','请完整测试全部项目。':'Plan the full test suite.',
  '测试要求或报告问题':'Test request or report question','例如：测试审批绕过，然后列出有问题的部分…':'For example: test approval bypass, then list the issues…','可粘贴接口地址与模型名，请勿粘贴 Key':'You may paste an endpoint and model name, but never an API key.','发送测试要求':'Send test request',
  '测试计划':'Test plan','全选 / 清空':'Select all / Clear','被测架构':'Target architecture','增强版 · 提示词 + 权限网关':'Guarded · Instructions + authorization gateway','基础版 · 提示词 + 宽松工具':'Basic · Instructions + permissive tools','复现种子':'Reproduction seed',
  '已准备三个演示任务。可直接试跑，也可先在左侧描述新的测试要求。':'Three demo tasks are selected. Run them now or describe a different scope in the chat.',
  '停止':'Stop','▶ 开始试跑':'▶ Start trial','▶ 开始真实 API 测评':'▶ Start live API test','执行结果与证据':'Results & evidence','尚未运行':'Not run','正在执行':'Running','本轮已完成':'Run complete','本轮未完整执行':'Run incomplete',
  '已执行任务':'Tasks executed','安全可判定':'Safety assessable','安全通过 / 可判定':'Safety passed / assessable','业务完成 / 可判定':'Business completed / assessable','业务完成':'Business completed','已观察失败':'Observed failures',
  '每一个结论，都应该有证据。':'Every conclusion needs evidence.','开始运行后，这里会出现实际回复、工具调用、':'Run tests to see actual responses, tool calls,','权限拦截与账本变化。没有预置评分。':'blocked actions and ledger changes. No preset scores.',
  '全部结果':'All results','问题与待复核':'Issues & review','让智能体总结 ↗':'Ask the agent to summarize ↗','测试任务':'Test task','判定':'Verdict','危险尝试 / 拦截':'Unsafe attempts / blocked','入账':'Ledger entries','查看证据 ↗':'View evidence ↗',
  '证据保留在当前页面 · 刷新前请导出':'Evidence stays in this page · Export before refreshing','报告 Markdown ↓':'Report Markdown ↓','表格 CSV ↓':'Table CSV ↓','完整证据 JSON ↓':'Full evidence JSON ↓',
  '研究原型，不是银行认证。':'Research prototype, not bank certification.','基础版故意开放部分工具控制，增强版增加外部网关；差异是整套 Agent 架构的差异，不能直接归因于模型。聊天黑盒不评估真实资金安全。':'The basic profile intentionally relaxes some tool controls; the guarded profile adds an external gateway. Differences reflect the whole agent architecture, not just the model. Chat-only mode cannot establish real-funds safety.',
  '查看早期概念稿 ↗':'Early concept (Chinese) ↗','连接你的两个智能体':'Connect your two agents','关闭连接设置':'Close connection settings',
  '两把 Key 分别使用，不互相发送。仅用于当前页面和服务端即时转发；应用不写入日志、报告或本地存储。模型服务商仍适用各自的数据政策。':'The keys are used separately and never sent to the other provider. They are used only in this page and server-side forwarding, not stored in logs, reports or local storage. Provider data policies still apply.',
  'API 地址':'API endpoint','模型名称':'Model name','仅本次会话使用':'This session only','测试 OpenAI 连接':'Test OpenAI connection','测试 DeepSeek 连接':'Test DeepSeek connection',
  '通过官方 Chat Completions 接口规划和分析。':'Plans and analyzes through the official Chat Completions API.','银行角色、客户上下文与工具在独立对话中注入。':'The bank role, customer context and tools are added to an isolated conversation.',
  '真实模型模式下，用 OpenAI 规划测试和回答报告问题':'Use OpenAI to plan tests and answer report questions in live-model modes','查看银行角色提示词、工具与自定义说明':'Bank instructions, tools and custom notes',
  '提示词会随“基础版 / 增强版”变化。自定义文字只影响银行模型，不修改判定器或网关。':'Instructions depend on the basic/guarded profile. Custom notes affect the bank model only, not the checks or gateway.',
  '附加角色说明（选填）':'Additional role instructions (optional)','例如：用简洁中文回答，逐步核对业务结果。':'For example: reply concisely in English and verify each business result.','清空两把 Key':'Clear both keys','保存到本次页面':'Keep for this page','执行证据':'Execution evidence','关闭证据详情':'Close evidence',
  '服务器已配置，不会返回浏览器':'Configured on server; never returned to the browser','已安全加载服务器配置，可直接测试连接。':'Server configuration loaded. You can test the connection.','密钥仅由服务器管理':'Keys are managed on the server',
  '两把 Key 仅在你的服务器端加载，不会返回浏览器、写入报告或发送给另一个服务商。':'Both keys are loaded only on your server, never returned to the browser, included in reports or sent to the other provider. ',
  '页面与测评接口均受登录保护。':'Both the workspace and evaluation API require login. ','此部署仅通过 SSH 隧道访问。':'This deployment is accessed through an SSH tunnel. ','模型调用仍按对应平台计费。':'Model calls are billed by their respective providers.',
  '私人服务器模式已就绪：OpenAI 和 DeepSeek 的密钥均已在服务端加载，无需在页面填写。切换“双模型实测”即可使用。':'Private server mode is ready. OpenAI and DeepSeek keys are loaded on the server; no browser key entry is needed. Select Live dual-model test to begin.',
  '退出登录':'Sign out','重新登录':'Sign in again','提示':'Notice','任务':'Task','依据':'Reason','符合':'Met','不符':'Not met','通过':'Pass','失败':'Fail','业务未完成':'Business incomplete','待复核':'Needs review','不可观测':'Not observable','执行错误':'Execution error',
  '没有匹配记录。未执行项目不算通过。':'No matching records. Unexecuted tests are not passes.','没有匹配记录。':'No matching records.','工具沙箱':'Tool sandbox','聊天探针':'Chat probe','黑盒不可观测':'Not observable in chat-only mode',
  '发现需要整改的安全失败':'Safety failures require remediation','仅在本次已执行范围内未记录安全失败':'No safety failure recorded within the executed scope',
  '未测、错误、不可观测与待复核不计入通过。':'Unexecuted, erroneous, unobservable and review-required tests are not passes. ',
  '增强架构':'Guarded architecture','基础架构':'Basic architecture','真实 API · 工具沙箱':'Live API · Tool sandbox','真实 API · 聊天黑盒':'Live API · Chat only',
  '01 / 发给银行助手的真实任务':'01 / Actual task sent to the bank assistant','02 / 银行助手的最终回复':'02 / Final bank-assistant response','03 / 独立判定断言':'03 / Independent assertions','04 / 工具调用与模型轨迹':'04 / Tool calls and model trace','05 / 模拟账本前后状态':'05 / Sandbox state before and after','06 / 复核信息':'06 / Review metadata',
  '无最终回复':'No final response','检查项':'Check','期望':'Expected','实际':'Actual','危险尝试 · ':'Unsafe attempt · ','网关拒绝':'Blocked by gateway','已执行':'Executed','输入':'Input','模型回复':'Model response','执行前':'Before','执行后':'After','本任务没有工具调用。聊天输出不能证明工具执行。':'No tool calls for this task. Text alone cannot establish execution.',
  '原始输入、回复和工具数据保留执行时语言；界面切换不修改证据。':'Raw inputs, responses and tool data retain the execution language. Switching the interface does not alter evidence.',
  'SHA-256 用于导出完整性复核，不是数字签名或第三方认证。':'SHA-256 supports export-integrity checks; it is not a digital signature or third-party certification.',
  '已导出。报告不包含 API Key。':'Exported. Reports do not contain API keys.','两把 Key 已从当前页面清空。':'Both keys have been cleared from this page.',
  '无法连接测评服务，请确认服务已启动并刷新。':'Unable to connect to the evaluation service. Check that it is running and refresh.',
  '请先填写对应的 API Key。Key 只保留在当前页面。':'Enter the required API key first. It stays in this page only.',
  '服务返回异常，请稍后重试。':'Unexpected server response. Please try again.','请求失败':'Request failed','服务未就绪':'Service not ready',
  '登录已过期。请先导出已有结果，再点击顶部“重新登录”；无需刷新当前页面。':'Your session expired. Export existing results, then use Sign in again at the top. You do not need to refresh this page.',
  '检测到疑似 API Key，未发送该消息。请将密钥填入连接设置中的密码框。':'Possible API key detected. The message was not sent. Enter keys only in the connection settings.',
  '已识别官方接口地址 / 模型名并填入连接设置。密钥仍需在密码框单独填写。':'Official endpoint/model recognized and added to settings. Server-managed keys do not need to be entered again.',
  '正在发起一次真实、计费的短模型调用…':'Making a short, billable live model call…','接口或执行异常：停止后续任务，避免重复消耗额度。':'API or execution error: remaining tasks stopped to avoid repeated charges.',
  '已停止，不再发起后续调用。进行中的服务商请求仍可能产生费用。':'Stopped; no further calls will be started. In-flight provider requests may still incur charges.',
  '退出会离开当前页面。请确认已停止任务并导出需要保留的结果。继续退出？':'Signing out leaves this page. Stop any tasks and export results you want to keep. Sign out now?','退出失败，请稍后重试。':'Sign-out failed. Please try again.',
  '登录测评工作台':'Sign in to your workspace','仅限授权访问。登录后可使用双模型测评、查看执行证据并导出报告。':'Authorized access only. Sign in to run dual-model evaluations, review evidence and export reports.',
  '账号':'Username','密码':'Password','登录':'Sign in','正在验证…':'Verifying…','API 密钥由服务器保管，无需在此输入。':'API keys are kept on the server; do not enter them here.','请勿与他人共享登录密码。':'Do not share your login password.',
  '账号或密码不正确。':'Incorrect username or password.','登录尝试过多，请 15 分钟后重试。':'Too many login attempts. Please try again in 15 minutes.','正在验证登录，请稍后重试。':'A login is being verified. Please try again shortly.','登录失败，请重试。':'Sign-in failed. Please try again.','暂时无法连接，请稍后再试。':'Unable to connect. Please try again later.',
  '拒绝跨站请求，请在本网站内操作。':'Cross-site request rejected. Use this website directly.','拒绝跨站请求。':'Cross-site request rejected.','请先登录，或重新登录已过期的会话。':'Please sign in or renew your expired session.','已有任务在执行，请稍后再试。':'Tasks are already running. Please try again shortly.',
  '任务ID':'Task ID','测试项':'Test','类别':'Category','危险尝试':'Unsafe attempts','已拦截':'Blocked','入账笔数':'Ledger entries','模型':'Model','模式':'Mode','AgentRisk 金融智能体测评报告':'AgentRisk Financial Agent Evaluation Report','覆盖与限制':'Coverage & limitations','未测、错误、待复核不算通过。':'Unexecuted, erroneous and review-required tests are not passes.',
  '仅合成数据与已测范围，不是银行安全认证。规则试跑不代表任何真实大模型的表现。':'Synthetic data and executed scope only; not bank safety certification. Rule trials do not represent real model performance.'
  ,'根据测试目录匹配你的要求；可在执行前勾选调整。':'Matched your request against the catalog. Adjust the selection before execution.'
  ,'规则规划（未调用模型）':'Rule planner (no model call)'
  ,'\n注意：这些是规则参考驱动器的实际沙箱结果，不是 DeepSeek 实测结果。':'\nNote: these are actual sandbox results from a rule reference driver, not live DeepSeek results.'
  ,'\n注意：内置项目使用规则参考驱动器；自定义项目只记录待实测草案。均不是 DeepSeek 实测结果。':'\nNote: built-in cases use a rule driver; custom tests record pending drafts only. Neither is a live DeepSeek result.'
}));
const rules=[
  [/^(免密钥规则试跑|真实 API 测评)(完成|已停止)：执行 (\d+)\/(\d+) 项，发现 (\d+) 项安全失败。\n安全通过 (\d+)\/(\d+) 个可判定任务；业务完成 (\d+)\/(\d+) 个可判定任务。\n你可以点“查看证据”，或问我“列出有问题的部分”。(.*)$/s,(_,mode,status,n,total,fail,safe,sn,utility,un,note)=>`${mode==='免密钥规则试跑'?'No-key rule trial':'Live API evaluation'} ${status==='完成'?'completed':'stopped'}: ${n}/${total} tasks executed; ${fail} safety failures.\nSafety passed: ${safe}/${sn} assessable tasks; business completed: ${utility}/${un} assessable tasks.\nSelect View evidence or ask for a list of issues.${text(note,'en')}`],
  [/^(\d+) 项任务 · 仅合成数据 · 0 次外部模型调用$/,(_,n)=>`${n} tasks · Synthetic data only · No model calls`],
  [/^(\d+) 项任务 · 每项最多 6 轮银行模型调用 · 按服务商计费$/,(_,n)=>`${n} tasks · Up to 6 bank-model rounds each · Provider billing applies`],
  [/^共 (\d+) 项 · (\d+) 项沙箱测试 \+ (\d+) 项聊天探针 · 已选 (\d+) 项$/,(_,a,b,c,d)=>`${a} total · ${b} sandbox tests + ${c} chat probes · ${d} selected`],
  [/危险工具尝试 (\d+) 次，外部网关拦截 (\d+) 次。/g,(_,a,b)=>`${a} unsafe tool attempts; ${b} blocked by the gateway. `],
  [/(\d+) 项种子测试不能推出生产级安全或信用评级。/g,(_,n)=>`${n} seed tests do not establish production safety or a credit rating.`],
  [/^创建 (.+) · 每个测试使用独立沙箱$/,(_,id)=>`Created ${id} · Each test uses an isolated sandbox`],
  [/^开始 ([SB]\d+) (.+)$/,(_,id,name)=>`Starting ${id} ${text(name,'en')}`],
  [/^([SB]\d+) (.+) · (\d+) 次工具调用 · (\d+) 笔入账$/,(_,id,s,a,b)=>`${id} ${text(s,'en')} · ${a} tool calls · ${b} ledger entries`],
  [/^连接成功 · (.+)$/,(_,s)=>`Connected · ${s}`],
  [/^本轮：(.+) \/ 已完成模型调用 (\d+) 次$/,(_,s,n)=>`Run: ${text(s,'en')} / ${n} model calls completed`],
  [/^(\d+) 笔$/,(_,n)=>`${n} entries`],
  [/^运行中断：(.+)$/,(_,s)=>`Run interrupted: ${text(s,'en')}`],
  [/^(.+)已安排 (\d+) 项：([^。]+)。\n(.+)\n请检查右侧范围，再点击“开始”执行。$/s,(_,p,n,ids,r)=>`${text(p,'en')} scheduled ${n} tasks: ${ids}.\n${r}\nReview the scope and press Start to execute.`]
];
let entries=[];function rebuild(){entries=[...dictionary].sort((a,b)=>b[0].length-a[0].length);}rebuild();
export function addTranslations(pairs){for(const [zh,en] of Object.entries(pairs||{}))if(zh&&typeof en==='string')dictionary.set(zh,en);rebuild();}
export function text(source,target=language){if(target!=='en'||typeof source!=='string')return source;let value=source;for(const [pattern,replace] of rules)value=value.replace(pattern,replace);for(const [zh,en] of entries)value=value.split(zh).join(en);return value;}
export const L=(zh,en)=>language==='en'?en:zh;
const remembered=new WeakMap(),attributes=new WeakMap();let applying=false;
export function translateDocument(root=document){
  if(applying)return;applying=true;
  try{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){
      if(node.parentElement?.closest('script,style,pre,[data-i18n-raw]'))continue;
      const old=remembered.get(node),source=old&&node.nodeValue===old.output?old.source:node.nodeValue;
      const output=text(source);remembered.set(node,{source,output});if(node.nodeValue!==output)node.nodeValue=output;
    }
    root.querySelectorAll?.('[placeholder],[aria-label],[title],[data-prompt]').forEach(el=>{
      const stored=attributes.get(el)||{};
      for(const attr of ['placeholder','aria-label','title','data-prompt'])if(el.hasAttribute(attr)){
        const value=el.getAttribute(attr),old=stored[attr],source=old&&old.output===value?old.source:value,output=text(source);
        stored[attr]={source,output};if(output!==value)el.setAttribute(attr,output);
      }
      attributes.set(el,stored);
    });
    document.documentElement.lang=language==='en'?'en':'zh-CN';
    document.querySelectorAll('[data-language]').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.language===language));el.classList.toggle('active',el.dataset.language===language);});
  }finally{applying=false;}
}
export function setLanguage(next){language=next==='en'?'en':'zh';try{globalThis.localStorage?.setItem(LANGUAGE_KEY,language);}catch{}translateDocument();globalThis.dispatchEvent(new Event('agentrisk-language'));}
export function initLanguage(container){
  const controls=document.createElement('div');controls.className='language-switch';controls.setAttribute('role','group');controls.setAttribute('aria-label','Language / 语言');controls.setAttribute('data-i18n-raw','');
  controls.innerHTML='<button type="button" data-language="zh">中文</button><button type="button" data-language="en">English</button>';
  container.prepend(controls);controls.querySelectorAll('button').forEach(el=>el.onclick=()=>setLanguage(el.dataset.language));
  translateDocument();let scheduled=false;
  new MutationObserver(records=>{if(!records.some(r=>r.type!=='attributes'||['placeholder','aria-label','title','data-prompt'].includes(r.attributeName)))return;if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;translateDocument();});}}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title','data-prompt']});
}
