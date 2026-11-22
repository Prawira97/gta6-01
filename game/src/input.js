// Solmar Bay — browser input: WASD/arrows to move, Shift to sprint (or
// handbrake-drift in a car), mouse to look, left click / Space to shoot,
// E to interact, wheel to zoom. takeLook / takeZoom / takeActions consume
// their deltas, so each step reads each event once.
export const ACTION_INTERACT = 1;

export function createInput(canvas) {
  const keys = new Set();
  let lookX = 0;
  let lookY = 0;
  let zoom = 0;
  let actions = 0;
  let mouseDown = false;
  let spaceDown = false;

  const onKeyDown = (e) => {
    if (e.code === 'KeyE' && !keys.has('KeyE')) actions |= ACTION_INTERACT;
    keys.add(e.code);
    // Arrows and Space would scroll or trigger browser shortcuts; the
    // game owns them while it runs.
    if (e.code === 'Space' || e.code.startsWith('Arrow')) {
      e.preventDefault();
    }
    if (e.code === 'Space') {
      spaceDown = true;
    }
  };
  const onKeyUp = (e) => {
    keys.delete(e.code);
    if (e.code === 'Space') spaceDown = false;
  };
  const onMouseMove = (e) => {
    if (document.pointerLockElement === canvas) {
      lookX += e.movementX || 0;
      lookY += e.movementY || 0;
    }
  };
  const onMouseDown = (e) => {
    if (e.button === 0) mouseDown = true;
  };
  const onMouseUp = (e) => {
    if (e.button === 0) mouseDown = false;
  };
  const onWheel = (e) => {
    zoom += e.deltaY || 0;
  };
  const onBlur = () => {
    keys.clear();
    mouseDown = false;
    spaceDown = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('blur', onBlur);

  return {
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    sprint() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    takeLook() {
      const out = { x: lookX, y: lookY };
      lookX = 0;
      lookY = 0;
      return out;
    },
    takeZoom() {
      const out = zoom;
      zoom = 0;
      return out;
    },
    attackHeld() {
      return mouseDown || spaceDown;
    },
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onBlur);
    },
  };
}
