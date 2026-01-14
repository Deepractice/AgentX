/**
 * Test setup - Initialize happy-dom for React testing
 */

import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });

// Set globals for DOM environment
globalThis.window = window as unknown as Window & typeof globalThis;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Text = window.Text;
globalThis.DocumentFragment = window.DocumentFragment;
