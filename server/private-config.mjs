// Only the running server reads the authorized credential file. Never log its input.
const PROVIDERS={
  assessor:{endpoint:'https://api.openai.com/v1',model:'gpt-5.4-mini',fields:['openai_api_key','OPENAI_API_KEY']},
  target:{endpoint:'https://api.deepseek.com',model:'deepseek-flash',fields:['deepseek_api_key','DEEPSEEK_API_KEY']}
};
export function parsePrivateEnv(source){
  const permitted=new Set(Object.values(PROVIDERS).flatMap(x=>x.fields));
  const found={};
  for(const raw of String(source).replace(/^\uFEFF/,'').split(/\r?\n/)){
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    const match=line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if(!match||!permitted.has(match[1]))continue;
    if(Object.hasOwn(found,match[1]))throw new Error('密钥配置中存在重复字段；未打印字段值。');
    let value=match[2].trim();
    if(value.startsWith('"')||value.startsWith("'")){
      const quote=value[0],end=value.indexOf(quote,1);
      if(end<1||(!/^\s*(?:#.*)?$/.test(value.slice(end+1))))throw new Error('密钥配置引号格式不正确；未打印字段值。');
      value=value.slice(1,end);
    }else value=value.replace(/\s+#.*$/,'').trim();
    if(!value||value.length>512||/[\s\u0000-\u001f]/.test(value))throw new Error('密钥配置含空值或不支持的格式；未打印字段值。');
    found[match[1]]=value;
  }
  const keys={};
  for(const [role,p] of Object.entries(PROVIDERS)){
    const matches=p.fields.filter(f=>Object.hasOwn(found,f));
    if(matches.length!==1)throw new Error(`密钥字段 ${p.fields[0]} 缺失或存在重复别名；未打印字段值。`);
    keys[role]=found[matches[0]];
  }
  return keys;
}
export function createPrivateRuntime(source){
  const keys=parsePrivateEnv(source);
  const configureBody=(input,path)=>{
    const body={...input};
    let role;
    if(path==='/api/connect'){
      role=body.provider;
      if(!Object.hasOwn(PROVIDERS,role))throw new Error('连接测试必须指定 assessor 或 target。');
    }else if(path==='/api/case'&&body.mode!=='reference')role='target';
    else if(['/api/plan','/api/report','/api/draft'].includes(path)&&body.useAssessor===true)role='assessor';
    if(!role){delete body.config;return body;}
    const provider=PROVIDERS[role],requested=body.config||{};
    if(requested.endpoint){
      let url;try{url=new URL(requested.endpoint);}catch{throw new Error('服务端密钥模式下接口地址不可变更。');}
      if(url.protocol!=='https:'||url.hostname!==new URL(provider.endpoint).hostname||url.username||url.password||url.search||url.hash||url.port||!['','/','/v1','/v1/','/chat/completions','/v1/chat/completions'].includes(url.pathname))throw new Error('服务端密钥只能用于其对应的官方接口，已拒绝变更。');
    }
    const model=typeof requested.model==='string'?requested.model.trim():'';
    if(model&&!/^[A-Za-z0-9_.:/-]{1,120}$/.test(model))throw new Error('模型名格式不正确。');
    body.config={endpoint:provider.endpoint,model:model||provider.model,key:keys[role]};
    return body;
  };
  const sanitize=text=>Object.values(keys).reduce((value,key)=>value.split(key).join('[SERVER KEY REDACTED]'),String(text));
  return {configureBody,sanitize,publicConfig:{serverCredentials:true,configured:{assessor:true,target:true},access:'ssh-tunnel-only'}};
}
