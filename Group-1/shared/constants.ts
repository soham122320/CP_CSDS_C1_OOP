/**
 * Core Physics, Movement, Combat and Network Tuning Constants
 * for SHARD-4: BLACKOUT PROTOCOL
 */

export const CONSTANTS = {
  // Network & Tick Rates
  SERVER_TICK_RATE: 30, // 30 ticks per second authoritative
  SERVER_TICK_INTERVAL_MS: 1000 / 30,
  CLIENT_INTERPOLATION_OFFSET_MS: 100, // 100ms render buffer
  MAX_PREDICTION_ERROR_SQ: 36, // 6px snapping threshold
  RECONNECT_GRACE_PERIOD_SEC: 60, // 60s reconnection window

  // Movement Physics (px/s)
  SPEED: {
    WALK: 280,
    SPRINT_MULTIPLIER: 1.5, // 420 px/s
    CROUCH_MULTIPLIER: 0.55, // 154 px/s
    DOWNED_CRAWL: 60, // 60 px/s crawl when DBNO
    ACCELERATION_TIME: 0.08, // crisp response
    DECELERATION_TIME: 0.05, // crisp deceleration
  },

  // Stamina System
  STAMINA: {
    MAX: 100,
    SPRINT_DRAIN_PER_SEC: 22,
    REGEN_PER_SEC: 18,
    REGEN_DELAY_SEC: 0.8,
    MIN_TO_START_SPRINT: 25, // Lockout recovery target
    EXHAUSTION_THRESHOLD: 5, // Triggers lockout
  },

  // Dodge-Roll Physics
  DODGE: {
    COST: 35,
    BURST_DURATION_SEC: 0.28,
    SPEED_MULTIPLIER: 3.2, // ~704 px/s burst
    IFRAME_DURATION_SEC: 0.25,
    COOLDOWN_SEC: 0.9,
  },

  // Crouch Modifiers
  CROUCH: {
    SPREAD_MODIFIER: 0.6, // -40% bullet spread
    SPEED_MODIFIER: 0.55, // -45% movement speed
    HITBOX_RADIUS_MODIFIER: 0.8, // 20% smaller hitbox
    FOOTSTEP_VOLUME_MODIFIER: 0.25,
  },

  // Revive & DBNO
  DBNO: {
    BLEEDOUT_TIME_SEC: 25,
    REVIVE_TIME_STANDARD_SEC: 3.0,
    REVIVE_TIME_MEDIC_SEC: 1.5,
    REVIVED_HP_PERCENT: 0.4, // Revived at 40% HP
    REVIVED_IFRAME_SEC: 2.0,
    DOWNED_WEAPON_DAMAGE_MODIFIER: 0.4, // Weak P-45 fire
  },

  // Operative Base Stats
  OPERATIVES: {
    VANGUARD: {
      NAME: 'Vanguard',
      ROLE: 'Tank',
      MAX_HP: 140,
      COLOR: '#38bdf8', // Neon Sky Blue
      SKILL_NAME: 'Aegis Riot Shield',
      SKILL_COOLDOWN_SEC: 20,
      SHIELD_DURATION_SEC: 6,
      SHIELD_ARC_RAD: Math.PI * 0.55, // ~100 degree frontal barrier
      SHIELD_RADIUS: 52,
    },
    PHANTOM: {
      NAME: 'Phantom',
      ROLE: 'Recon',
      MAX_HP: 90,
      COLOR: '#c084fc', // Neon Purple
      SKILL_NAME: 'Active Camo',
      SKILL_COOLDOWN_SEC: 20,
      CAMO_DURATION_SEC: 8,
      CRIT_BONUS_MULTIPLIER: 2.0, // 2x crit on first shot
    },
    BREACHER: {
      NAME: 'Breacher',
      ROLE: 'CQC / Demolitions',
      MAX_HP: 120,
      COLOR: '#f97316', // Neon Orange
      SKILL_NAME: 'Cluster Breaker',
      SKILL_COOLDOWN_SEC: 20,
      CLUSTER_COUNT: 5,
    },
    MEDIC: {
      NAME: 'Medic',
      ROLE: 'Support',
      MAX_HP: 100,
      COLOR: '#34d399', // Neon Emerald
      SKILL_NAME: 'Nano-Heal Beacon',
      SKILL_COOLDOWN_SEC: 20,
      BEACON_DURATION_SEC: 8,
      BEACON_RADIUS: 140,
      BEACON_HEAL_PER_SEC: 14,
      HACK_SPEED_MULTIPLIER: 2.0,
    },
  },

  // Grenades
  GRENADES: {
    STARTING_COUNT: 2,
    MAX_COUNT: 4,
    FUSE_SEC: 1.4,
    FRAG: {
      RADIUS: 150,
      DAMAGE: 160,
    },
    EMP: {
      RADIUS: 180,
      STUN_DURATION_SEC: 3.5,
      SHIELD_STRIP: true,
    },
  },

  // Combat Props & Interactive
  PROPS: {
    BARREL_HP: 25,
    BARREL_EXPLOSION_RADIUS: 160,
    BARREL_EXPLOSION_DAMAGE: 180,
    CHAIN_REACTION_DELAY_SEC: 0.12,
  },

  // World & Grid
  TILE_SIZE: 48,
  MAP_WIDTH_TILES: 80,
  MAP_HEIGHT_TILES: 60,

  // Lighting & Vision
  LIGHTING: {
    FLASHLIGHT_FOV_DEG: 70,
    FLASHLIGHT_RANGE: 480,
    PLAYER_GLOW_RADIUS: 280,
    AMBIENT_DARKNESS: 0.45, // Soft atmospheric darkness
    EMERGENCY_RED_DARKNESS: 0.50,
  },

  // Extraction & Evacuation
  EXTRACTION: {
    HOLD_TIME_SEC: 5.0,
    REACTOR_COUNTDOWN_SEC: 60.0,
  },
} as const;
