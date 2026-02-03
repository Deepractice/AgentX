/**
 * Route Provider - Simple screen navigation
 */

import { createContext, useContext, type ParentProps } from "solid-js";
import { createStore } from "solid-js/store";

export type RouteData =
  | { type: "home" }
  | { type: "session"; sessionId: string };

interface RouteContext {
  data: RouteData;
  navigate: (route: RouteData) => void;
  back: () => void;
}

const RouteCtx = createContext<RouteContext>();

export function RouteProvider(props: ParentProps) {
  const [store, setStore] = createStore<{ data: RouteData; history: RouteData[] }>({
    data: { type: "home" },
    history: [],
  });

  const ctx: RouteContext = {
    get data() {
      return store.data;
    },
    navigate(route: RouteData) {
      setStore("history", [...store.history, store.data]);
      setStore("data", route);
    },
    back() {
      const prev = store.history.at(-1);
      if (prev) {
        setStore("data", prev);
        setStore("history", store.history.slice(0, -1));
      }
    },
  };

  return <RouteCtx.Provider value={ctx}>{props.children}</RouteCtx.Provider>;
}

export function useRoute(): RouteContext {
  const ctx = useContext(RouteCtx);
  if (!ctx) {
    throw new Error("useRoute must be used within RouteProvider");
  }
  return ctx;
}
