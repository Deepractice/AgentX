/**
 * Exit Provider - Handle application exit
 */

import { createContext, type ParentProps, useContext } from "solid-js";

type ExitFn = () => void;

const ExitContext = createContext<ExitFn>();

export function ExitProvider(props: ParentProps<{ onExit: () => void }>) {
  return <ExitContext.Provider value={props.onExit}>{props.children}</ExitContext.Provider>;
}

export function useExit(): ExitFn {
  const exit = useContext(ExitContext);
  if (!exit) {
    throw new Error("useExit must be used within ExitProvider");
  }
  return exit;
}
