(function(root){
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const pullLength=width=>clamp(width*.24,90,220);
  function previewPull({tension=0,peak=tension,blocked=false,valid=true}={}){
    const t=clamp(tension);
    if(!valid||t<.08)return {gain:0,kind:'small'};
    if(blocked||t>=.9)return {gain:0,kind:'refusal'};
    let gain=t<.25?.02+(t-.08)/.17*.02:t<=.7?.04+(t-.25)/.45*.08:.12*(.9-t)/.2;
    const eased=peak-t>=.1&&t>=.25&&t<=.7;
    if(eased)gain+=.02;
    return {gain:clamp(gain,0,.14),kind:eased?'trust':'step'};
  }
  function samplePull(p,t,now){
    t=clamp(t);const dt=Math.max(1,now-p.sampleTime),speed=(t-p.tension)/dt*1000;
    p.peak=Math.max(p.peak,t);
    if(t>=.9||(speed>3&&t>.7)){p.blocked=true;p.recoverAt=null;}
    if(p.blocked&&t>=.25&&t<=.7){p.recoverAt??=now;if(now-p.recoverAt>=150)p.blocked=false;}
    else if(t<.25||t>.7)p.recoverAt=null;
    p.tension=t;p.sampleTime=now;p.valid=p.valid||t>=.08;return p;
  }
  const api={clamp,pullLength,previewPull,assessPull:previewPull,samplePull};
  if(typeof module!=='undefined')module.exports=api;else root.ShibaRules=api;
})(typeof window!=='undefined'?window:this);
