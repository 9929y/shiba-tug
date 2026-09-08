(() => {
  const stage = document.querySelector('#stage');
  const currentCel = document.querySelector('#celCurrent');
  const previousCel = document.querySelector('#celPrevious');
  const ropeHit = document.querySelector('#ropeHit');
  const leashControl = document.querySelector('#leashControl');
  const fluidProgress = document.querySelector('#fluidProgress');
  const grabCue = document.querySelector('#grabCue');
  const PAUSE = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DRAG_DISTANCE = 250;

  const NAMES = ['idle', 'hover', 'pull', 'brace', 'reactionA', 'reactionB', 'turn', 'refusal', 'return', 'slide', 'replant', 'settled'];
  const pathFor = (chapter, name) => {
    const endX = [1060, 1015, 970][chapter];
    const isLoose = ['idle', 'hover', 'settled', 'replant'].includes(name);
    const startY = 242;
    const endY = name === 'refusal' ? 338 : 298;
    const sag = isLoose ? 105 : 22;
    return `M 347 ${startY} C 575 ${startY + sag}, ${endX - 235} ${endY + sag}, ${endX} ${endY}`;
  };
  const sourceFor = (chapter, name) => {
    const filePrefix = `ch${chapter + 1}`;
    const fileName = name.replace('reactionA', 'reaction-a').replace('reactionB', 'reaction-b');
    return `assets/cels/frames/${filePrefix}-${fileName}.webp`;
  };
  const CELS = [0, 1, 2].map((chapter) => Object.fromEntries(NAMES.map((name) => [name, {
    id: `ch${chapter + 1}-${name}`,
    src: sourceFor(chapter, name),
    hitPath: pathFor(chapter, name)
  }])));

  let state = 'idle';
  let chapter = 0;
  let pulls = 0;
  let currentId = '';
  let lockedProgress = .035;
  let drag = null;
  let queuedDrag = null;
  let dragRaf = 0;
  const preloadCache = new Map();

  function setState(next) {
    state = next;
    stage.dataset.state = next;
    stage.dataset.chapter = String(chapter + 1);
    stage.classList.toggle('is-locked', !['idle', 'dragging'].includes(next));
    leashControl.disabled = next !== 'idle';
  }

  function preload(src) {
    if (preloadCache.has(src)) return preloadCache.get(src);
    const task = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
    });
    preloadCache.set(src, task);
    return task;
  }

  function preloadNames(names) {
    names.forEach((name) => preload(CELS[chapter][name].src));
  }

  function preloadChapter(index) {
    NAMES.forEach((name) => preload(CELS[index][name].src));
  }

  function setProgress(value) {
    fluidProgress.style.setProperty('--fill', String(value));
  }

  async function pullProgress() {
    const peak = Math.min(.96, lockedProgress + .145);
    fluidProgress.style.setProperty('--pull-fill', String(peak));
    fluidProgress.classList.add('is-pulling');
    await PAUSE(REDUCED ? 20 : 145);
    fluidProgress.classList.remove('is-pulling');
  }

  function lockProgress() {
    lockedProgress = chapter === 2 ? 1 : .035 + ((chapter + 1) / 3) * .95;
    setProgress(lockedProgress);
  }

  function showNow(frame) {
    ropeHit.setAttribute('d', frame.hitPath);
    if (currentId !== frame.id) {
      currentCel.src = frame.src;
      currentId = frame.id;
    }
  }

  async function showFrame(frame, hold = 105, fade = false) {
    const ready = await preload(frame.src);
    if (!ready) return false;
    if (currentId !== frame.id) {
      if (fade && currentCel.getAttribute('src')) {
        previousCel.src = currentCel.src;
        currentCel.src = frame.src;
        currentId = frame.id;
        ropeHit.setAttribute('d', frame.hitPath);
        stage.classList.add('is-resetting');
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        await PAUSE(REDUCED ? 20 : 340);
        stage.classList.remove('is-resetting');
      } else {
        showNow(frame);
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
      }
    }
    await PAUSE(REDUCED ? 28 : hold);
    return true;
  }

  async function play(names, hold = 105) {
    preloadNames(names);
    for (const name of names) {
      if (!(await showFrame(CELS[chapter][name], hold))) return false;
    }
    return true;
  }

  function updateCuePosition(clientX, clientY) {
    const bounds = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width, clientX - bounds.left));
    const y = Math.max(0, Math.min(bounds.height, clientY - bounds.top));
    grabCue.style.setProperty('--cue-x', `${x}px`);
    grabCue.style.setProperty('--cue-y', `${y}px`);
  }

  function setHover(event) {
    if (state !== 'idle') return;
    updateCuePosition(event.clientX, event.clientY);
    stage.classList.add('is-hovering');
    showNow(CELS[chapter].hover);
  }

  function clearHover() {
    if (state !== 'idle') return;
    stage.classList.remove('is-hovering');
    showNow(CELS[chapter].idle);
  }

  function setDragPreview(amount) {
    if (!drag || state !== 'dragging') return;
    const frame = amount < .18 ? 'hover'
      : amount < .42 ? 'pull'
        : pulls < 2 || amount < .68 ? 'brace'
          : pulls === 3 ? 'turn' : drag.reaction;
    showNow(CELS[chapter][frame]);
  }

  function applyDrag(clientX, clientY) {
    if (!drag || state !== 'dragging') return;
    const distance = Math.max(0, drag.startX - clientX);
    const amount = Math.min(1, distance / DRAG_DISTANCE);
    drag.amount = amount;
    updateCuePosition(clientX, clientY);
    stage.style.setProperty('--grab-tightness', String(amount));
    stage.style.setProperty('--scene-sway', `${Math.min(10, distance * .055)}px`);
    grabCue.style.setProperty('--cue-shift', `${-Math.min(18, distance * .08)}px`);
    fluidProgress.style.setProperty('--drag-fill', String(Math.min(.98, lockedProgress + amount * .18)));
    fluidProgress.style.setProperty('--drag-energy', String(amount));
    setDragPreview(amount);
  }

  function queueDrag(clientX, clientY) {
    queuedDrag = [clientX, clientY];
    if (dragRaf) return;
    dragRaf = requestAnimationFrame(() => {
      dragRaf = 0;
      if (queuedDrag) applyDrag(...queuedDrag);
    });
  }

  function stopDragging() {
    if (dragRaf) cancelAnimationFrame(dragRaf);
    dragRaf = 0;
    queuedDrag = null;
    stage.classList.remove('is-dragging');
    stage.style.removeProperty('--grab-tightness');
    stage.style.removeProperty('--scene-sway');
    grabCue.style.removeProperty('--cue-shift');
    fluidProgress.classList.remove('is-dragging');
    fluidProgress.style.removeProperty('--drag-fill');
    fluidProgress.style.removeProperty('--drag-energy');
  }

  async function resetAfterComplete() {
    await PAUSE(REDUCED ? 160 : 1500);
    fluidProgress.classList.remove('is-complete');
    chapter = 0;
    pulls = 0;
    lockedProgress = .035;
    setProgress(lockedProgress);
    await showFrame(CELS[0].idle, 120, true);
    setState('idle');
    preloadChapter(0);
  }

  async function commitPull({ intensity = 0, reaction = null } = {}) {
    if (state !== 'idle') return;
    pulls += 1;
    setState('pull');
    const progressMotion = pullProgress();

    if (pulls === 1) {
      if (intensity >= .42) await showFrame(CELS[chapter].brace, 155);
      else await play(['hover', 'pull', 'brace'], 88);
    } else if (pulls === 2) {
      setState('brace');
      if (intensity >= .42) await showFrame(CELS[chapter].brace, 155);
      else await play(['pull', 'brace'], 115);
    } else if (pulls === 3) {
      setState('reaction');
      const reactionFrame = reaction || (Math.random() < .5 ? 'reactionA' : 'reactionB');
      if (intensity >= .68) await showFrame(CELS[chapter][reactionFrame], 215);
      else await play(['brace', reactionFrame], 155);
    } else {
      setState('refusal');
      if (intensity >= .68) await showFrame(CELS[chapter].turn, 155);
      else await play(['brace', 'turn'], 115);
      await showFrame(CELS[chapter].refusal, 470);
      setState('slide');
      await play(['return', 'slide', 'replant', 'settled'], 125);
      lockProgress();
      pulls = 0;

      if (chapter === 2) {
        setState('complete');
        fluidProgress.classList.add('is-complete');
        await progressMotion;
        resetAfterComplete();
        return;
      }

      chapter += 1;
      preloadChapter(chapter);
      await showFrame(CELS[chapter].idle, 130, true);
    }

    await progressMotion;
    setState('idle');
    preloadChapter(chapter);
  }

  function beginPointer(event) {
    if (state !== 'idle') return;
    stage.classList.remove('is-hovering');
    drag = { startX: event.clientX, amount: 0, pointerId: event.pointerId, reaction: Math.random() < .5 ? 'reactionA' : 'reactionB' };
    setState('dragging');
    stage.classList.add('is-dragging');
    fluidProgress.classList.add('is-dragging');
    updateCuePosition(event.clientX, event.clientY);
    ropeHit.setPointerCapture?.(event.pointerId);
    applyDrag(event.clientX, event.clientY);
  }

  function movePointer(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    queueDrag(event.clientX, event.clientY);
  }

  function endPointer(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    ropeHit.releasePointerCapture?.(event.pointerId);
    applyDrag(event.clientX, event.clientY);
    const didCommit = drag.amount >= .18;
    const dragAmount = drag.amount;
    const dragReaction = drag.reaction;
    drag = null;
    stopDragging();
    if (didCommit) {
      setState('idle');
      commitPull({ intensity: dragAmount, reaction: dragReaction });
    } else {
      setState('idle');
      showNow(CELS[chapter].idle);
    }
  }

  function cancelPointer(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    drag = null;
    stopDragging();
    setState('idle');
    showNow(CELS[chapter].idle);
  }

  ropeHit.addEventListener('pointerdown', beginPointer);
  ropeHit.addEventListener('pointermove', movePointer);
  ropeHit.addEventListener('pointerup', endPointer);
  ropeHit.addEventListener('pointercancel', cancelPointer);
  ropeHit.addEventListener('pointerenter', setHover);
  ropeHit.addEventListener('pointerleave', clearHover);
  leashControl.addEventListener('click', (event) => { event.preventDefault(); commitPull(); });
  leashControl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    commitPull();
  });

  (async () => {
    setProgress(lockedProgress);
    showNow(CELS[0].idle);
    setState('idle');
    CELS.forEach((_, index) => preloadChapter(index));
  })();
})();
