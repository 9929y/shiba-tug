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
  const VALID_DRAG = .04;
  const FULL_DRAG = .22;
  const MIN_BAR = .035;

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
  let storedProgress = 0;
  let currentId = '';
  let drag = null;
  let queuedDrag = null;
  let dragRaf = 0;
  let reactionCursor = 0;
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
    ropeHit.setAttribute('d', frame.hitPath);
    if (currentId !== frame.id) {
      currentCel.src = frame.src;
      currentId = frame.id;
    }
  }

  async function showFrame(frame, hold = 105, fade = false) {
    if (!(await preload(frame.src))) return false;
    if (currentId !== frame.id) {
      if (fade && currentCel.getAttribute('src')) {
        previousCel.src = currentCel.src;
        currentCel.src = frame.src;
        currentId = frame.id;
        ropeHit.setAttribute('d', frame.hitPath);
        stage.classList.add('is-resetting');
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await PAUSE(REDUCED ? 20 : 250);
        stage.classList.remove('is-resetting');
      } else {
        showNow(frame);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
    await PAUSE(REDUCED ? 24 : hold);
    return true;
  }

  async function play(names, hold = 92) {
    for (const name of names) {
      if (!(await showFrame(CELS[chapter][name], hold))) return false;
    }
    return true;
  }

  function updateCuePosition(clientX, clientY) {
    const bounds = stage.getBoundingClientRect();
    grabCue.style.setProperty('--cue-x', `${Math.max(0, Math.min(bounds.width, clientX - bounds.left))}px`);
    grabCue.style.setProperty('--cue-y', `${Math.max(0, Math.min(bounds.height, clientY - bounds.top))}px`);
  }

  function tensionFor(clientX, startX) {
    const width = stage.getBoundingClientRect().width;
    const distance = Math.max(0, startX - clientX);
    const validDistance = width * VALID_DRAG;
    const fullDistance = width * FULL_DRAG;
    if (distance < validDistance) return { distance, tension: 0, valid: false };
    return { distance, tension: Math.min(1, (distance - validDistance) / (fullDistance - validDistance)), valid: true };
  }

  function gainFor(tension) {
    return .035 + .105 * Math.pow(tension, .85);
  }

  function frameForTension(tension, variant) {
    if (tension < .12) return 'hover';
    if (tension < .30) return 'pull';
    if (tension < .50) return 'brace';
    if (tension < .68) return variant;
    if (tension < .84) return 'turn';
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
    if (crossedMilestone) {
      if (preview === 'refusal') return ['return', 'slide', 'replant'];
      if (preview === 'turn') return ['refusal', 'return', 'slide', 'replant'];
      return [variant, 'turn', 'refusal', 'return', 'slide', 'replant'];
    }
    if (preview === 'refusal') return ['return', 'settled'];
    if (preview === 'turn') return ['refusal', 'return', 'settled'];
    if (preview === 'reactionA' || preview === 'reactionB') return ['settled'];
    if (preview === 'brace') return [variant, 'settled'];
    return ['brace', 'settled'];
  }

  async function resetAfterComplete() {
    await PAUSE(REDUCED ? 160 : 1500);
    fluidProgress.classList.remove('is-complete');
    chapter = 0;
    storedProgress = 0;
    setProgress(storedProgress);
    await showFrame(CELS[0].idle, 100, true);
    setState('idle');
  }

  async function commitPull({ tension = .6, preview = 'brace', variant = 'reactionA', valid = true } = {}) {
    if (state !== 'idle') return;
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
    setState('settling');
    await play(settleFrames(preview, variant, crossedMilestone), crossedMilestone ? 118 : 82);

    if (crossedMilestone) {
      if (afterChapter === 3) {
        fluidProgress.classList.add('is-complete');
        setState('complete');
        resetAfterComplete();
        return;
      }
      chapter = afterChapter;
      preloadChapter(chapter);
      await showFrame(CELS[chapter].idle, 90, true);
    }
    setState('idle');
  }

  function beginPointer(event) {
    if (state !== 'idle') return;
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
    ropeHit.releasePointerCapture?.(event.pointerId);
    applyDrag(event.clientX, event.clientY);
    const result = { tension: drag.tension, preview: drag.preview, variant: drag.variant, valid: drag.valid };
    if (result.valid) reactionCursor += 1;
    drag = null;
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
  ropeHit.addEventListener('pointerenter', setHover);
  ropeHit.addEventListener('pointerleave', clearHover);
  leashControl.addEventListener('click', (event) => { event.preventDefault(); commitPull(); });
  leashControl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    commitPull();
  });

  setProgress(storedProgress);
  showNow(CELS[0].idle);
  setState('idle');
  CELS.forEach((_, index) => preloadChapter(index));
})();
