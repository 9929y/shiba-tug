(() => {
'use strict';
const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('scene'),ctx=canvas.getContext('2d');
const {clamp,pullLength,previewPull,samplePull}=window.ShibaRules;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const raw=new Map(),ready=new Map();
let breed='yellow',mode='loading',pose='idle',drag=null,distance=0,shown=0,motion=null,token=0,skinToken=0,raf=0,last=0,bounds=stage.getBoundingClientRect(),reaction=0,stepCount=0,endingAt=0;
let action=null,restingSprite=null,art={};const spriteBounds=new WeakMap(),ropeAnchors=new WeakMap();
try{breed=localStorage.getItem('shiba-breed')==='black'?'black':'yellow'}catch{}
const paths=b=>b==='black'?window.ShibaBlackFrames:window.ShibaFrames;
const say=t=>$('message').textContent=t;
function setMode(m){mode=m;$('breedHeader').hidden=m==='home'||m==='complete';document.querySelectorAll('[data-breed]').forEach(b=>b.disabled=m==='home'||m==='loading');stage.dataset.state=m;$('loading').hidden=m!=='loading';$('restart').hidden=m!=='complete';}
// Normalize the baked paper's white point, then multiply the illustration onto
// one shared page background. Unlike chroma keying, this preserves cream fur.
function paperNormalized(img){
 const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
 const pixels=g.getImageData(0,0,c.width,c.height),d=pixels.data;let sum=[0,0,0],n=0;
 for(let y=4;y<30;y+=3)for(let x=c.width-45;x<c.width-5;x+=3){let i=(y*c.width+x)*4;for(let k=0;k<3;k++)sum[k]+=d[i+k];n++;}
 const white=sum.map(v=>v/n);
 for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]=Math.min(255,d[i+k]*[252,246,234][k]/white[k]);
 g.putImageData(pixels,0,0);const scan=x=>{let total=0,n=0;const col=Math.round(c.width*x/1536);for(let y=0;y<c.height;y++){const i=(y*c.width+col)*4;if(d[i]>80&&d[i]>d[i+1]*1.5&&d[i+1]<110){total+=y;n++;}}return n?total/n/c.height*512:320;};const edgeY=scan(480);ropeAnchors.set(c,{y:edgeY,slope:(edgeY-scan(460))/20});return c;
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
 const mobile=bounds.width<=620,cw=mobile?1024:1536,ch=mobile?((mode==='home'||mode==='complete')?1024:640):((mode==='home'||mode==='complete')?768:512),y=mobile?64:0;
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
 ctx.clearRect(0,0,cw,ch);
 if(mode==='home'||mode==='complete'){updateProgress();renderHome();return;}
 const t=drag?.tension||0,walk=shown*(mobile?70:200),handShift=t*pullLength(bounds.width)*cw/bounds.width,dogShift=walk+t*8;
 const start=(mobile?300:480)-handShift, dogStart=(mobile?420:900)-dogShift;
 let ropePath;const draw=(sx,sw,dx,dw)=>ctx.drawImage(img,sx/1536*img.width,0,sw/1536*img.width,img.height,dx,y,dw,512);
 const special=drag?(drag.blocked?reaction%2:undefined):(action?.sprite??restingSprite??undefined);
 const walking=action?.walk;
 const source=walking!==undefined?art.walk:art[breed],spriteIndex=walking!==undefined?walking+(breed==='black'?4:0):special;
 if(spriteIndex===undefined)for(let sx=0;sx<420;sx+=20)draw(480+sx,20,start+sx/420*(dogStart-start),(dogStart-start)/21+.4);
 if(spriteIndex!==undefined)ctx.drawImage(img,(mobile?180:0)/1536*img.width,0,(mobile?300:480)/1536*img.width,img.height*400/512,-handShift,y,mobile?300:480,400);else draw(mobile?180:0,mobile?300:480,-handShift,mobile?300:480);
 if(spriteIndex!==undefined&&source){
  const info=spritePlacement(source,spriteIndex,dogStart+310,y+442,365);
  ropePath=`M ${start} ${y+(ropeAnchors.get(img)?.y||320)} C ${start+70} ${y+(ropeAnchors.get(img)?.y||320)+(ropeAnchors.get(img)?.slope||.4)*70} ${info.cx-120} ${info.cy+(drag?.blocked?10:120)} ${info.cx} ${info.cy}`;
  const anchor=ropeAnchors.get(img)||{y:320,slope:.4},anchorY=y+anchor.y;
  ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(start,anchorY);ctx.bezierCurveTo(start+70,anchorY+anchor.slope*70,info.cx-120,info.cy+(drag?.blocked?10:120),info.cx,info.cy);
  ctx.strokeStyle='#533e30';ctx.lineWidth=16;ctx.stroke();ctx.strokeStyle='#a44935';ctx.lineWidth=12;ctx.stroke();ctx.restore();
  ctx.save();ctx.fillStyle='rgba(111,88,53,.08)';ctx.beginPath();ctx.ellipse(dogStart+310,y+443,130,7,0,0,Math.PI*2);ctx.fill();ctx.restore();drawSprite(spriteIndex,dogStart+310,y+442,365,source);
 }else draw(900,636,dogStart,636);
 if(distance>.72&&art.house){ctx.save();ctx.globalAlpha=clamp((shown-.72)/.25)*.35;ctx.drawImage(art.house,20,Math.max(0,y-80),mobile?220:280,mobile?147:187);ctx.restore();}
 $('ropeHit').parentElement.setAttribute('viewBox',`0 0 ${cw} ${ch}`);
 $('ropeHit').style.strokeWidth=String(Math.max(90,44*cw/bounds.width));
 // Keep the hand and baked front segment grabbable in every pose, including
 // personality sprites whose generated rope begins only at source x=480.
 const gripX=(mobile?135:315)-handShift;
 $('gripHit').style.strokeWidth=String(Math.max(140,48*cw/bounds.width));
 $('gripHit').setAttribute('d',`M ${gripX-40} ${y+235} Q ${gripX+55} ${y+250} ${start} ${y+(ropeAnchors.get(img)?.y||320)}`);
 $('ropeHit').setAttribute('d',ropePath||`M ${(mobile?135:315)-handShift} ${240+y} Q ${(start+dogStart)/2} ${y+540-t*280} ${dogStart+135} ${y+300}`);
 stage.dataset.expression=special===undefined?'neutral':String(special);stage.dataset.feeling=drag?.blocked?'blocked':(t>=.25&&t<=.7?'comfortable':'loose');stage.dataset.pose=pose;stage.dataset.tension=t.toFixed(4);updateProgress();
}
function measureSprites(img){
 const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);const data=g.getImageData(0,0,c.width,c.height).data,sw=c.width/4,sh=c.height/2,boxes=[];
 for(let n=0;n<8;n++){let x0=sw,y0=sh,x1=0,y1=0;const ox=n%4*sw,oy=Math.floor(n/4)*sh,rows=new Uint32Array(sh),red=[];
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=((oy+y)*c.width+ox+x)*4;if(data[i+3]<128)continue;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
 // The collar is the widest saturated-red band; mouths and tan fur must not
 // shift its anchor upward. No decorative ring is painted over the dog.
 if(data[i]>90&&data[i+1]<105&&data[i+2]<100&&data[i]>data[i+1]*1.8&&data[i]>data[i+2]*1.6){rows[y]++;red.push([x,y]);}}
 let peak=0;for(let y=1;y<sh;y++)if(rows[y]>rows[peak])peak=y;
 const band=red.filter(([,y])=>Math.abs(y-peak)<=8),count=band.length;
 const cx=count?band.reduce((sum,[x])=>sum+x,0)/count-x0:(x1-x0)*.3,cy=count?band.reduce((sum,[,y])=>sum+y,0)/count-y0:(y1-y0)*.55;
 boxes.push({sx:ox+x0,sy:oy+y0,sw:x1-x0+1,sh:y1-y0+1,cx,cy});}

 spriteBounds.set(img,boxes);
}
function spritePlacement(img,index,x,baseline,height){const b=spriteBounds.get(img)[index],scale=height/b.sh,width=b.sw*scale;return {...b,dx:x-width*.5,dy:baseline-height,width,height,cx:x-width*.5+b.cx*scale,cy:baseline-height+b.cy*scale};}
function drawSprite(index,x,baseline,height,source=art[breed]){if(!source)return;const b=spritePlacement(source,index,x,baseline,height);ctx.drawImage(source,b.sx,b.sy,b.sw,b.sh,b.dx,b.dy,b.width,b.height);}
function renderHome(){
 const w=canvas.width,h=canvas.height,p=mode==='complete'?1:clamp((performance.now()-endingAt)/(reduced.matches?500:5200));
 const travel=clamp(p/.7),ease=travel*travel*(3-2*travel);
 const houseW=w*(.82+.5*ease),houseH=houseW*2/3,hx=w*.5-houseW*.515,hy=h*.82-houseH*.705;
 if(art.house)ctx.drawImage(art.house,hx,hy,houseW,houseH);
 const endX=hx+houseW*.515,endBase=hy+houseH*.705;
 const dogX=w*.85+(endX-w*.85)*ease,base=h*.93+(endBase-h*.93)*ease,size=(w<=1024?300:360)*(1-ease)+houseH*.19*ease;
 const tail=Math.floor((p-.7)*24)%2,frame=travel<1?Math.floor(p*30)%2:2+Math.max(0,tail);
 if(p<.68){ctx.save();ctx.globalAlpha=1-clamp((p-.45)/.23);ctx.strokeStyle='#a74432';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,h*.56);ctx.quadraticCurveTo(dogX*.5,base+40,dogX-size*.1,base-size*.55);ctx.stroke();ctx.restore();}
 drawSprite(frame+(breed==='black'?4:0),dogX,base,size,art.home);
 stage.dataset.endingProgress=p.toFixed(3);
 stage.dataset.pose=travel<1?'home-walk-'+frame:'home-wag-'+frame;
}

