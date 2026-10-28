import {initLanguage,getLanguage,text} from '/i18n.mjs';
initLanguage(document.querySelector('.login-card'));
const form=document.getElementById('loginForm'),button=document.getElementById('loginButton'),error=document.getElementById('loginError');
form.addEventListener('submit',async event=>{
  event.preventDefault();button.disabled=true;button.textContent='正在验证…';error.textContent='';
  try{
    const response=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.username.value.trim(),password:form.password.value,language:getLanguage()})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'登录失败，请重试。');
    form.password.value='';location.replace('/');
  }catch(e){error.textContent=text(e.message||'暂时无法连接，请稍后再试。');form.password.value='';form.password.focus();}
  finally{button.disabled=false;button.textContent='登录';}
});
