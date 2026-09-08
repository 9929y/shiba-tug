/* Shared deterministic rules; no DOM, timers, network or random state. */
(function(root) {
  const clamp = (n, min=0, max=1) => Math.max(min, Math.min(max,n));
  function assessPull({tension=0, peak=tension, gentleMs=0, valid=true}) {
    if (!valid) return {gain:0,kind:'cancel'};
    if (peak > .86) return {gain:0,kind:'refusal'};
    const eased = peak - tension > .1 && peak >= .25;
    const comfortable = peak >= .22 && peak <= .7;
    if (comfortable) return {gain: .075 + Math.min(gentleMs,600)/600*.025 + (eased ? .025 : 0), kind:eased ? 'trust' : 'step'};
    return {gain:.025,kind:'small'};
  }
  // Whole cel stays intact: keep hand rigid, shorten only the leash span,
  // translate the rigid dog region. The rightmost paper margin fills the reveal.
  function mapSpan(x, length, span) {
    const edge=Math.min(40,span*.4), k=(span-edge)/(length-edge);
    const first=v=>{const t=v/edge;return v-(1-k)*edge*(t*t*t-.5*t*t*t*t);};
    if(x<edge)return first(x);
    if(x>length-edge)return span-first(length-x);
    return edge*(1+k)/2+(x-edge)*k;
  }
  const mapX = (x, distance) => x < 480 ? x : x < 900 ? 480+mapSpan(x-480,420,420-distance) : x-distance;
  const api={clamp,assessPull,mapX,mapSpan};
  if(typeof module !== 'undefined') module.exports=api;
  else root.ShibaRules=api;
})(typeof window !== 'undefined' ? window : this);
