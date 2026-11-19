/**
 * Custom OOP Exceptions for SHARD-4: BLACKOUT PROTOCOL
 */

export class GameException extends Error {
  public readonly code: string;
  constructor(message: string, code: string = 'GAME_EXCEPTION') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OutOfAmmoException extends GameException {
  public readonly weaponName: string;
  public readonly reserveEmpty: boolean;

  constructor(weaponName: string, reserveEmpty: boolean = false) {
    super(
      reserveEmpty 
        ? `[OutOfAmmoException] Weapon ${weaponName} has depleted all reserve ammunition!`
        : `[OutOfAmmoException] Weapon ${weaponName} magazine empty. Reload required!`,
      'OUT_OF_AMMO'
    );
    this.weaponName = weaponName;
    this.reserveEmpty = reserveEmpty;
  }
}

export class RoomFullException extends GameException {
  public readonly roomCode: string;
  public readonly maxPlayers: number;

  constructor(roomCode: string, maxPlayers: number = 4) {
    super(
      `[RoomFullException] Room ${roomCode} has reached capacity (${maxPlayers} operatives). Join rejected.`,
      'ROOM_FULL'
    );
    this.roomCode = roomCode;
    this.maxPlayers = maxPlayers;
  }
}

export class InvalidCipherException extends GameException {
  public readonly shardIndex: number;
  public readonly sectorName: string;

  constructor(shardIndex: number, sectorName: string, reason: string) {
    super(
      `[InvalidCipherException] Forensic hack failed on Shard ${shardIndex} in Sector ${sectorName}: ${reason}`,
      'INVALID_CIPHER'
    );
    this.shardIndex = shardIndex;
    this.sectorName = sectorName;
  }
}
