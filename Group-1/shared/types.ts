/**
 * Protocol, State, and Entity Type Definitions for SHARD-4: BLACKOUT PROTOCOL
 */

export type OperativeClass = 'vanguard' | 'phantom' | 'breacher' | 'medic';

export type WeaponType = 'mk4' | 'sg12' | 'viper9' | 'railx' | 'p45';

export type GrenadeType = 'frag' | 'emp';

export type EnemyType = 'stalker' | 'enforcer' | 'juggernaut' | 'warden' | 'pylon';

export type EnemyState = 'idle' | 'alert' | 'chase' | 'attack' | 'flank' | 'retreat' | 'stunned' | 'dead';

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerInputPacket {
  seq: number;
  moveX: number;
  moveY: number;
  aimAngle: number;
  isSprinting: boolean;
  isCrouched: boolean;
  isDodging: boolean;
  isFiring: boolean;
  isReloading: boolean;
  isInteracting: boolean;
  useSkill: boolean;
  throwGrenade: boolean;
  switchSlot: 1 | 2 | null;
  dt: number;
  clientTimestamp: number;
  posX?: number;
  posY?: number;
}

export interface SerializedWeapon {
  type: WeaponType;
  name: string;
  magAmmo: number;
  magCapacity: number;
  reserveAmmo: number;
  maxReserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  hasInfiniteReserve?: boolean;
}

export interface OperativeState {
  id: string;
  name: string;
  slotIndex: number;
  isBot: boolean;
  operativeClass: OperativeClass;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aimAngle: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  isCrouched: boolean;
  isDodging: boolean;
  dodgeTimer: number;
  dodgeCooldownRemaining: number;
  isDead: boolean;
  isDowned: boolean;
  bleedoutTimer: number;
  reviveProgress: number;
  isCamo: boolean;
  camoTimer: number;
  hasRiotShield: boolean;
  riotShieldAngle: number;
  riotShieldTimer: number;
  activeSlot: 1 | 2;
  primaryWeapon: SerializedWeapon;
  sidearmWeapon: SerializedWeapon;
  fragCount: number;
  empCount: number;
  selectedGrenade: GrenadeType;
  skillCooldownRemaining: number;
  lastAcknowledgedSeq: number;
  // Match stats
  kills: number;
  damageDealt: number;
  headshots: number;
  revivesPerformed: number;
  terminalsHacked: number;
}

export interface HostileState {
  id: string;
  type: EnemyType;
  state: EnemyState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  shieldHp?: number;
  maxShieldHp?: number;
  isStunned: boolean;
  stunTimer: number;
  targetId: string | null;
  phase?: number;
  telegraphAngle?: number;
  telegraphProgress?: number;
  weakSpotAngle?: number;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  isEnemy: boolean;
  weaponType: WeaponType | 'grenade_frag' | 'grenade_emp' | 'boss_laser' | 'shockwave';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  lifetime: number;
  maxLifetime: number;
  pierceCount?: number;
  isCrit?: boolean;
}

export interface CombatEvent {
  id: string;
  type: 
    | 'damage'
    | 'kill'
    | 'revive_start'
    | 'revive_success'
    | 'downed'
    | 'hack_start'
    | 'hack_complete'
    | 'shard_unlocked'
    | 'barrel_explode'
    | 'boss_phase'
    | 'shield_block'
    | 'extraction_sync_tick';
  x: number;
  y: number;
  amount?: number;
  text?: string;
  isCrit?: boolean;
  isWeakSpot?: boolean;
  sourceId?: string;
  targetId?: string;
}

export interface LootCrateState {
  id: string;
  x: number;
  y: number;
  weaponType: WeaponType;
  opened: boolean;
}

export interface PlasmaBarrelState {
  id: string;
  x: number;
  y: number;
  hp: number;
  isExploding: boolean;
}

export interface TerminalState {
  id: string;
  sectorIndex: number;
  sectorName: string;
  x: number;
  y: number;
  hacked: boolean;
  hackProgress: number; // 0 to 1
  isBeingHacked: boolean;
  hackerId: string | null;
}

export interface ExtractionPadState {
  id: string;
  index: number;
  x: number;
  y: number;
  radius: number;
  isOccupied: boolean;
  occupantId: string | null;
}

export interface CipherLog {
  shardIndex: number;
  title: string;
  sector: string;
  timestamp: string;
  recoveredBy: string;
  logText: string;
  clueSummary: string;
}

export interface ActiveBeaconState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  radius: number;
  remainingTime: number;
}

export interface GameSnapshot {
  tick: number;
  timestamp: number;
  operatives: OperativeState[];
  enemies: HostileState[];
  projectiles: ProjectileState[];
  crates: LootCrateState[];
  barrels: PlasmaBarrelState[];
  terminals: TerminalState[];
  extractionPads: ExtractionPadState[];
  beacons: ActiveBeaconState[];
  bulkheadsOpen: boolean[];
  currentSector: number;
  shardsRecovered: number;
  mysteryLogs: CipherLog[];
  bossSpawned: boolean;
  bossDefeated: boolean;
  reactorStabilizationCountdown: number; // 60s -> 0
  extractionHoldTimer: number; // 0 -> 5s
  gameStatus: 'lobby' | 'playing' | 'failed' | 'victory';
  events: CombatEvent[];
}

export interface RoomInfo {
  code: string;
  hostId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'failed' | 'victory';
  players: {
    id: string;
    name: string;
    slotIndex: number;
    operativeClass: OperativeClass;
    isReady: boolean;
    isBot: boolean;
    ping: number;
  }[];
}

export interface TelemetryInspectorData {
  fps: number;
  ping: number;
  serverTickRate: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
  entityCounts: {
    operatives: number;
    enemies: number;
    projectiles: number;
    particles: number;
    decals: number;
    crates: number;
  };
  classHierarchy: {
    name: string;
    base: string;
    instances: number;
  }[];
  recentEvents: string[];
}
