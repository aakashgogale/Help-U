// Warm the code-split pages a user is most likely to open next, once the browser is idle,
// so tapping a tab doesn't wait on a chunk download (or, in dev, a first-time compile).
export const prefetchWhenIdle = (loaders) => {
  const run = () => loaders.forEach((load) => { Promise.resolve(load()).catch(() => {}); });
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
};