function wake(){if(!raf)raf=requestAnimationFrame(tick)}
function tick(now){
 raf=0;let dt=last?Math.min(50,now-last):0;last=now;
 if(drag){if(drag.keyboard)samplePull(drag,drag.tension+drag.direction*dt/1000*.65,now);else samplePull(drag,drag.tension,now);pose=poseFor(drag.tension);updateProgress();}
 if(motion){const t=clamp((now-motion.start)/motion.duration);shown=motion.from+(distance-motion.from)*t;if(t===1)motion=null;}
 if(action){const elapsed=now-action.start;let cursor=0;for(const item of action.frames){cursor+=item.ms;if(elapsed<cursor){pose=item.pose||'replant';action.sprite=item.sprite;action.walk=item.walk;break;}}
 if(elapsed>=cursor){restingSprite=action.rest??null;action=null;pose='idle';if(distance>=1&&!motion)home();else if(!drag)setMode('idle');}}
 if(!action&&!motion&&!drag&&distance>=1&&mode!=='home'&&mode!=='complete')home();
 if(mode==='home'&&now-endingAt>=(reduced.matches?500:5200)){setMode('complete');stage.setAttribute('aria-label','Home at last. Your Shiba looks back and wags its tail.');say('Home at last. Your Shiba looks back and wags its tail.');}
 render();if(drag||motion||action||mode==='home')wake();else last=0;
}
function home(){endingAt=performance.now();setMode('home');$('route').hidden=true;stage.setAttribute('aria-label','Your Shiba is walking home with you');say('Your Shiba follows you home.');wake();}
function newDrag(id,x){token++;action=null;restingSprite=null;drag={pointerId:id,startX:x,tension:0,peak:0,blocked:false,recoverAt:null,sampleTime:performance.now(),valid:false};setMode('dragging');stage.classList.add('is-dragging');$('guide').hidden=true;try{sessionStorage.setItem('shiba-guided','1')}catch{};render();wake();}
function start(e){if(!['idle','settling'].includes(mode)||drag||e.button!==0||e.isPrimary===false||!['ropeHit','gripHit'].includes(e.target.id))return;e.preventDefault();bounds=stage.getBoundingClientRect();newDrag(e.pointerId,e.clientX);try{stage.setPointerCapture(e.pointerId)}catch{};}
function move(e){if(!drag||drag.keyboard||e.pointerId!==drag.pointerId)return;samplePull(drag,(drag.startX-e.clientX)/pullLength(bounds.width),performance.now());pose=poseFor(drag.tension);render();}
function clean(){const id=drag?.pointerId;drag=null;stage.classList.remove('is-dragging');if(id!==undefined&&id!=='keyboard'&&stage.hasPointerCapture(id))stage.releasePointerCapture(id);}
function end(e){if(!drag||e.pointerId!==drag.pointerId)return;samplePull(drag,(drag.startX-e.clientX)/pullLength(bounds.width),performance.now());finish();}
function finish(){const result=previewPull(drag);clean();commit(result);}
function cancel(e){if(!drag||(e?.pointerId!==undefined&&e.pointerId!==drag.pointerId))return;clean();pose='idle';setMode('idle');render();}
function commit(result){
 if(!result.gain){if(result.kind==='refusal'){reaction++;action={start:performance.now(),rest:reaction%2,frames:[{pose:'turn',ms:100},{pose:'refusal',sprite:reaction%2,ms:650},{pose:'return',ms:120}],sprite:undefined};setMode('settling');say(breed==='black'?'That smug little grin! Ease up and try again.':'Your Shiba digs in. Try a gentler pull.');wake()}else{setMode('idle');pose='idle';render()}return;}
 distance=clamp(distance+result.gain);stepCount++;motion={from:shown,start:performance.now(),duration:reduced.matches?60:640};
 action={start:performance.now(),rest:result.kind==='trust'?3:2+(stepCount%2),frames:reduced.matches?[{pose:'replant',ms:60}]:[{pose:'lift',walk:0,ms:130},{pose:'slide-1',walk:1,ms:130},{pose:'slide',walk:2,ms:130},{pose:'land',walk:3,ms:130},{pose:'replant',sprite:result.kind==='trust'?3:2+(stepCount%2),ms:280}]};
 setMode('settling');say(result.kind==='trust'?'You relaxed the leash. Your Shiba happily follows.':'Your Shiba takes a step.');wake();
}
async function switchBreed(next){
 if(next===breed||mode==='home'||mode==='loading')return;cancel();const request=++skinToken;$('breedStatus').textContent='…';
 const all=await Promise.all(Object.values(paths(next)).map(src=>load(src)));
 if(request!==skinToken)return;if(all.some(x=>!x)){$('breedStatus').textContent='Could not load your Shiba. Try again.';return;}
 breed=next;action=null;restingSprite=null;pose='idle';if(mode!=='complete')setMode('idle');uiBreed();$('breedStatus').textContent='';try{localStorage.setItem('shiba-breed',breed)}catch{}render();
}
function restart(){say('Ready for another walk.');token++;clean();distance=shown=0;motion=action=null;restingSprite=null;pose='idle';stepCount=reaction=0;$('route').hidden=false;stage.setAttribute('aria-label','Leash: hold Left Arrow to pull, Right Arrow to relax, release to take a step');setMode('idle');render();}
async function boot(){setMode('loading');const items=await Promise.all(['yellow','black','home','house','walk'].map(async name=>[name,await load('assets/personality/'+name+'.webp',name==='house')]));art=Object.fromEntries(items);for(const [name,img] of items)if(img&&name!=='house')measureSprites(img);if(items.some(([,img])=>!img)){$('loading').textContent='Tap to retry';return;}const names=Object.values(paths(breed));let cursor=0,failed=false;const worker=async()=>{while(cursor<names.length)if(!await load(names[cursor++]))failed=true;};await Promise.all([worker(),worker(),worker()]);if(failed){$('loading').textContent='Tap to retry';return}setMode('idle');uiBreed();render();try{$('guide').hidden=!!sessionStorage.getItem('shiba-guided')}catch{};setTimeout(()=>$('guide').hidden=true,4500);}
stage.addEventListener('pointerdown',start);stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',cancel);stage.addEventListener('lostpointercapture',cancel);
stage.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key)||!['idle','settling','dragging'].includes(mode))return;e.preventDefault();if(!drag)newDrag('keyboard',0);if(drag.pointerId!=='keyboard')return;drag.keyboard=true;drag.keys??=new Set();drag.keys.add(e.key);drag.direction=e.key==='ArrowLeft'?1:-1;});
stage.addEventListener('keyup',e=>{if(drag?.keyboard&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();drag.keys.delete(e.key);if(!drag.keys.size)finish();else drag.direction=drag.keys.has('ArrowRight')?-1:1;}});
stage.addEventListener('blur',()=>{if(drag?.keyboard)cancel()});window.addEventListener('blur',()=>cancel());document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});new ResizeObserver(()=>{cancel();bounds=stage.getBoundingClientRect();render()}).observe(stage);
$('restart').addEventListener('click',restart);$('loading').addEventListener('click',boot);document.querySelectorAll('[data-breed]').forEach(b=>b.addEventListener('click',()=>switchBreed(b.dataset.breed)));
boot();
})();
