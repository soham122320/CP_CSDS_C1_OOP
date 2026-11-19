/**
 * 2D Spatial Hash Grid for high-performance broad-phase collision detection
 */

export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  radius: number;
  data: any;
}

export class SpatialHashGrid {
  private cellSize: number;
  private cells: Map<string, SpatialItem[]> = new Map();

  constructor(cellSize: number = 96) {
    this.cellSize = cellSize;
  }

  public clear(): void {
    this.cells.clear();
  }

  private getKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  public insert(item: SpatialItem): void {
    const minCx = Math.floor((item.x - item.radius) / this.cellSize);
    const maxCx = Math.floor((item.x + item.radius) / this.cellSize);
    const minCy = Math.floor((item.y - item.radius) / this.cellSize);
    const maxCy = Math.floor((item.y + item.radius) / this.cellSize);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = this.getKey(cx, cy);
        let list = this.cells.get(key);
        if (!list) {
          list = [];
          this.cells.set(key, list);
        }
        list.push(item);
      }
    }
  }

  public query(x: number, y: number, radius: number): SpatialItem[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    const results: SpatialItem[] = [];
    const seen = new Set<string>();

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const list = this.cells.get(this.getKey(cx, cy));
        if (list) {
          for (const item of list) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              const dx = item.x - x;
              const dy = item.y - y;
              const distSq = dx * dx + dy * dy;
              const radSum = radius + item.radius;
              if (distSq <= radSum * radSum) {
                results.push(item);
              }
            }
          }
        }
      }
    }

    return results;
  }
}
