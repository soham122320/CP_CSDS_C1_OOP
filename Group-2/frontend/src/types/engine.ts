export interface Vehicle {
  id: number;
  type: string;
  cell: number;
  fuel: number;
  supplies: number;
  status: string;
  civilianId: number;
  hospitalId: number;
  route: number[];
  routeIndex: number;
  fuelCost: number;
}
export interface Civilian {
  id: number;
  cell: number;
  name: string;
  severity: number;
  status: string;
}
export interface Facility {
  id: number;
  cell: number;
  name: string;
  type: string;
  capacity?: number;
  occupied?: number;
  reserved?: number;
}
export interface Path {
  calculated: boolean;
  route: number[];
  visited: number[];
  distance: number;
}
export interface GameState {
  scenario: Partial<Scenario> & {
    name: string;
    difficulty: string;
    objective: "all" | "critical";
  };
  outcome: "pending" | "success" | "failure";
  timeLimit: number;
  phase: "ready" | "running" | "paused" | "finished";
  ticks: number;
  timeRemaining: number;
  selectedVehicle: number;
  score: number;
  rescued: number;
  critical: number;
  activeMissions: number;
  total: number;
  vehicles: Vehicle[];
  civilians: Civilian[];
  facilities: Facility[];
  map: { rows: number; cols: number; blocked: number[] };
  missions: {
    id: number;
    vehicleId: number;
    civilianId: number;
    hospitalId: number;
    status: string;
    started: number;
    completed: number | null;
  }[];
  events: { text: string; kind: string; tick: number }[];
  history: { tick: number; score: number; rescued: number }[];
  path: Path;
  priorities: number[];
}
export interface Engine {
  getScenarios(): string;
  setScenario(text: string): string;
  exportScenario(): string;
  validateScenario(text: string): string;
  initializeGame(): string;
  getGameState(): string;
  startGame(): string;
  pauseGame(): string;
  restartGame(): string;
  tick(): string;
  selectVehicle(id: number): string;
  assignRescueMission(v: number, c: number): string;
  calculateShortestPath(a: number, b: number): string;
  moveVehicle(id: number): string;
  saveGame(): string;
  loadGame(data: string): string;
  getCurrentScore(): number;
  getVehicles(): string;
  getCivilians(): string;
  getFacilities(): string;
  getExceptionMessage?(e: unknown): string[];
  decrementExceptionRefcount?(e: unknown): void;
}

export interface Scenario {
  name: string;
  difficulty: string;
  brief?: string;
  objective: "all" | "critical";
  timeLimit: number;
  fuel: number;
  supplies: number;
  blocked: number[];
  civilians: { cell: number; severity: number }[];
  vehicles: number[];
  hospitals: { cell: number; capacity: number }[];
}
