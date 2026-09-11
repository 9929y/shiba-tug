(function(root) {
  // One reviewed coordinate system is shared by all three walk chapters.
  // Progress is spatial, rather than loading a new dog at each milestone.
  const names=['idle','soften','hover','takeup','pull','tight-1','brace','tight-2','crouch-1','reactionA','reactionB','turn-1','turn','turn-2','refusal','return','lift','slide-1','slide','land','replant','settled'];
  const additions=new Set(['soften','takeup','tight-1','tight-2','crouch-1','lift','land']);
  root.ShibaFrames=Object.fromEntries(names.map(name=>[name,`assets/cels/${additions.has(name)?'inbetweens':'frames'}/ch1-${name.replace('reactionA','reaction-a').replace('reactionB','reaction-b')}.webp`]));
})(window);
