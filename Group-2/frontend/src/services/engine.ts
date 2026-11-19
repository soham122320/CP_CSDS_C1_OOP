import type { Engine } from "../types/engine";
declare global {
  interface Window {
    createRescueEngine?: (options: {
      locateFile: (file: string) => string;
    }) => Promise<Engine>;
  }
}
let pending: Promise<Engine> | undefined;
export function loadEngine() {
  return (pending ??= new Promise<Engine>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/wasm/boot.js";
    script.onerror = () => reject(new Error("Could not load engine module"));
    script.onload = () => {
      if (!window.createRescueEngine) {
        reject(new Error("Engine factory unavailable"));
        return;
      }
      window
        .createRescueEngine({ locateFile: (file: string) => `/wasm/${file}` })
        .then(resolve, reject);
    };
    document.head.appendChild(script);
  }));
}
