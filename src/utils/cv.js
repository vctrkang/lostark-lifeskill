/**
 * Resolves once OpenCV WASM is fully initialised.
 *
 * window.cv is a thenable (Emscripten modules have a .then method), so it must
 * NEVER be passed to Promise.resolve() or returned from an async function —
 * either causes JS to follow the thenable and hang forever.
 *
 * Callers should: await waitForCV(); then access window.cv directly.
 */

let _readyPromise = null;

export function waitForCV() {
  if (!_readyPromise) {
    _readyPromise = new Promise(resolve => {
      if (window.cv?.Mat) { resolve(); return; }
      if (window.cv) window.cv.onRuntimeInitialized = resolve;
      const poll = setInterval(() => {
        if (window.cv?.Mat) { clearInterval(poll); resolve(); }
      }, 50);
    });
  }
  return _readyPromise;
}
