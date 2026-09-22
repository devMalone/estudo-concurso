import assert from 'node:assert/strict';
import {leaves,leavesOf,progress,topicPath,distribution} from './study.js';
const t=[
 {id:'a',subject:'p',name:'Gramática',status:'pending'},
 {id:'b',subject:'p',parent:'a',name:'Concordância',status:'pending'},
 {id:'c',subject:'p',parent:'b',name:'Nominal',status:'done'},
 {id:'d',subject:'p',parent:'b',name:'Verbal',status:'pending'},
 {id:'e',subject:'m',name:'Porcentagem',status:'done'}
];
assert.deepEqual(leaves(t).map(x=>x.id).sort(),['c','d','e']);
assert.deepEqual(leavesOf(t,'a').map(x=>x.id).sort(),['c','d']);
assert.deepEqual(progress(t.filter(x=>x.subject==='p')),{total:2,done:1,percent:50});
assert.equal(topicPath(t,'c'),'Gramática / Concordância / Nominal');
const result=distribution([{id:'p',name:'Português',weight:2},{id:'m',name:'Matemática',weight:1}],t,[{subject:'p',questions:20,right:10}],600);
assert.equal(result.reduce((sum,x)=>sum+x.minutes,0),600);
assert(result.find(x=>x.id==='p').minutes>result.find(x=>x.id==='m').minutes);
console.log('PASS: árvore, progresso sem duplicidade, caminho e distribuição de estudo.');
