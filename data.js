export const uid=()=>crypto.randomUUID();
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const future=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export function project(events){const state={};for(const e of [...events].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.id.localeCompare(b.id))){const key=e.kind+':'+e.entity;state[key]={...(state[key]||{}),...e.payload,id:e.entity,kind:e.kind}}return Object.values(state).filter(x=>!x.deleted)}
function validate(e){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(e.id)||!uuid.test(e.entity)||!['exam','subject','topic','session','review','plan','mock'].includes(e.kind)||!Number.isFinite(Date.parse(e.at)))throw Error('Identificação de registro inválida.');
 const p=e.payload;if(!p||typeof p!=='object'||Array.isArray(p)||JSON.stringify(p).length>65536)throw Error('Conteúdo de registro inválido.');
 for(const [k,v]of Object.entries(p)){
  if(['minutes','questions','right','weight','day','score','max','weeklyMinutes'].includes(k)){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10000000)throw Error('Valor numérico inválido.');}
  else if(['done','deleted'].includes(k)){if(typeof v!=='boolean')throw Error('Estado inválido.');}
  else if(k==='parts'){if(!Array.isArray(v)||v.some(x=>typeof x.name!=='string'||['total','right','weight'].some(n=>typeof x[n]!=='number'||!Number.isFinite(x[n])||x[n]<0)))throw Error('Simulado inválido.');}
  else if(k==='parent'){if(v!==''&&!uuid.test(v))throw Error('Tópico pai inválido.');}
  else if(['exam','topic','subject'].includes(k)){if(!uuid.test(v))throw Error('Referência inválida.');}
  else if(['name','date','intervals','status','url','notes','type','time'].includes(k)){if(typeof v!=='string')throw Error('Texto inválido.');if(k==='intervals'&&!/^\d+(,\d+)*$/.test(v))throw Error('Intervalos inválidos.');if(k==='date'&&v&&!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Data inválida.');if(k==='time'&&!/^\d{2}:\d{2}$/.test(v))throw Error('Horário inválido.');}
  else throw Error('Campo de registro desconhecido.');
 }
}
let db;
export async function openDB(){db=await new Promise((resolve,reject)=>{const r=indexedDB.open('estudo-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('events',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});}
export function allEvents(){return new Promise((resolve,reject)=>{const r=db.transaction('events').objectStore('events').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export function putEvents(events){events.forEach(validate);return new Promise((resolve,reject)=>{const tx=db.transaction('events','readwrite');for(const e of events)tx.objectStore('events').put(e);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
let lastTime=0;
export async function record(owner,kind,entity,payload){lastTime=Math.max(Date.now(),lastTime+1);const event={id:uid(),owner,kind,entity,payload,at:new Date(lastTime).toISOString(),synced:false};await putEvents([event]);return event}
