const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

async function game() {
  let time = 0, id = 0;
  const jobs = new Map();
  const nodes = new Map();
  function element() {
    const events = {}, attrs = {}, styles = new Map(), classes = new Set();
    return { dataset: {}, disabled: false, src: '', events,
      style: { setProperty: (k,v) => styles.set(k,v), removeProperty: k => styles.delete(k), getPropertyValue: k => styles.get(k) },
      classList: { add: (...xs) => xs.forEach(x=>classes.add(x)), remove: (...xs) => xs.forEach(x=>classes.delete(x)), toggle: (x,on) => on ? classes.add(x) : classes.delete(x) },
      setAttribute: (k,v) => attrs[k]=v, getAttribute: k => attrs[k],
      getBoundingClientRect: () => ({left:0,top:0,width:1280,height:426}),
      addEventListener: (k,f) => events[k]=f,
      setPointerCapture() {}, hasPointerCapture: () => false,
    };
  }
  const schedule = (fn, ms=0) => { jobs.set(++id,{fn,at:time+ms}); return id; };
  const context = { document: {querySelector: key => {if(!nodes.has(key)) nodes.set(key,element()); return nodes.get(key);}},
    window: {setTimeout:schedule,matchMedia:()=>({matches:false}),addEventListener(){}},
    requestAnimationFrame: fn => schedule(fn,16), cancelAnimationFrame: key=>jobs.delete(key),
    ResizeObserver: class {observe(){}},
    Image: class {set src(v){this.value=v; Promise.resolve().then(()=>this.onload());} decode(){return Promise.resolve();}},
  };
  vm.runInNewContext(fs.readFileSync('game.js','utf8'),context);
  const flush = async () => {for(let n=0;n<12;n++) await Promise.resolve();};
  const tick = async ms => {const end=time+ms; await flush(); while(true){const next=[...jobs].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;jobs.delete(next[0]);time=next[1].at;next[1].fn();await flush();}time=end;await flush();};
  const send = (type,x=600) => nodes.get('#ropeHit').events[type]({clientX:x,clientY:250,pointerId:1,button:0,isPrimary:true,preventDefault(){}});
  await flush();
  return {nodes,tick,send};
}
test('20px pull now commits; an interrupted settle cannot overwrite a new drag',async()=>{
  const g=await game();g.send('pointerdown');g.send('pointermove',580);await g.tick(16);
  assert.match(g.nodes.get('#fluidProgress').style.getPropertyValue('--drag-fill'), /./);
  g.send('pointerup',580);await g.tick(0);
  assert.ok(Number(g.nodes.get('#fluidProgress').style.getPropertyValue('--fill'))>.035);
  assert.equal(g.nodes.get('#stage').dataset.state,'settling');
  assert.equal(g.nodes.get('#leashControl').disabled,false);
  g.send('pointerdown');g.send('pointermove',400);await g.tick(16);
  const image=g.nodes.get('#celCurrent').src;
  await g.tick(2000);
  assert.equal(g.nodes.get('#stage').dataset.state,'dragging');
  assert.equal(g.nodes.get('#celCurrent').src,image);
});
test('cancel discards preview and queued pointer updates',async()=>{
  const g=await game();g.send('pointerdown');g.send('pointermove',350);g.send('pointercancel');await g.tick(1000);
  assert.equal(g.nodes.get('#stage').dataset.state,'idle');
  assert.equal(Number(g.nodes.get('#fluidProgress').style.getPropertyValue('--fill')),.035);
  assert.match(g.nodes.get('#celCurrent').src,/idle/);
});
test('rapid milestone interruptions retain chapter progress and remain playable',async()=>{
  const g=await game();for(let i=0;i<5;i++){g.send('pointerdown');g.send('pointerup',300);await g.tick(1);}
  assert.equal(g.nodes.get('#stage').dataset.chapter,'3');
  await g.tick(3000);
  assert.equal(g.nodes.get('#stage').dataset.state,'idle');
  assert.match(g.nodes.get('#celCurrent').src,/ch3/);
});
