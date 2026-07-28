import { Terminal } from "./xterm/xterm.mjs";

window.Terminal = Terminal;
window.dispatchEvent(new Event("ai-studio-xterm-ready"));
