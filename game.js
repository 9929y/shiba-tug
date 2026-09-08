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
  const VALID_DRAG = 4; // CSS pixels: intent threshold, never a visual dead zone.
  const FULL_DRAG = .22;
  const MIN_BAR = .035;

  const NAMES = ['idle', 'soften', 'hover', 'takeup', 'pull', 'tight-1', 'brace', 'tight-2', 'crouch-1', 'crouch-2', 'reactionA', 'reactionB', 'turn-1', 'turn', 'turn-2', 'refusal', 'return', 'lift', 'slide-1', 'slide', 'land', 'replant', 'settled'];
  const pathFor = (chapter, name) => {
    const endX = [1060, 1015, 970][chapter];
    const isLoose = ['idle', 'soften', 'hover', 'takeup', 'settled', 'replant'].includes(name);
    const startY = 242;
    const endY = name === 'refusal' ? 338 : 298;
    const sag = isLoose ? 105 : 22;
    return `M 347 ${startY} C 575 ${startY + sag}, ${endX - 235} ${endY + sag}, ${endX} ${endY}`;
  };
  const sourceFor = (chapter, name) => {
    if (chapter === 0 && ['soften', 'takeup', 'tight-1', 'tight-2', 'crouch-1', 'lift', 'land'].includes(name)) return `assets/cels/inbetweens/ch1-${name}.webp`;
    const filePrefix = `ch${chapter + 1}`;
    if (name === 'land') name = 'replant';
    if (name === 'lift') name = 'return';
    if (name === 'soften') name = 'hover';
    if (chapter === 0 && name === 'crouch-2') name = 'reactionA';
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
  let storedProgress = 0;
  let currentId = '';
  let drag = null;
  let queuedDrag = null;
  let dragRaf = 0;
  let reactionCursor = 0;
  const preloadCache = new Map();
  const decoded = new Set();
  const retainedImages = new Map();
  let playback = 0;
  let requestedFrame = 0;
  let bounds = stage.getBoundingClientRect();
  new ResizeObserver(() => { bounds = stage.getBoundingClientRect(); }).observe(stage);
  window.addEventListener('scroll', () => { bounds = stage.getBoundingClientRect(); }, { passive: true });

  function interruptPlayback() {
    playback += 1;
    stage.classList.remove('is-resetting');
    return playback;
  }

  function setState(next) {
    state = next;
    stage.dataset.state = next;
    stage.dataset.chapter = String(chapter + 1);
    stage.classList.toggle('is-locked', next === 'complete');
    leashControl.disabled = next === 'dragging' || next === 'complete';
  }

  function preload(src) {
    if (preloadCache.has(src)) return preloadCache.get(src);
    const task = new Promise((resolve) => {
      const image = new Image();
      image.onload = async () => {
        try {
          await image.decode();
          retainedImages.set(src, image);
          decoded.add(src);
          resolve(true);
        } catch { resolve(false); }
      };
      image.onerror = () => resolve(false);
      image.src = src;
    });
    preloadCache.set(src, task);
    return task;
  }

  function preloadChapter(index) {
    NAMES.forEach((name) => preload(CELS[index][name].src));
  }

  function displayProgress(value) {
    return MIN_BAR + (1 - MIN_BAR) * Math.max(0, Math.min(1, value));
  }

  function setProgress(value) {
    fluidProgress.style.setProperty('--fill', String(displayProgress(value)));
  }

  function showNow(frame) {
    const request = ++requestedFrame;
    const paint = () => {
      if (request !== requestedFrame) return;
      ropeHit.setAttribute('d', frame.hitPath);
      if (currentId !== frame.id) {
        currentCel.src = frame.src;
        currentId = frame.id;
      }
    };
    if (decoded.has(frame.src)) paint();
    else preload(frame.src).then((ready) => { if (ready) paint(); });
  }

  async function showFrame(frame, hold = 105, fade = false, token = playback) {
    if (!(await preload(frame.src)) || token !== playback) return false;
    // Direct, decoded swaps avoid both ghosting and a blocking crossfade.
    showNow(frame);
    await PAUSE(REDUCED ? 24 : hold);
    return token === playback;
  }

  async function play(names, hold = 92, token = playback, scene = chapter) {
    for (const name of names) {
      if (!(await showFrame(CELS[scene][name], ['return', 'lift', 'slide', 'land'].includes(name) ? hold / 2 : hold, false, token))) return false;
    }
    return token === playback;
  }

  function updateCuePosition(clientX, clientY) {
    grabCue.style.setProperty('--cue-x', `${Math.max(0, Math.min(bounds.width, clientX - bounds.left))}px`);
    grabCue.style.setProperty('--cue-y', `${Math.max(0, Math.min(bounds.height, clientY - bounds.top))}px`);
  }

  function tensionFor(clientX, startX) {
    const width = bounds.width;
    const distance = Math.max(0, startX - clientX);
    const validDistance = VALID_DRAG;
    const fullDistance = width * FULL_DRAG;
    return { distance, tension: Math.min(1, distance / fullDistance), valid: distance >= validDistance };
  }

  function gainFor(tension) {
    return .035 + .105 * Math.pow(tension, .85);
  }

  function frameForTension(tension, variant) {
    if (tension < .04) return 'soften';
    if (tension < .08) return 'hover';
    if (tension < .18) return 'takeup';
    if (tension < .28) return 'pull';
    if (tension < .38) return 'tight-1';
    if (tension < .48) return 'brace';
    if (tension < .58) return 'tight-2';
    if (tension < .66) return 'crouch-1';
    if (tension < .74) return 'crouch-2';
    if (tension < .80) return variant;
    if (tension < .86) return 'turn-1';
    if (tension < .92) return 'turn';
    if (tension < .97) return 'turn-2';
    return 'refusal';
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

  function applyDrag(clientX, clientY) {
    if (!drag || state !== 'dragging') return;
    const pull = tensionFor(clientX, drag.startX);
    drag.distance = pull.distance;
    drag.tension = pull.tension;
    drag.valid = pull.valid;
    drag.preview = frameForTension(pull.tension, drag.variant);
    updateCuePosition(clientX, clientY);
    stage.style.setProperty('--grab-tightness', String(pull.tension));
    stage.style.setProperty('--scene-sway', `${Math.min(10, pull.distance * .055)}px`);
    grabCue.style.setProperty('--cue-shift', `${-Math.min(18, pull.distance * .08)}px`);
    const previewProgress = pull.valid ? Math.min(1, storedProgress + gainFor(pull.tension)) : storedProgress;
    fluidProgress.style.setProperty('--drag-fill', String(displayProgress(previewProgress)));
    fluidProgress.style.setProperty('--drag-energy', String(pull.tension));
    showNow(CELS[chapter][drag.preview]);
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

  function settleFrames(preview, variant, crossedMilestone) {
    const tensionPath = ['soften', 'hover', 'takeup', 'pull', 'tight-1', 'brace', 'tight-2', 'crouch-1', 'crouch-2', variant, 'turn-1', 'turn', 'turn-2', 'refusal'];
    const currentIndex = Math.max(0, tensionPath.indexOf(preview));
    if (crossedMilestone) {
      return [...tensionPath.slice(currentIndex + 1), 'return', 'lift', 'slide-1', 'slide', 'land', 'replant'];
    }
    if (preview === 'refusal') return ['return', 'settled'];
    if (['turn-1', 'turn', 'turn-2'].includes(preview)) return [...tensionPath.slice(currentIndex + 1), 'return', 'settled'];
    if (preview === 'reactionA' || preview === 'reactionB') return ['settled'];
    return [tensionPath[Math.min(currentIndex + 1, tensionPath.length - 1)], 'settled'];
  }

  async function resetAfterComplete(token) {
    await PAUSE(REDUCED ? 160 : 1500);
    if (token !== playback) return;
    fluidProgress.classList.remove('is-complete');
    chapter = 0;
    storedProgress = 0;
    setProgress(storedProgress);
    await showFrame(CELS[0].idle, 100, false, token);
    if (token === playback) setState('idle');
  }

  async function commitPull({ tension = .6, preview = 'brace', variant = 'reactionA', valid = true } = {}) {
    if (!['idle', 'settling'].includes(state)) return;
    const token = interruptPlayback();
    if (!valid) {
      showNow(CELS[chapter].idle);
      return;
    }

    const before = storedProgress;
    const beforeChapter = Math.min(2, Math.floor(before * 3));
    storedProgress = Math.min(1, before + gainFor(tension));
    const afterChapter = Math.min(3, Math.floor(storedProgress * 3));
    const crossedMilestone = afterChapter > beforeChapter || storedProgress === 1;
    setProgress(storedProgress);
    const scene = chapter;
    if (crossedMilestone) chapter = Math.min(2, afterChapter);
    setState('settling');
    if (!(await play(settleFrames(preview, variant, crossedMilestone), crossedMilestone ? 118 : 82, token, scene))) return;

    if (crossedMilestone) {
      if (afterChapter === 3) {
        fluidProgress.classList.add('is-complete');
        setState('complete');
        resetAfterComplete(token);
        return;
      }
      chapter = afterChapter;
      preloadChapter(chapter);
      if (!(await showFrame(CELS[chapter].idle, 0, false, token))) return;
    }
    setState('idle');
  }

  function beginPointer(event) {
    if (!['idle', 'settling'].includes(state) || event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    interruptPlayback();
    bounds = stage.getBoundingClientRect();
    stage.classList.remove('is-hovering');
    const variant = reactionCursor % 2 === 0 ? 'reactionA' : 'reactionB';
    drag = { startX: event.clientX, pointerId: event.pointerId, tension: 0, valid: false, preview: 'hover', variant };
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
    applyDrag(event.clientX, event.clientY);
    const result = { tension: drag.tension, preview: drag.preview, variant: drag.variant, valid: drag.valid };
    if (result.valid) reactionCursor += 1;
    drag = null;
    if (ropeHit.hasPointerCapture?.(event.pointerId)) ropeHit.releasePointerCapture(event.pointerId);
    stopDragging();
    setState('idle');
    commitPull(result);
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
  ropeHit.addEventListener('lostpointercapture', cancelPointer);
  window.addEventListener('blur', () => cancelPointer());
  ropeHit.addEventListener('pointerenter', setHover);
  ropeHit.addEventListener('pointerleave', clearHover);
  leashControl.addEventListener('click', (event) => { event.preventDefault(); commitPull(); });
  leashControl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) commitPull();
  });

  setProgress(storedProgress);
  showNow(CELS[0].idle);
  setState('idle');
  CELS.forEach((_, index) => preloadChapter(index));
})();
