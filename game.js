(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage=$('stage'), canvas=$('scene'), ctx=canvas.getContext('2d',{alpha:false});
  const poster=$('celCurrent'), cue=$('grabCue'), control=$('leashControl');
  const meter=$('tensionMeter'), message=$('message'), progress=$('walkProgress');
  const {clamp,assessPull,mapX}=window.ShibaRules;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const frames=window.ShibaFrames;
  const cache=new Map(), images=new Map();
  let mode='loading', currentPose='idle', currentImage=null;
  let distance=0, shownDistance=0, motion=null, drag=null, frameRequest=0, playback=0, raf=0;
  let bounds=stage.getBoundingClientRect(), lastTime=0, steps=0, gentleSteps=0, reactions=0;
  let breed='yellow';
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const phase=()=>Math.min(2,Math.floor(distance*3));
  const chapterNames=['出门的第一步','这块地，值得闻闻','好吧，再陪你走一段'];
  const initialHint='按住牵引绳向左轻拉，放松一点，再松手。';
  const pathsFor=()=> breed==='black' ? window.ShibaBlackFrames : frames;
  function setMode(value) {
    mode=value; stage.dataset.state=value; stage.dataset.chapter=String(phase()+1);
    control.disabled=value==='loading'||value==='complete';
    $('restart').hidden=value!=='complete';
    $('loading').hidden=value!=='loading';
  }
  function say(text) { message.textContent=text; }
  function updateProgress() {
    const percent=Math.round(distance*100);
    progress.value=percent;
    $('distance').textContent=percent+'%';
    $('chapter').textContent=distance>=1?'今天的散步，谈成了':chapterNames[phase()];
    stage.dataset.chapter=String(phase()+1);
    stage.dataset.progress=String(distance);
    $('route').style.setProperty('--progress',String(distance));
    document.querySelectorAll('.route-stop').forEach((node,i)=>node.classList.toggle('visited',distance>=(i+1)/3));
  }
  function preload(src) {
    if(cache.has(src))return cache.get(src);
    const task=new Promise(resolve=>{
      const img=new Image();img.decoding='async';
      img.onload=async()=>{try{await img.decode();images.set(src,img);resolve(img)}catch{cache.delete(src);resolve(null)}};
      img.onerror=()=>{cache.delete(src);resolve(null)};img.src=src;
    });cache.set(src,task);return task;
  }
  async function show(pose) {
    const request=++frameRequest;
    const src=pathsFor()[pose];
    const img=images.get(src)||await preload(src);
    if(!img||request!==frameRequest)return false;
    currentImage=img;currentPose=pose;stage.dataset.pose=pose;
    render();return true;
  }
  function render() {
    if(!currentImage)return;
    const img=currentImage,w=img.naturalWidth,h=img.naturalHeight;
    const x=shownDistance*220;
    const draw=(sx,sw,dx,dw)=>ctx.drawImage(img,sx/1536*w,0,sw/1536*w,h,dx,0,dw,512);
    draw(1484,52,0,1536); // existing unpainted paper margin, no generated background
    draw(0,480,0,480);
    draw(480,420,480,420-x);
    draw(900,636,900-x,636);
    poster.hidden=true;canvas.hidden=false;
    stage.dataset.position=shownDistance.toFixed(4);
    const endX=mapX(currentPose==='refusal'?1060:1035,x);
    $('ropeHit').setAttribute('d',`M 315 240 Q ${mapX(700,x)} ${['idle','hover','soften','replant','settled'].includes(currentPose)?430:295} ${endX} 300`);
  }
  function invalidate() {playback++;frameRequest++;return playback;}
  async function sequence(items,token) {
    for(const [pose,ms] of items){if(token!==playback)return false;await show(pose);if(token!==playback)return false;await wait(reduced.matches?20:ms)}
    return token===playback;
  }
  function wake() {if(!raf)raf=requestAnimationFrame(tick)}
  function tick(now) {
    raf=0;const dt=lastTime?Math.min(50,now-lastTime):0;lastTime=now;
    if(motion){const t=clamp((now-motion.start)/motion.duration);shownDistance=motion.from+(distance-motion.from)*(1-Math.pow(1-t,3));render();if(t>=1)motion=null;}
    if(drag){
      const tension=clamp((drag.startX-drag.x)/(bounds.width*.22));
      drag.tension=tension;drag.peak=Math.max(drag.peak,tension);
      drag.valid=drag.startX-drag.x>=4||drag.valid;
      if(tension>=.22&&tension<=.7)drag.gentleMs+=dt;
      paintDrag(tension);
    }
    if(drag||motion)wake();else lastTime=0;
  }
  function tensionPose(t) {
    const list=['soften','hover','takeup','pull','tight-1','brace','tight-2','crouch-1',reactions%2?'reactionB':'reactionA','turn-1','turn','turn-2','refusal'];
    return list[Math.min(list.length-1,Math.floor(t*list.length))];
  }
  function paintDrag(t) {
    const pose=tensionPose(t);if(pose!==currentPose)show(pose);
    const x=clamp(drag.x-bounds.left,0,bounds.width), y=clamp(drag.y-bounds.top,0,bounds.height);
    cue.style.transform=`translate3d(${x}px,${y}px,0)`;
    cue.style.setProperty('--tension',String(t));
    meter.value=t;stage.dataset.tension=t.toFixed(3);
    const feeling=t>.86?'strong':t>=.22&&t<=.7?'gentle':'loose';
    stage.dataset.feeling=feeling;
    $('tensionLabel').textContent=feeling==='strong'?'它开始较劲了':feeling==='gentle'?'这个力度刚刚好':'轻轻收绳';
  }
  function start(event) {
    if(drag||!['idle','settling'].includes(mode)||event.button!==0||event.isPrimary===false||event.target.closest('button'))return;
    event.preventDefault();invalidate();bounds=stage.getBoundingClientRect();
    drag={pointerId:event.pointerId,startX:event.clientX,x:event.clientX,y:event.clientY,tension:0,peak:0,gentleMs:0,valid:false};
    stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');setMode('dragging');
    paintDrag(0);wake();
  }
  function move(event){if(drag&&event.pointerId===drag.pointerId){drag.x=event.clientX;drag.y=event.clientY}}
  function cleanDrag() {
    const pointer=drag?.pointerId;drag=null;stage.classList.remove('is-dragging');meter.value=0;
    stage.dataset.feeling='loose';stage.dataset.tension='0';$('tensionLabel').textContent='轻拉 · 观察 · 松绳';
    if(pointer!==undefined&&stage.hasPointerCapture(pointer))stage.releasePointerCapture(pointer);
  }
  function end(event) {
    if(!drag||event.pointerId!==drag.pointerId)return;
    drag.tension=clamp((drag.startX-event.clientX)/(bounds.width*.22));
    drag.peak=Math.max(drag.peak,drag.tension);drag.valid=drag.valid||drag.startX-event.clientX>=4;
    const pull={...drag};cleanDrag();setMode('idle');commit(pull);
  }
  function cancel(event) {
    if(!drag||(event?.pointerId!==undefined&&event.pointerId!==drag.pointerId))return;
    invalidate();cleanDrag();setMode('idle');show(distance?'replant':'idle');
  }
  async function commit(pull) {
    if(!['idle','settling'].includes(mode))return;
    const token=invalidate();const result=assessPull(pull);
    if(result.kind==='cancel'){show(distance?'replant':'idle');return}
    setMode('settling');
    if(result.kind==='refusal') {
      reactions++;say('它把四只脚都钉住了。试着拉轻一点。');
      if(await sequence([['turn-1',60],['turn',70],['turn-2',70],['refusal',240],['return',65],['land',55],['replant',45]],token))setMode('idle');
      return;
    }
    distance=clamp(distance+result.gain);steps++;if(result.kind==='trust')gentleSteps++;
    updateProgress();motion={from:shownDistance,start:performance.now(),duration:reduced.matches?1:620};wake();
    say(result.kind==='trust'?'一松绳，它就懂了。默契 +1。':result.kind==='small'?'好吧，先挪一点点。':'它悄悄跟上了一小步。');
    const finished=await sequence([['return',65],['lift',55],['slide-1',65],['slide',55],['land',60],['replant',80]],token);
    if(!finished)return;
    if(distance>=1){setMode('complete');$('result').hidden=false;$('resultTitle').textContent=gentleSteps>2?'你们有点默契了。':'今天，是它带你散步。';$('resultDetail').textContent=`${steps} 次小步，${gentleSteps} 次默契松绳。明天还一起走。`;say('散步完成。可以切换柴犬留作纪念，或再走一圈。');}
    else setMode('idle');
  }
  function restart() {
    invalidate();cleanDrag();distance=0;shownDistance=0;motion=null;steps=0;gentleSteps=0;reactions=0;
    $('result').hidden=true;updateProgress();setMode('idle');show('idle');say(initialHint);
  }
  async function boot() {
    const token=playback;setMode('loading');
    const first=await preload(pathsFor().idle);
    if(token!==playback)return;
    if(!first){$('loading').textContent='插画还没准备好，点击重试';$('loading').onclick=boot;return;}
    await show('idle');setMode('idle');say(initialHint);
    // Load common response first, then remaining frames, bounded concurrency.
    const order=[...new Set(['soften','hover','takeup','pull','tight-1','brace','return','lift','slide','land','replant',...Object.keys(pathsFor())])];
    let cursor=0;const work=async()=>{while(cursor<order.length)await preload(pathsFor()[order[cursor++]]);};
    await Promise.all([work(),work(),work()]);
  }
  stage.addEventListener('pointerdown',start);stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',end);
  stage.addEventListener('pointercancel',cancel);stage.addEventListener('lostpointercapture',cancel);
  window.addEventListener('blur',()=>cancel());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});
  new ResizeObserver(()=>{bounds=stage.getBoundingClientRect();if(drag)cancel()}).observe(stage);
  window.addEventListener('scroll',()=>{bounds=stage.getBoundingClientRect()},{passive:true});
  control.addEventListener('click',()=>commit({tension:.42,peak:.55,gentleMs:420,valid:true}));
  control.addEventListener('keydown',event=>{if(event.repeat&&(event.key===' '||event.key==='Enter'))event.preventDefault()});
  $('restart').addEventListener('click',restart);
  updateProgress();boot();
})();
