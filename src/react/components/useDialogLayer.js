import { createContext, useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createDialogStack } from './dialog-stack.js';

export const DialogLayerContext = createContext(null);
const stack = createDialogStack();

export function useDialogLayer(open) {
  const token = useRef({}).current;
  const parent = useContext(DialogLayerContext);
  const snapshot = useCallback(() => stack.layer(token), [token]);
  const layer = useSyncExternalStore(stack.subscribe, snapshot, () => 100);
  const release = useCallback(() => stack.release(token), [token]);
  useLayoutEffect(() => {
    if (open) stack.activate(token, parent);
  }, [open, parent, token]);
  useLayoutEffect(() => release, [release]);
  return { token, layer, release };
}
