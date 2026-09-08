(() => {
'use strict';
const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('scene'),ctx=canvas.getContext('2d');
const {clamp,pullLength,previewPull,samplePull}=window.ShibaRules;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const raw=new Map(),ready=new Map();
let breed='yellow',mode='loading',pose='idle',drag=null,distance=0,shown=0,motion=null,token=0,skinToken=0,raf=0,last=0,bounds=stage.getBoundingClientRect(),reaction=0,stepCount=0,endingAt=0;
let action=null,art={};
try{breed=localStorage.getItem('shiba-breed')==='black'?'black':'yellow'}catch{}
const paths=b=>b==='black'?window.ShibaBlackFrames:window.ShibaFrames;
const say=t=>$('message').textContent=t;
function setMode(m){mode=m;stage.dataset.state=m;$('loading').hidden=m!=='loading';$('restart').hidden=m!=='complete';}
// Normalize the baked paper's white point, then multiply the illustration onto
// one shared page background. Unlike chroma keying, this preserves cream fur.
function paperNormalized(img){
 const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
 const pixels=g.getImageData(0,0,c.width,c.height),d=pixels.data;let sum=[0,0,0],n=0;
 for(let y=4;y<30;y+=3)for(let x=c.width-45;x<c.width-5;x+=3){let i=(y*c.width+x)*4;for(let k=0;k<3;k++)sum[k]+=d[i+k];n++;}
 const white=sum.map(v=>v/n);
 for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]=Math.min(255,d[i+k]*255/white[k]);
 g.putImageData(pixels,0,0);return c;
}
async function load(src,normalize=true){
 if(raw.has(src))return raw.get(src);
 const task=new Promise(resolve=>{const img=new Image();img.onload=async()=>{try{await img.decode();const result=normalize?paperNormalized(img):img;ready.set(src,result);resolve(result)}catch{raw.delete(src);resolve(null)}};img.onerror=()=>{raw.delete(src);resolve(null)};img.src=src;});raw.set(src,task);return task;
}
function imageFor(p=pose){return ready.get(paths(breed)[p])||ready.get(paths(breed).idle)}
function uiBreed(){document.querySelectorAll('[data-breed]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.breed===breed)));document.querySelectorAll('[data-breed]').forEach(b=>b.classList.toggle('selected',b.dataset.breed===breed));stage.dataset.breed=breed;}
function updateProgress(){const predicted=drag?previewPull(drag).gain:0;$('route').style.setProperty('--progress',shown);$('route').style.setProperty('--preview',clamp(distance+predicted));$('walkProgress').value=Math.round(shown*100);stage.dataset.progress=distance.toFixed(4);stage.dataset.preview=predicted.toFixed(4);stage.dataset.position=shown.toFixed(4);}
function poseFor(t){const names=['idle','soften','hover','takeup','pull','tight-1','brace','tight-2','crouch-1','turn-1','turn','turn-2','refusal'];return names[Math.min(12,Math.floor(t*13))]}
function render(){
 const img=imageFor();if(!img)return;
 const mobile=bounds.width<=620,cw=mobile?1024:1536,ch=mobile?640:512,y=mobile?64:0;
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
 ctx.clearRect(0,0,cw,ch);
 if(mode==='home'||mode==='complete'){renderHome();return;}
 const t=drag?.tension||0,walk=shown*(mobile?70:200),handShift=t*(mobile?100:130),dogShift=walk+t*8;
 const start=(mobile?300:480)-handShift, dogStart=(mobile?420:900)-dogShift;
 const draw=(sx,sw,dx,dw)=>ctx.drawImage(img,sx/1536*img.width,0,sw/1536*img.width,img.height,dx,y,dw,512);
 for(let sx=0;sx<420;sx+=20)draw(480+sx,20,start+sx/420*(dogStart-start),(dogStart-start)/21+.4);
 draw(mobile?180:0,mobile?300:480,-handShift,mobile?300:480);
 const special=action?.sprite;
 if(special!==undefined&&art[breed])drawSprite(special,dogStart+125,y+442,400);
 else draw(900,636,dogStart,636);
 if(distance>.72&&art.house){ctx.save();ctx.globalAlpha=clamp((shown-.72)/.25)*.35;ctx.drawImage(art.house,20,Math.max(0,y-80),mobile?220:280,mobile?147:187);ctx.restore();}
 $('ropeHit').parentElement.setAttribute('viewBox',`0 0 ${cw} ${ch}`);
 $('ropeHit').style.strokeWidth=String(Math.max(90,44*cw/bounds.width));
 $('ropeHit').setAttribute('d',`M ${(mobile?135:315)-handShift} ${240+y} Q ${(start+dogStart)/2} ${y+430-t*170} ${dogStart+135} ${y+300}`);
 stage.dataset.pose=pose;stage.dataset.tension=t.toFixed(4);updateProgress();
}
function drawSprite(index,x,baseline,width){const img=art[breed];if(!img)return;const sw=img.naturalWidth/4,sh=img.naturalHeight/2,h=width*sh/sw;ctx.drawImage(img,index%4*sw,Math.floor(index/4)*sh,sw,sh,x-width*.5,baseline-h*.9,width,h);}
function renderHome(){
 const w=canvas.width,h=canvas.height,p=mode==='complete'?1:clamp((performance.now()-endingAt)/(reduced.matches?500:5200));
 const houseW=Math.min(w*.72,760),houseH=houseW*2/3,hx=w*.5-houseW*.5,hy=h*.82-houseH;
 if(art.house)ctx.drawImage(art.house,hx,hy,houseW,houseH);
 const walk=clamp(p/.7),dogX=w*.83+(w*.49-w*.83)*walk,base=h*.88-h*.19*walk,size=(w<=1024?240:300)*(1-.48*walk);
 // Four distinct contact poses accompany translation into the doorway.
 let frame=p<.72?4+Math.floor(p*34)%4:(p<.85?2:3);
 drawSprite(frame,dogX,base,size);
 stage.dataset.endingProgress=p.toFixed(3);
}
function wake(){if(!raf)raf=requestAnimationFrame(tick)}
function tick(now){
 raf=0;let dt=last?Math.min(50,now-last):0;last=now;
 if(drag){if(drag.keyboard)samplePull(drag,drag.tension+drag.direction*dt/1000*.65,now);else samplePull(drag,drag.tension,now);pose=poseFor(drag.tension);updateProgress();}
 if(motion){const t=clamp((now-motion.start)/motion.duration);shown=motion.from+(distance-motion.from)*t;if(t===1)motion=null;}
 if(action){const elapsed=now-action.start;let cursor=0;for(const item of action.frames){cursor+=item.ms;if(elapsed<cursor){pose=item.pose||'replant';action.sprite=item.sprite;break;}}
 if(elapsed>=cursor){action=null;pose='replant';if(distance>=1&&!motion)home();else if(!drag)setMode('idle');}}
 if(!action&&!motion&&!drag&&distance>=1&&mode!=='home'&&mode!=='complete')home();
 if(mode==='home'&&now-endingAt>=(reduced.matches?500:5200)){setMode('complete');say('到家了。柴犬回头向你摇尾巴。');}
 render();if(drag||motion||action||mode==='home')wake();else last=0;
}
function home(){endingAt=performance.now();setMode('home');$('route').hidden=true;stage.setAttribute('aria-label','柴犬正在跟你一起回家');say('它主动跟上你，一起回家。');wake();}
function newDrag(id,x){token++;action=null;drag={pointerId:id,startX:x,tension:0,peak:0,blocked:false,recoverAt:null,sampleTime:performance.now(),valid:false};setMode('dragging');stage.classList.add('is-dragging');$('guide').hidden=true;try{sessionStorage.setItem('shiba-guided','1')}catch{};render();wake();}
function start(e){if(!['idle','settling'].includes(mode)||drag||e.button!==0||e.isPrimary===false||e.target.id!=='ropeHit')return;e.preventDefault();bounds=stage.getBoundingClientRect();newDrag(e.pointerId,e.clientX);stage.setPointerCapture(e.pointerId);}
function move(e){if(!drag||drag.keyboard||e.pointerId!==drag.pointerId)return;samplePull(drag,(drag.startX-e.clientX)/pullLength(bounds.width),performance.now());pose=poseFor(drag.tension);render();}
function clean(){const id=drag?.pointerId;drag=null;stage.classList.remove('is-dragging');if(id!==undefined&&id!=='keyboard'&&stage.hasPointerCapture(id))stage.releasePointerCapture(id);}
function end(e){if(!drag||e.pointerId!==drag.pointerId)return;samplePull(drag,(drag.startX-e.clientX)/pullLength(bounds.width),performance.now());finish();}
function finish(){const result=previewPull(drag);clean();commit(result);}
function cancel(e){if(!drag||(e?.pointerId!==undefined&&e.pointerId!==drag.pointerId))return;clean();pose='idle';setMode('idle');render();}
function commit(result){
 if(!result.gain){if(result.kind==='refusal'){reaction++;action={start:performance.now(),frames:[{pose:'turn',ms:100},{pose:'refusal',sprite:reaction%2,ms:650},{pose:'return',ms:120}],sprite:undefined};setMode('settling');say(breed==='black'?'它得意地笑了。放松一点，再试试。':'它委屈地撑住了。轻一点试试。');wake()}else{setMode('idle');pose='idle';render()}return;}
 distance=clamp(distance+result.gain);stepCount++;motion={from:shown,start:performance.now(),duration:reduced.matches?60:640};
 action={start:performance.now(),frames:reduced.matches?[{pose:'replant',ms:60}]:[{pose:'lift',ms:100},{pose:'slide-1',ms:100},{pose:'slide',ms:100},{pose:'land',ms:100},{pose:'replant',ms:100},{pose:'replant',sprite:result.kind==='trust'?3:(stepCount%3===0?2:undefined),ms:180}]};
 setMode('settling');say(result.kind==='trust'?'放松绳子，它开心地跟上了。':'它跟上了一步。');wake();
}
async function switchBreed(next){
 if(next===breed||mode==='home')return;cancel();const request=++skinToken;$('breedStatus').textContent='…';
 const all=await Promise.all(Object.values(paths(next)).map(src=>load(src)));
 if(request!==skinToken)return;if(all.some(x=>!x)){$('breedStatus').textContent='加载失败，请重试';return;}
 breed=next;action=null;pose='idle';if(mode!=='complete')setMode('idle');uiBreed();$('breedStatus').textContent='';try{localStorage.setItem('shiba-breed',breed)}catch{}render();
}
function restart(){token++;clean();distance=shown=0;motion=action=null;pose='idle';stepCount=reaction=0;$('route').hidden=false;setMode('idle');render();}
async function boot(){setMode('loading');const names=Object.values(paths(breed));let cursor=0,failed=false;const worker=async()=>{while(cursor<names.length)if(!await load(names[cursor++]))failed=true;};await Promise.all([worker(),worker(),worker()]);if(failed){$('loading').textContent='点击重试';return}setMode('idle');uiBreed();render();try{$('guide').hidden=!!sessionStorage.getItem('shiba-guided')}catch{};setTimeout(()=>$('guide').hidden=true,4500);}
stage.addEventListener('pointerdown',start);stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',cancel);stage.addEventListener('lostpointercapture',cancel);
stage.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key)||!['idle','settling','dragging'].includes(mode))return;e.preventDefault();if(!drag)newDrag('keyboard',0);if(drag.pointerId!=='keyboard')return;drag.keyboard=true;drag.direction=e.key==='ArrowLeft'?1:-1;});
stage.addEventListener('keyup',e=>{if(drag?.keyboard&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();finish();}});
stage.addEventListener('blur',()=>{if(drag?.keyboard)cancel()});window.addEventListener('blur',()=>cancel());document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});new ResizeObserver(()=>{cancel();bounds=stage.getBoundingClientRect();render()}).observe(stage);
$('restart').addEventListener('click',restart);$('loading').addEventListener('click',boot);document.querySelectorAll('[data-breed]').forEach(b=>b.addEventListener('click',()=>switchBreed(b.dataset.breed)));
boot();
})();
