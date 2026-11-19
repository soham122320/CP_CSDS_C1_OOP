# SHARD-4: BLACKOUT PROTOCOL
### 4-Player Real-Time Co-Op Tactical Shooter & Forensic Mystery

An authoritative, real-time tactical shooter and cyber-forensic mystery game that runs in modern browsers across laptops and mobile phones simultaneously.

# Team Members
1) Omkar Panhale - 2040302
2) Akbar Pathan - 2040305
3) Manish PAtil - 2040307
4)Shrinivas Pawar - 204010

---

## 1. Quick Start / How to Run

### Install Dependencies
```bash
npm install
```

### Launch Server + Client (Single Command)
```bash
npm run dev
```

The game server will boot on `0.0.0.0:3001` and the Vite client on `http://0.0.0.0:5173`.
The console will display:
- **Local Host URL**: `http://localhost:5173`
- **Mobile/LAN URL**: `http://192.168.x.x:5173` (your active LAN IP)

---

## 2. How to Join From Phones on the Same Wi-Fi

1. Ensure your phone and host PC are connected to the **same Wi-Fi network**.
2. Open the browser (Chrome, Safari, Firefox, Edge) on your phone.
3. Navigate to the **Mobile/LAN URL** displayed in the server terminal or in the Lobby screen banner (e.g. `http://192.168.x.x:5173`).
4. Enter your Operative Name, choose your Class, and enter the **4-Character Room Code** shown on the host's screen (e.g., `EREB`).
5. Tap **JOIN ROOM**!

---

## 3. Game Vision & Story Premise: "The Erebus Sabotage"

Four Cyber-Forensic Operatives infiltrate **Station Erebus**, a subterranean research facility plunged into darkness by an emergency Blackout Protocol. Rogue synthetic defenses have slaughtered the station personnel.

Your squad must:
1. Fight through 4 interconnected sectors:
   - **Sector A: Reactor Ring**
   - **Sector B: Crew Quarters**
   - **Sector C: Data Archives**
   - **Sector D: Security Core**
2. Infiltrate Forensic Terminals and decode **4 Cipher Shards** (hold `[E]`) while defending against ambush swarms.
3. Uncover the culprit behind the sabotage: **Chief Systems Architect Dr. Maya Vance**, who initiated the blackout with forged credentials to conceal a bio-matrix theft and deliver the Core Warden synthetic neural core to Off-World Syndicate Helios Corp.
4. Penetrate the Central Vault blast doors and defeat the **Core Warden** (3-phase monolithic boss).
5. Trigger the **60-second reactor stabilization evacuation** and hold all **4 Extraction Sync Pads** simultaneously for 5 seconds to secure the definitive ending!

---

## 4. Controls Cheat Sheet

### Desktop Keyboard & Mouse
| Input | Action |
|---|---|
| **W, A, S, D** | Move Operative |
| **Mouse Cursor** | Aim weapon (Operative smoothly rotates towards aim) |
| **Left Click** | Fire active weapon |
| **Shift (Hold)** | Sprint (drains stamina, widens dynamic crosshair) |
| **Space** | Dodge-Roll (0.28s burst at 3.2x speed, i-frames) |
| **C (Toggle)** | Crouch / Cover Peek (-40% spread, -45% speed, smaller hitbox) |
| **R** | Reload weapon |
| **Q** | Class Signature Skill (20s cooldown) |
| **G** | Throw Grenade (Frag AoE / EMP Synth Stun) |
| **E (Hold)** | Interact / Hack Forensic Terminals / Revive Downed Teammates |
| **1 / 2** | Switch between Primary Weapon & P-45 Sidearm |
| **Tab** | Open Forensic Evidence Journal (review decoded clues) |
| **F2** | Toggle OOP & Telemetry Inspector Drawer |
| **Esc** | Close active modals / Settings |

### Mobile Touch Controls
| Control | Action |
|---|---|
| **Left Joystick** | Analog movement direction (push to edge to sprint) |
| **Right Joystick** | 360° aim direction + auto-fire on drag |
| **DODGE Button** | Dodge-roll burst with haptic feedback |
| **SKILL Button [Q]** | Trigger class tactical ability |
| **HACK / REVIVE [E]** | Hack Forensic Terminals / Revive downed squadmates |
| **GRENADE [G]** | Throw Frag / EMP grenade |
| **RELOAD [R]** | Reload active weapon |
| **CROUCH [C]** | Toggle crouching stance |
| **SWAP [1/2]** | Cycle between primary weapon and backup sidearm |

---

## 5. Operative Classes (Polymorphic Specializations)

- **Vanguard (Tank, 140 HP)**
  - *Weapon*: MK-IV Pulse Rifle (RapidProjectile, 30 mag, 18 dmg)
  - *Skill (`Q`)*: **Aegis Riot Shield** — Deploys a directional energy barrier for 6s that blocks enemy bullets while teammates shoot through.
- **Phantom (Recon, 90 HP)**
  - *Weapon*: Rail-X Sniper (HitscanRay, 3-enemy pierce, 3x weak-spot crit)
  - *Skill (`Q`)*: **Active Camo** — Invisibility for 8s (hostiles de-aggro) + guaranteed 2x crit damage on next hit.
- **Breacher (CQC, 120 HP)**
  - *Weapon*: SG-12 Breach Shotgun (PelletSpread, 8 pellets, heavy knockback)
  - *Skill (`Q`)*: **Cluster Breaker** — Launches 5 cluster EMP/Frag grenades that shred armor and stun synthesizers.
- **Medic (Support, 100 HP)**
  - *Weapon*: Viper-9 SMG (RapidProjectile, 40 mag, high RPM, tight sprint spread)
  - *Skill (`Q`)*: **Nano-Heal Beacon** — Drops an 8s AoE healing & ammo recharge zone.
  - *Passive*: Hacks forensic terminals and revives teammates 2x faster (1.5s vs 3.0s).

---

## 6. Technical Architecture & OOP Highlights

- **Server Authoritative (30 Hz)**: Full simulation of movement, collisions, weapons, enemies, loot, and objectives. Clients send only input packets with sequence IDs.
- **Client Prediction & Reconciliation**: Zero-latency local movement with replay of unacknowledged sequence packets.
- **Entity Snapshot Interpolation**: ~100ms render buffer with lerp/slerp for buttery-smooth remote movement.
- **Lag Compensation**: Historical ring buffer (~200ms) rewinding target hitboxes for Rail-X sniper hitscan validation.
- **Zero Asset Downloads**: All visual rendering is 100% procedural HTML5 Canvas 2D; all audio is 100% procedural Web Audio API nodes (oscillators, noise buffers, biquad filters, and multi-stem adaptive synth tension soundtrack).
- **Inspector Drawer (`F2`)**: Displays the live polymorphic class hierarchy (`GameEntity`, `Operative`, `HostileUnit`, `Weapon`), active entity counts, tick rates, and bandwidth.
