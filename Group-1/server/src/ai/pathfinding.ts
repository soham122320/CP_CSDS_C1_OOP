/**
 * Grid A* Pathfinding with Line-of-Sight Raycasting
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { CONSTANTS } from '@shared/constants.js';
import { TILE_EMPTY, TILE_COVER, TILE_WALL } from '@shared/mapData.js';

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class PathfindingGrid {
  private width: number;
  private height: number;
  private tileSize: number;
  private grid: number[][];
  private bulkheadsOpen: boolean[];
  public shardsRecovered: number = 0;

  constructor(grid: number[][], tileSize: number = CONSTANTS.TILE_SIZE) {
    this.grid = grid;
    this.height = grid.length;
    this.width = grid[0].length;
    this.tileSize = tileSize;
    this.bulkheadsOpen = [false, false, false, false];
    this.shardsRecovered = 0;
  }

  public setBulkheads(bulkheads: boolean[], shardsRecovered: number = 0): void {
    this.bulkheadsOpen = bulkheads;
    this.shardsRecovered = shardsRecovered;
  }

  public isWalkableTile(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
    const tile = this.grid[ty][tx];
    if (tile === TILE_EMPTY || tile === TILE_COVER) return true;
    // Door 1 (Room 1 -> Room 2): opens when shardsDecoded >= 1 (bulkheadsOpen[0])
    if (tile === 3 && (this.bulkheadsOpen[0] || this.shardsRecovered >= 1)) return true;
    // Door 2 (Room 2 -> Room 3): opens when shardsDecoded >= 2 (bulkheadsOpen[1])
    if (tile === 4 && (this.bulkheadsOpen[1] || this.shardsRecovered >= 2)) return true;
    // Door 3 (Room 3 -> Room 4): opens when shardsDecoded >= 3 (bulkheadsOpen[2])
    if (tile === 5 && (this.bulkheadsOpen[2] || this.shardsRecovered >= 3)) return true;
    // Final Boss Vault Door (Room 4 -> Vault): opens when shardsDecoded >= 4 (bulkheadsOpen[3])
    if (tile === 6 && (this.bulkheadsOpen[3] || this.shardsRecovered >= 4)) return true;
    return false;
  }

  public hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const step = this.tileSize * 0.4;
    const steps = Math.ceil(distance / step);

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const tx = Math.floor(px / this.tileSize);
      const ty = Math.floor(py / this.tileSize);
      if (!this.isWalkableTile(tx, ty)) {
        return false;
      }
    }
    return true;
  }

  public findPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
  ): { x: number; y: number }[] {
    // If direct line of sight exists, bypass A* for instant pathing
    if (this.hasLineOfSight(startX, startY, targetX, targetY)) {
      return [{ x: targetX, y: targetY }];
    }

    const startTx = Math.floor(startX / this.tileSize);
    const startTy = Math.floor(startY / this.tileSize);
    const targetTx = Math.floor(targetX / this.tileSize);
    const targetTy = Math.floor(targetY / this.tileSize);

    if (startTx === targetTx && startTy === targetTy) {
      return [{ x: targetX, y: targetY }];
    }

    const openList: AStarNode[] = [];
    const closedSet = new Set<number>();
    const nodeMap = new Map<number, AStarNode>();

    const getKey = (tx: number, ty: number) => ty * this.width + tx;

    const startNode: AStarNode = {
      x: startTx,
      y: startTy,
      g: 0,
      h: Math.hypot(targetTx - startTx, targetTy - startTy),
      f: Math.hypot(targetTx - startTx, targetTy - startTy),
      parent: null,
    };

    openList.push(startNode);
    nodeMap.set(getKey(startTx, startTy), startNode);

    const neighbors = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      // Diagonals
      { dx: 1, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: -1 },
    ];

    let iterations = 0;
    const maxIterations = 500; // Strict cap of 500 steps prevents any possible thread lock

    while (openList.length > 0 && iterations++ < maxIterations) {
      // Find lowest f in open list
      let lowestIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIdx].f) {
          lowestIdx = i;
        }
      }

      const current = openList.splice(lowestIdx, 1)[0];
      const currentKey = getKey(current.x, current.y);
      closedSet.add(currentKey);

      // Check if reached destination or adjacent
      if (current.x === targetTx && current.y === targetTy) {
        return this.reconstructPath(current, targetX, targetY);
      }

      for (const offset of neighbors) {
        const nx = current.x + offset.dx;
        const ny = current.y + offset.dy;
        const nKey = getKey(nx, ny);

        if (closedSet.has(nKey) || !this.isWalkableTile(nx, ny)) {
          continue;
        }

        // Prevent diagonal cutting through corner walls
        if (offset.dx !== 0 && offset.dy !== 0) {
          if (!this.isWalkableTile(current.x + offset.dx, current.y) ||
              !this.isWalkableTile(current.x, current.y + offset.dy)) {
            continue;
          }
        }

        const moveCost = (offset.dx !== 0 && offset.dy !== 0) ? 1.414 : 1.0;
        const tentativeG = current.g + moveCost;

        let neighborNode = nodeMap.get(nKey);
        if (!neighborNode) {
          const h = Math.hypot(targetTx - nx, targetTy - ny);
          neighborNode = {
            x: nx,
            y: ny,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current,
          };
          nodeMap.set(nKey, neighborNode);
          openList.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.f = tentativeG + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    // Fallback direct target
    return [{ x: targetX, y: targetY }];
  }

  private reconstructPath(endNode: AStarNode, targetX: number, targetY: number): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let curr: AStarNode | null = endNode;
    let safetyCap = 0;
    while (curr && curr.parent && safetyCap++ < 500) {
      path.push({
        x: curr.x * this.tileSize + this.tileSize * 0.5,
        y: curr.y * this.tileSize + this.tileSize * 0.5,
      });
      curr = curr.parent;
    }
    path.reverse();
    path.push({ x: targetX, y: targetY });
    return path;
  }
}
