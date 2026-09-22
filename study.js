export const childrenOf = (topics, id) => topics.filter(t => t.parent === id);
export function leavesOf(topics, id, seen = new Set()) {
  if (seen.has(id)) return [];
  seen.add(id);
  const node = topics.find(t => t.id === id);
  if (!node) return [];
  const children = childrenOf(topics, id);
  return children.length ? children.flatMap(t => leavesOf(topics, t.id, new Set(seen))) : [node];
}
export const leaves = topics => topics.filter(t => !topics.some(c => c.parent === t.id));
export function progress(topics) {
  const terminal = leaves(topics), done = terminal.filter(t => t.status === 'done').length;
  return {total: terminal.length, done, percent: terminal.length ? Math.round(done / terminal.length * 100) : 0};
}
export function topicPath(topics, id, seen = new Set()) {
  const t = topics.find(x => x.id === id);
  if (!t || seen.has(id)) return '';
  seen.add(id);
  const parent = t.parent && topicPath(topics, t.parent, seen);
  return parent ? parent + ' / ' + t.name : t.name;
}
export function distribution(subjects, topics, sessions, weeklyMinutes) {
  const demand = subjects.map(s => {
    const p = progress(topics.filter(t => t.subject === s.id)), logs = sessions.filter(x => x.subject === s.id);
    const q = logs.reduce((a,x) => a+x.questions,0), right = logs.reduce((a,x) => a+x.right,0);
    const gap = q ? 1-right/q : .5;
    const priority = p.total ? s.weight * (.3 + (1-p.percent/100)*.45 + gap*.25) : 0;
    return {...s, ...p, questions:q, accuracy:q ? Math.round(right/q*100) : null, priority};
  });
  const total = demand.reduce((a,s) => a+s.priority,0);
  const shares=demand.map(s=>({...s,minutes:total?Math.floor(weeklyMinutes*s.priority/total):0}));
  let remainder=total?weeklyMinutes-shares.reduce((a,s)=>a+s.minutes,0):0;
  for(const s of [...shares].sort((a,b)=>b.priority-a.priority)){if(remainder>0&&s.priority){s.minutes++;remainder--}}
  return shares;
}
