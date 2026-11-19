/**
 * Station Erebus Map Layout, Collision Grids, and Sector Topology
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * Spacious, open tactical facility layout inspired by Helldivers / Alien Swarm.
 * Safe Room Spawn: (400, 400) in open Sector A Staging Hangar.
 */

import { CONSTANTS } from './constants.js';

export const TILE_EMPTY = 0;
export const TILE_WALL = 1;
export const TILE_COVER = 2; // Low cover (can shoot over when crouched)
export const TILE_BULKHEAD_A = 3;
export const TILE_BULKHEAD_B = 4;
export const TILE_BULKHEAD_C = 5;
export const TILE_BULKHEAD_VAULT = 6;

export interface SectorDefinition {
  index: number;
  id: 'sector_a' | 'sector_b' | 'sector_c' | 'sector_d' | 'vault';
  name: string;
  terminalX: number;
  terminalY: number;
  terminalLogTitle: string;
  terminalLogText: string;
  terminalClue: string;
  spawnPoint: { x: number; y: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface MapData {
  width: number;
  height: number;
  tileSize: number;
  grid: number[][]; // [y][x]
  sectors: SectorDefinition[];
  crates: { x: number; y: number; weaponType: 'mk4' | 'sg12' | 'viper9' | 'railx' }[];
  barrels: { x: number; y: number }[];
  extractionPads: { index: number; x: number; y: number }[];
  bossSpawn: { x: number; y: number };
  pylonSpawns: { x: number; y: number }[];
}

export const SECTOR_DEFINITIONS: SectorDefinition[] = [
  {
    index: 0,
    id: 'sector_a',
    name: 'Sector A: Reactor Ring',
    terminalX: 820,
    terminalY: 420,
    terminalLogTitle: 'REACTOR_TELEMETRY_LOG_409.DAT',
    terminalLogText: 
      'TIMESTAMP: 02:14:09 — Anomaly detected in primary coolant loop. Manual override engaged via terminal ARC-01. ' +
      'Emergency cooling scram aborted. Authentication key originated from Directorate Engineering Level 4, bypassed secondary safety interlocks.',
    terminalClue: 'Clue 1/4: Blackout was NOT an accident. Coolant was deliberately dumped by an engineering directorate keycard.',
    spawnPoint: { x: 600, y: 450 }, // Starting Safe Room center (guaranteed wide open space)
    bounds: { minX: 2, minY: 2, maxX: 22, maxY: 18 },
  },
  {
    index: 1,
    id: 'sector_b',
    name: 'Sector B: Crew Quarters',
    terminalX: 1720,
    terminalY: 420,
    terminalLogTitle: 'INTERNAL_SECURITY_MEMO_88.LOG',
    terminalLogText: 
      'TIMESTAMP: 02:21:44 — Security officer Hayes reported unusual synth behavior in Med-Bay 3. Synths were observed loading classified bio-matrix samples into unmarked vacuum canisters. ' +
      'Hayes requested backup from Chief Systems Architect Dr. Maya Vance; his comms transponder was remotely purged four minutes later.',
    terminalClue: 'Clue 2/4: Dr. Maya Vance silenced security officers after rogue synths smuggled bio-matrix canisters.',
    spawnPoint: { x: 1250, y: 420 },
    bounds: { minX: 24, minY: 2, maxX: 46, maxY: 18 },
  },
  {
    index: 2,
    id: 'sector_c',
    name: 'Sector C: Data Archives',
    terminalX: 1720,
    terminalY: 1350,
    terminalLogTitle: 'ARCHIVE_ACCESS_MANIFEST.HEX',
    terminalLogText: 
      'TIMESTAMP: 02:35:12 — Cryptographic wipe executed across all security cameras and black-box logs. ' +
      'Root credentials signed by user ID: M_VANCE_8949. Synthetic defense directives modified: "Treat all human recovery teams as hostile bio-contaminants."',
    terminalClue: 'Clue 3/4: Vance reprogrammed the synthetic defenses to exterminate all incoming forensic operatives.',
    spawnPoint: { x: 1720, y: 1050 },
    bounds: { minX: 24, minY: 20, maxX: 46, maxY: 38 },
  },
  {
    index: 3,
    id: 'sector_d',
    name: 'Sector D: Security Core',
    terminalX: 580,
    terminalY: 1350,
    terminalLogTitle: 'CONSPIRACY_EVIDENCE_DOSSIER.ENC',
    terminalLogText: 
      'TIMESTAMP: 02:49:00 — Final transmission intercept: Dr. Maya Vance struck a multi-billion credit deal with Off-World Syndicate "Helios Corp" ' +
      'to deliver the Core Warden neural core. She initiated Blackout Protocol to trigger station auto-purge and cover her tracks.',
    terminalClue: 'Clue 4/4: Dr. Maya Vance is the sole architect of the sabotage. The Core Warden in the Central Vault holds the master neural core.',
    spawnPoint: { x: 950, y: 1350 },
    bounds: { minX: 2, minY: 20, maxX: 22, maxY: 38 },
  },
  {
    index: 4,
    id: 'vault',
    name: 'Central Vault: Core Warden Arena',
    terminalX: 3000,
    terminalY: 1200,
    terminalLogTitle: 'WARDEN_MASTER_CORE.SYS',
    terminalLogText: 'Core Warden deactivated. Blackout Protocol master encryption keys unlocked. Initiate emergency extraction synchronization.',
    terminalClue: 'All 4 Operatives must secure the 4 Extraction Sync Pads simultaneously for 5 seconds!',
    spawnPoint: { x: 2600, y: 1200 },
    bounds: { minX: 50, minY: 8, maxX: 76, maxY: 44 },
  },
];

/**
 * Builds the hand-designed 80x60 Station Erebus tile map
 */
export function buildStationErebusMap(): MapData {
  const width = CONSTANTS.MAP_WIDTH_TILES;
  const height = CONSTANTS.MAP_HEIGHT_TILES;
  const TILE_SIZE = CONSTANTS.TILE_SIZE;

  // Initialize all to Wall
  const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(TILE_WALL));

  // Helper to carve open rooms
  function carveRoom(x1: number, y1: number, x2: number, y2: number) {
    for (let y = Math.max(1, y1); y <= Math.min(height - 2, y2); y++) {
      for (let x = Math.max(1, x1); x <= Math.min(width - 2, x2); x++) {
        grid[y][x] = TILE_EMPTY;
      }
    }
  }

  // Helper to carve wide corridors
  function carveHCorridor(x1: number, x2: number, y: number, thickness = 4) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let t = 0; t < thickness; t++) {
      const curY = y + t;
      if (curY >= 1 && curY < height - 1) {
        for (let x = minX; x <= maxX; x++) {
          grid[curY][x] = TILE_EMPTY;
        }
      }
    }
  }

  function carveVCorridor(y1: number, y2: number, x: number, thickness = 4) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let t = 0; t < thickness; t++) {
      const curX = x + t;
      if (curX >= 1 && curX < width - 1) {
        for (let y = minY; y <= maxY; y++) {
          grid[y][curX] = TILE_EMPTY;
        }
      }
    }
  }

  // 1. SECTOR A: STARTING SAFE ROOM & REACTOR RING (x: 2..22, y: 2..18)
  // Large open staging hangar spanning 960px by 768px! Spawn is at (400, 400).
  carveRoom(2, 2, 22, 17);

  // Decorative tactical barricades far away from spawn
  grid[5][14] = TILE_COVER;
  grid[5][15] = TILE_COVER;
  grid[13][14] = TILE_COVER;
  grid[13][15] = TILE_COVER;

  // Bulkhead A -> B (at x = 23, y: 7..10)
  grid[7][23] = TILE_BULKHEAD_A;
  grid[8][23] = TILE_BULKHEAD_A;
  grid[9][23] = TILE_BULKHEAD_A;
  grid[10][23] = TILE_BULKHEAD_A;

  // 2. SECTOR B: CREW QUARTERS (x: 24..46, y: 2..18)
  carveRoom(24, 2, 46, 17);

  // Cover barriers in Crew Quarters
  grid[6][32] = TILE_COVER;
  grid[6][33] = TILE_COVER;
  grid[12][38] = TILE_COVER;
  grid[12][39] = TILE_COVER;

  // Bulkhead B -> C (at x: 33..36, y = 18)
  grid[18][33] = TILE_BULKHEAD_B;
  grid[18][34] = TILE_BULKHEAD_B;
  grid[18][35] = TILE_BULKHEAD_B;
  grid[18][36] = TILE_BULKHEAD_B;

  // 3. SECTOR C: DATA ARCHIVES (x: 24..46, y: 19..37)
  carveRoom(24, 19, 46, 36);

  // Server rack pillars (spaced widely for fluid combat)
  for (let sx = 28; sx <= 42; sx += 5) {
    grid[24][sx] = TILE_WALL;
    grid[25][sx] = TILE_WALL;
    grid[30][sx] = TILE_WALL;
    grid[31][sx] = TILE_WALL;
  }

  // Bulkhead C -> D (at x = 23, y: 26..29)
  grid[26][23] = TILE_BULKHEAD_C;
  grid[27][23] = TILE_BULKHEAD_C;
  grid[28][23] = TILE_BULKHEAD_C;
  grid[29][23] = TILE_BULKHEAD_C;

  // 4. SECTOR D: SECURITY CORE (x: 2..22, y: 19..37)
  carveRoom(2, 19, 22, 36);

  // Security barricades
  grid[25][10] = TILE_COVER;
  grid[25][11] = TILE_COVER;
  grid[31][15] = TILE_COVER;
  grid[31][16] = TILE_COVER;

  // Corridor leading from Sector D into Central Vault
  carveHCorridor(22, 51, 22, 4);

  // Bulkhead D -> Vault Blast Door (at x: 50, y: 22..25)
  grid[22][50] = TILE_BULKHEAD_VAULT;
  grid[23][50] = TILE_BULKHEAD_VAULT;
  grid[24][50] = TILE_BULKHEAD_VAULT;
  grid[25][50] = TILE_BULKHEAD_VAULT;

  // 5. CENTRAL VAULT: WARDEN ARENA (x: 51..76, y: 8..44)
  carveRoom(51, 8, 76, 43);

  // Arena tactical half-walls
  grid[16][60] = TILE_COVER;
  grid[16][61] = TILE_COVER;
  grid[34][60] = TILE_COVER;
  grid[34][61] = TILE_COVER;

  // Supply Crates
  const crates: MapData['crates'] = [
    { x: 380, y: 240, weaponType: 'sg12' },   // Safe room starting shotgun
    { x: 500, y: 240, weaponType: 'viper9' },  // Safe room starting SMG
    { x: 1550, y: 300, weaponType: 'viper9' },
    { x: 1550, y: 1500, weaponType: 'railx' },
    { x: 450, y: 1500, weaponType: 'mk4' },
    { x: 2700, y: 950, weaponType: 'railx' },
    { x: 2700, y: 1450, weaponType: 'sg12' },
  ];

  // Explosive Plasma Barrels
  const barrels: MapData['barrels'] = [
    { x: 920, y: 240 },
    { x: 920, y: 320 }, // Chain reaction pair
    { x: 1850, y: 300 },
    { x: 1850, y: 360 },
    { x: 1850, y: 1500 },
    { x: 750, y: 1500 },
    { x: 750, y: 1560 },
    { x: 2850, y: 850 },
    { x: 3200, y: 850 },
    { x: 2850, y: 1550 },
    { x: 3200, y: 1550 },
  ];

  // 4 Extraction Sync Pads in the corners of Central Vault
  const extractionPads: MapData['extractionPads'] = [
    { index: 0, x: 2650, y: 650 },  // Pad 1: NW
    { index: 1, x: 3350, y: 650 },  // Pad 2: NE
    { index: 2, x: 2650, y: 1750 }, // Pad 3: SW
    { index: 3, x: 3350, y: 1750 }, // Pad 4: SE
  ];

  // Boss Spawn & 4 Shield Pylons
  const bossSpawn = { x: 3000, y: 1200 };
  const pylonSpawns = [
    { x: 2750, y: 900 },
    { x: 3250, y: 900 },
    { x: 2750, y: 1500 },
    { x: 3250, y: 1500 },
  ];

  return {
    width,
    height,
    tileSize: TILE_SIZE,
    grid,
    sectors: SECTOR_DEFINITIONS,
    crates,
    barrels,
    extractionPads,
    bossSpawn,
    pylonSpawns,
  };
}
