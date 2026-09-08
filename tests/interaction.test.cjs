const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');const fs=require('node:fs');
const {assessPull,mapX}=require('../mechanics.js');
async function game({failBlack=false,reduced=false}={}){
  let time=0,id=0;const jobs=new Map(),nodes=new Map();
  const schedule=(fn,ms=0)=>{jobs.set(++id,{fn,at:time+ms});return id};
  const element=()=>{const events={},styles=new Map(),classes=new Set();return{events,dataset:{},hidden:false,value:0,textContent:'',naturalWidth:1536,naturalHeight:512,
    style:{setProperty:(k,v)=>styles.set(k,v)},classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),toggle:(x,b)=>b?classes.add(x):classes.delete(x)},
    parentElement:{setAttribute(){}},addEventListener:(k,f)=>events[k]=f,setAttribute(){},getBoundingClientRect:()=>({left:0,top:0,width:1280,height:426}),getContext:()=>({drawImage(){}}),setPointerCapture(){},hasPointerCapture:()=>false};};
  const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
  const breeds=[get('yellow'),get('black')];breeds[0].dataset.breed='yellow';breeds[1].dataset.breed='black';
  const document={getElementById:get,querySelectorAll:selector=>selector.includes('data-breed')?breeds:[element(),element(),element()],addEventListener(){}};
  const window={matchMedia:()=>({matches:reduced}),addEventListener(){}};
  const context={window,document,setTimeout:schedule,performance:{now:()=>time},requestAnimationFrame:fn=>schedule(()=>fn(time),16),ResizeObserver:class{observe(){}},Image:class{constructor(){this.naturalWidth=1536;this.naturalHeight=512}set src(v){this.value=v;Promise.resolve().then(()=>failBlack&&v.includes('/black/brace.')?this.onerror():this.onload())}decode(){return Promise.resolve()}}};
  for(const file of ['mechanics.js','frames.js','black-frames.js','game.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  const flush=async()=>{for(let n=0;n<100;n++)await Promise.resolve()};
  const tick=async ms=>{const end=time+ms;await flush();while(true){const next=[...jobs].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;jobs.delete(next[0]);time=next[1].at;next[1].fn();await flush()}time=end;await flush()};
  const send=(type,x=600)=>get('stage').events[type]({clientX:x,clientY:250,pointerId:1,button:0,isPrimary:true,preventDefault(){},target:{closest:()=>null}});
  await flush();return{get,tick,send};
}
test('gentle release is rewarded; excessive force never increases distance',()=>{
  assert.equal(assessPull({peak:1,tension:1}).gain,0);
  assert.ok(assessPull({peak:.55,tension:.35,gentleMs:400}).gain>assessPull({peak:.55,tension:.55,gentleMs:0}).gain);
});
test('scene mapping holds the hand fixed, dog rigid, leash continuous',()=>{
  assert.equal(mapX(300,220),300);assert.equal(mapX(480,220),480);
  assert.equal(mapX(900,220),680);assert.equal(mapX(1300,220)-mapX(1000,220),300);
});
test('20px pull commits and settle can be interrupted without stale frames',async()=>{
  const g=await game();g.send('pointerdown');g.send('pointermove',580);await g.tick(16);g.send('pointerup',580);await g.tick(1);
  assert.ok(Number(g.get('stage').dataset.progress)>0);assert.equal(g.get('leashControl').disabled,false);
  g.send('pointerdown');g.send('pointermove',440);await g.tick(16);const pose=g.get('stage').dataset.pose;
  await g.tick(2000);assert.equal(g.get('stage').dataset.state,'dragging');assert.equal(g.get('stage').dataset.pose,pose);
});
test('cancel discards preview and pending input',async()=>{
  const g=await game();g.send('pointerdown');g.send('pointermove',450);g.send('pointercancel');await g.tick(1000);
  assert.equal(g.get('stage').dataset.state,'idle');assert.equal(g.get('stage').dataset.progress,'0');assert.equal(g.get('stage').dataset.pose,'idle');
});
test('rapid steps retain position, finish persists, restart resets the walk',async()=>{
  const g=await game();for(let i=0;i<14;i++){g.get('leashControl').events.click();await g.tick(20)}await g.tick(1800);
  assert.equal(g.get('stage').dataset.state,'complete');assert.equal(g.get('stage').dataset.progress,'1');assert.equal(g.get('stage').dataset.position,'1.0000');
  await g.tick(5000);assert.equal(g.get('stage').dataset.state,'complete');
  g.get('restart').events.click();await g.tick(20);assert.equal(g.get('stage').dataset.progress,'0');assert.equal(g.get('stage').dataset.state,'idle');
});

test('switching breed during a step preserves distance and cancels stale playback',async()=>{
  const g=await game();g.get('leashControl').events.click();await g.tick(30);
  const distance=g.get('stage').dataset.progress;
  g.get('black').events.click();await g.tick(1000);
  assert.equal(g.get('stage').dataset.breed,'black');assert.equal(g.get('stage').dataset.progress,distance);assert.equal(g.get('stage').dataset.state,'idle');
  g.get('yellow').events.click();await g.tick(1000);assert.equal(g.get('stage').dataset.breed,'yellow');assert.equal(g.get('stage').dataset.progress,distance);
});

test('failed target skin leaves the current breed and progress intact',async()=>{
  const g=await game({failBlack:true});g.get('leashControl').events.click();await g.tick(800);
  const before=g.get('stage').dataset.progress;g.get('black').events.click();await g.tick(1000);
  assert.equal(g.get('stage').dataset.breed,'yellow');assert.equal(g.get('stage').dataset.progress,before);assert.match(g.get('breedStatus').textContent,/加载失败/);
});
test('switch at the final step cannot hide the completed result',async()=>{
  const g=await game();for(let i=0;i<9;i++){g.get('leashControl').events.click();await g.tick(20)}
  g.get('black').events.click();await g.tick(1000);
  assert.equal(g.get('stage').dataset.state,'complete');assert.equal(g.get('result').hidden,false);
});
test('reduced motion finishes and remains replayable',async()=>{
  const g=await game({reduced:true});g.get('leashControl').events.click();await g.tick(200);
  assert.equal(g.get('stage').dataset.state,'idle');assert.ok(Number(g.get('stage').dataset.position)>0);
});
test('pointer feedback is updated before the next animation frame',async()=>{
  const g=await game();g.send('pointerdown');g.send('pointermove',550);
  assert.ok(Number(g.get('stage').dataset.tension)>0);
  assert.ok(g.get('tensionMeter').value>0);
});
