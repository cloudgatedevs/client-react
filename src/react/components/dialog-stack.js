// Shared by both public dialog entry points. Keep closing dialogs registered until
// Radix finishes their exit animation, so a new overlay cannot slip underneath.
export function createDialogStack() {
  const entries = new Map();
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener());
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    activate(token, parent) {
      entries.delete(token);
      entries.set(token, { parent });
      notify();
    },
    release(token) { if (entries.delete(token)) notify(); },
    layer(token) {
      const ordered = [], visited = new Set();
      const visit = key => {
        if (!entries.has(key) || visited.has(key)) return;
        visited.add(key);
        visit(entries.get(key).parent);
        ordered.push(key);
      };
      // Opening order controls siblings; ancestry controls simultaneously opened
      // parents and children regardless of React's child-first layout effects.
      entries.forEach((_, key) => visit(key));
      return 100 + Math.max(0, ordered.indexOf(token)) * 2;
    },
  };
}
