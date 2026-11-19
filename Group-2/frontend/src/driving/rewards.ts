export interface DrivingEngine {
  evaluateDrivingResult(text: string): string;
  purchaseDrivingVehicle(
    id: number,
    coins: number,
    level: number,
    owned: boolean,
  ): string;
}
declare global {
  interface Window {
    createDrivingRewards?: (options: {
      locateFile: (file: string) => string;
    }) => Promise<DrivingEngine>;
  }
}
let pending: Promise<DrivingEngine> | undefined;
export function loadDrivingEngine() {
  return (pending ??= new Promise<DrivingEngine>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/wasm/driving-boot.js";
    script.onerror = () =>
      reject(new Error("Driving reward loader could not load."));
    script.onload = () => {
      if (!window.createDrivingRewards) {
        reject(new Error("Missing reward module."));
        return;
      }
      window
        .createDrivingRewards({ locateFile: (file) => `/wasm/${file}` })
        .then(resolve, reject);
    };
    document.head.appendChild(script);
  }));
}
