// Keyboard, mouse and gamepad input. Held keys give a move direction; one-shot presses
// (confirm, pause, enter/exit a car, interact, reload, switch weapon) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost or counted twice.
// Mouse drag orbits the camera; the pointer is locked while the left button is held on the
// canvas, and the mouse wheel zooms the chase camera.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_INTERACT = 8;
export const ACTION_RELOAD = 16;
export const ACTION_WEAPON = 32;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const INTERACT = new Set(['KeyF']);
const RELOAD = new Set(['KeyR']);
const WEAPON = new Set(['KeyQ', 'Digit1', 'Digit2']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let lookX = 0;
  let lookY = 0;
  let attack = false;
  let zoom = 0;
  let dragging = false;

  window.addEventListener('keydown', (event) => {
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code)
      || RIGHT.has(event.code) || SPRINT.has(event.code)) {
      keys.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (RELOAD.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RELOAD;
    } else if (WEAPON.has(event.code)) {
      if (!event.repeat) actions |= ACTION_WEAPON;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    if (event.button === 0) attack = true;
    try { canvas.requestPointerLock(); } catch { /* pointer lock is a nicety */ }
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) attack = false;
    dragging = false;
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    lookX += event.movementX || 0;
    lookY += event.movementY || 0;
  });
  canvas.addEventListener('wheel', (event) => {
    zoom += Math.sign(event.deltaY);
    event.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement) dragging = false;
  });

  return {
    /** Move axes, -1..1 each: x is strafe right, y is forward. */
    move() {
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
        - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
        - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      return { x, y };
    },
    sprint() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    /** Mouse-look delta since the last call, in pixels. */
    takeLook() {
      const out = { x: lookX, y: lookY };
      lookX = 0;
      lookY = 0;
      return out;
    },
    /** Wheel steps since the last call. */
    takeZoom() {
      const out = zoom;
      zoom = 0;
      return out;
    },
    attackHeld() {
      return attack;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
