// Solara Bay — input.js
// Keyboard + mouse state, plus a scripted-input hook the playtest driver
// uses (window.__SOLARA__.setKeys) so an end-to-end mission can be driven
// through the same path a human's keys take.
export const keys = Object.create(null);   // code -> true while held
export const pressed = Object.create(null); // code -> true on the frame it went down
export const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, clicked: false };

let scripted = null; // {W:true,...} injected by the playtest driver

export function setScripted(map) { scripted = map; }
export function clearScripted() { scripted = null; }

export function isDown(code) {
  if (scripted && code in scripted) return !!scripted[code];
  return !!keys[code];
}
export function wasPressed(code) { return !!pressed[code]; }
export function endFrame() {
  for (const k in pressed) delete pressed[k];
  mouse.dx = 0; mouse.dy = 0; mouse.clicked = false;
}

export function bindInput() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  window.addEventListener('mousemove', (e) => {
    mouse.dx += e.movementX || 0;
    mouse.dy += e.movementY || 0;
    mouse.x = e.clientX; mouse.y = e.clientY;
  });
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}
