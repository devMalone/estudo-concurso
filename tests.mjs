// Execute com Node 22+: node tests.mjs. Não usa dependências de terceiros.
import assert from 'node:assert/strict';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const rows=new Map();let failWrite=false;
globalThis.indexedDB={open(){const r={};queueMicrotask(()=>{r.result={transaction(){const tx={objectStore(){return{getAll(){const q={};queueMicrotask(()=>{q.result=[...rows.values()];q.onsuccess()});return q},put(e){if(failWrite){queueMicrotask(()=>{tx.error=Error('quota');tx.onerror()});return}rows.set(e.id,structuredClone(e))}}}};setTimeout(()=>{if(!failWrite)tx.oncomplete?.()},0);return tx}};r.onsuccess()});return r}};
globalThis.window={ESTUDO_CONFIG:{supabaseUrl:'https://test.invalid',supabaseKey:'public-test'}};
const{project,record,allEvents,openDB,uid,future,putEvents}=await import('./data.js');
await openDB();const eid=uid();await record('local','exam',eid,{name:'Exame',intervals:'7,15,30'});await record('local','exam',eid,{name:'Alterado'});assert.equal(project(await allEvents())[0].name,'Alterado');assert.equal(future('2026-12-29',7),'2027-01-05');
const sid=uid();await record('local','session',sid,{exam:eid,name:'A',minutes:30,questions:20,right:16});await record('local','session',sid,{deleted:true});assert(!project(await allEvents()).some(x=>x.id===sid));
const a={id:uid(),kind:'exam',entity:eid,payload:{name:'A'},at:'2026-01-01T00:00:00Z'},b={...a,id:uid(),payload:{name:'B'},at:'2026-01-02T00:00:00Z'};assert.deepEqual(project([a,b]),project([b,a]));assert.throws(()=>putEvents([{...a,payload:{minutes:'<script>'}}]));
const user=uid(),remote=new Map();let offline=false,posts=0;
globalThis.fetch=async(url,opt={})=>{if(offline)throw Error('offline');if(url.includes('/auth/v1/'))return Response.json({access_token:'test',refresh_token:'refresh',expires_in:3600,user:{id:user,email:'teste@example.com'}});if(opt.method==='POST'){posts++;for(const row of JSON.parse(opt.body))if(!remote.has(row.id))remote.set(row.id,row);return new Response(null,{status:201})}return Response.json([...remote.values()])};
const cloud=await import('./cloud.js');assert.equal(await cloud.login('teste@example.com','12345678'),true);await cloud.adoptLocal();await cloud.sync();const count=remote.size;assert(count>0);await cloud.sync();assert.equal(remote.size,count);assert.equal(posts,1);assert((await allEvents()).every(e=>e.synced));
offline=true;await record(user,'session',uid(),{exam:eid,name:'Offline',minutes:10,questions:5,right:4});await assert.rejects(cloud.sync());assert((await allEvents()).some(e=>!e.synced));offline=false;await cloud.sync();assert.equal(remote.size,count+1);
const external={user_id:user,id:uid(),kind:'session',entity:uid(),payload:{exam:eid,name:'Outro aparelho',minutes:20,questions:10,right:8},at:new Date().toISOString()};remote.set(external.id,external);await cloud.sync();assert(project(await allEvents()).some(x=>x.name==='Outro aparelho'));
failWrite=true;await assert.rejects(record(user,'exam',uid(),{name:'Sem espaço'}));failWrite=false;
console.log('PASS: projeção, ordenação, exclusão lógica, datas, validação, login simulado, adoção local, envio idempotente, fila offline, recebimento remoto e erro de armazenamento.');
