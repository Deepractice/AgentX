/**
 * Dialog Provider - Modal stack management
 */

import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import { createContext, useContext, Show, type ParentProps, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { useTheme } from "./theme";
import { createLogger } from "commonxjs/logger";

const logger = createLogger("cli/dialog");

interface DialogEntry {
  element: () => JSX.Element;
  onClose?: () => void;
}

interface DialogContext {
  stack: DialogEntry[];
  show: (element: () => JSX.Element, onClose?: () => void) => void;
  replace: (element: () => JSX.Element, onClose?: () => void) => void;
  clear: () => void;
  pop: () => void;
}

const DialogCtx = createContext<DialogContext>();

export function DialogProvider(props: ParentProps) {
  const [store, setStore] = createStore<{ stack: DialogEntry[] }>({ stack: [] });
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();

  useKeyboard((evt) => {
    if (evt.name === "escape" && store.stack.length > 0) {
      ctx.pop();
      evt.preventDefault();
      evt.stopPropagation();
    }
  });

  const ctx: DialogContext = {
    get stack() {
      return store.stack;
    },
    show(element, onClose) {
      logger.debug("dialog.show called", { currentStackSize: store.stack.length });
      setStore("stack", [...store.stack, { element, onClose }]);
      logger.debug("dialog.show completed", { newStackSize: store.stack.length });
    },
    replace(element, onClose) {
      logger.debug("dialog.replace called");
      for (const entry of store.stack) {
        entry.onClose?.();
      }
      setStore("stack", [{ element, onClose }]);
    },
    clear() {
      logger.debug("dialog.clear called", { stackSize: store.stack.length });
      for (const entry of store.stack) {
        entry.onClose?.();
      }
      setStore("stack", []);
    },
    pop() {
      logger.debug("dialog.pop called", { stackSize: store.stack.length });
      const current = store.stack.at(-1);
      current?.onClose?.();
      setStore("stack", store.stack.slice(0, -1));
    },
  };

  return (
    <DialogCtx.Provider value={ctx}>
      {props.children}
      <Show when={store.stack.length > 0}>
        <box
          position="absolute"
          left={0}
          top={0}
          width={dimensions().width}
          height={dimensions().height}
          alignItems="center"
          paddingTop={Math.floor(dimensions().height / 4)}
          backgroundColor="rgba(0,0,0,0.6)"
        >
          <box
            width={60}
            maxWidth={dimensions().width - 4}
            backgroundColor={theme().backgroundPanel}
            paddingTop={1}
            paddingBottom={1}
            paddingLeft={2}
            paddingRight={2}
          >
            {store.stack.at(-1)?.element()}
          </box>
        </box>
      </Show>
    </DialogCtx.Provider>
  );
}

export function useDialog(): DialogContext {
  const ctx = useContext(DialogCtx);
  if (!ctx) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return ctx;
}
