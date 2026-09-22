import {allEvents,putEvents} from './data.js';
const cfg=window.ESTUDO_CONFIG||{};
export const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseKey);
const storageKey='estudo-personal:'+cfg.supabaseUrl;
let access;try{access=JSON.parse(localStorage.getItem(storageKey)||'null')}catch{access=null}
let legacy;try{legacy=JSON.parse(localStorage.getItem('estudo-auth')||'null')}catch{legacy=null}
export const connected=()=>Boolean(access?.key&&access?.id);
export const owner=()=>access?.id||legacy?.user?.id||'local';
export const hasLegacy=()=>Boolean(legacy?.user?.id);
async function request(path,body,token){
 const res=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+path,{method:body?'POST':'GET',headers:{apikey:cfg.supabaseKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const data=await res.json().catch(()=>null);if(!res.ok)throw Error(data?.message||data?.msg||'Não foi possível sincronizar. Verifique a conexão e a configuração.');return data;
}
const rpc=(name,args)=>request('/rest/v1/rpc/'+name,args);
export async function pair(key,includeLocal=false){
 if(!configured)throw Error('Configure a URL e a chave pública em config.js.');
 key=key.trim().toLowerCase();if(!/^[a-f0-9]{64}$/.test(key))throw Error('Cole a chave pessoal de 64 caracteres gerada no Supabase.');
 const result=await rpc('estudo_connect',{p_key:key});if(!result?.workspace_id)throw Error('Resposta de vinculação inválida.');
 const oldOwner=owner(),next={key,id:result.workspace_id};
 if(includeLocal){const local=(await allEvents()).filter(e=>e.owner===oldOwner);await putEvents(local.map(e=>({...e,owner:next.id,synced:false})));const timer=localStorage.getItem('estudo-timer-'+oldOwner);if(timer)localStorage.setItem('estudo-timer-'+next.id,timer)}
 localStorage.setItem(storageKey,JSON.stringify(next));access=next;
}
let inFlight;
export function sync(){
 if(!connected())return Promise.resolve(false);if(inFlight)return inFlight;
 const session={...access};
 inFlight=(async()=>{
  const pending=(await allEvents()).filter(e=>e.owner===session.id&&!e.synced);
  for(let i=0;i<pending.length;i+=100){const batch=pending.slice(i,i+100);await rpc('estudo_push',{p_key:session.key,p_events:batch.map(({id,kind,entity,payload,at})=>({id,kind,entity,payload,at}))});await putEvents(batch.map(e=>({...e,synced:true})))}
  const rows=await rpc('estudo_pull',{p_key:session.key});
  if(!Array.isArray(rows))throw Error('Resposta de sincronização inválida.');
  await putEvents(rows.map(e=>({...e,owner:session.id,synced:true})));
  return true;
 })().finally(()=>{inFlight=null});return inFlight;
}
export async function recoverLegacy(){
 if(!legacy?.user?.id)throw Error('Nenhuma sessão anterior encontrada neste navegador.');
 if(Date.now()>legacy.expires_at-60000){const r=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:legacy.refresh_token});legacy={...r,expires_at:Date.now()+r.expires_in*1000};localStorage.setItem('estudo-auth',JSON.stringify(legacy))}
 let offset=0;while(true){const rows=await request('/rest/v1/study_events?select=*&user_id=eq.'+legacy.user.id+'&order=id.asc&offset='+offset+'&limit=500',null,legacy.access_token);await putEvents(rows.map(e=>({id:e.id,entity:e.entity,kind:e.kind,payload:e.payload,at:e.at,owner:owner(),synced:!connected()})));if(rows.length<500)break;offset+=rows.length}
}
