// Solmar Bay — input. One object with the exact shape the world ticks on:
// move(), sprint(), takeLook(), takeZoom(), attackHeld(), takeActions().
// Keyboard (WASD + arrows, Shift to sprint / handbrake, E to act, Space to
// shoot), mouse look while the pointer is locked, wheel to zoom. takeLook /
// takeZoom / takeActions are consumptive: each call returns what accumulated
// since the last call, then clears it, so a frame never double-applies.
export function createInput() {
  const keys = new Set();
  let actions = 0;
  let lookX = 0;
  let lookY = 0;
  let zoom = 0;
  let mouseDown = false;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyE') actions += 1;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    if (document.pointerLockElement) {
      lookX += e.movementX;
      lookY += e.movementY;
    }
  }
  function onMouseDown(e) {
    if (e.button === 0) mouseDown = true;
  }
  function onMouseUp(e) {
    if (e.button === 0) mouseDown = false;
  }
  function onWheel(e) {
    zoom += Math.sign(e.deltaY);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: true });

  return {
    move() {
      const x =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const y =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      return { x, y };
    },
    sprint() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    takeLook() {
      const r = { x: lookX, y: lookY };
      lookX = 0;
      lookY = 0;
      return r;
    },
    takeZoom() {
      const z = zoom;
      zoom = 0;
      return z;
    },
    attackHeld() {
      return keys.has('Space') || mouseDown;
    },
    isDown(code) {
      return keys.has(code);
    },
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    // Click the canvas to lock the pointer for mouse look.
    attach(canvas) {
      if (!canvas) return;
      canvas.addEventListener('click', () => {
        if (canvas.requestPointerLock) canvas.requestPointerLock();
      });
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
    },
  };
}
