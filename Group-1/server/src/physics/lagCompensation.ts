/**
 * Lag Compensation Ring Buffer for Authoritative Hitscan Rewind
 */

export interface EntityHistoricalSample {
  id: string;
  x: number;
  y: number;
  radius: number;
  isWeakSpotBack?: boolean;
  angle?: number;
}

export interface HistoricalSnapshot {
  timestamp: number;
  entities: Map<string, EntityHistoricalSample>;
}

export class LagCompensationBuffer {
  private history: HistoricalSnapshot[] = [];
  private maxDurationMs: number = 400; // Keep up to 400ms history

  public record(timestamp: number, sampleEntities: EntityHistoricalSample[]): void {
    const map = new Map<string, EntityHistoricalSample>();
    for (const ent of sampleEntities) {
      map.set(ent.id, ent);
    }
    this.history.push({ timestamp, entities: map });

    // Prune old samples
    const oldestAllowed = timestamp - this.maxDurationMs;
    while (this.history.length > 0 && this.history[0].timestamp < oldestAllowed) {
      this.history.shift();
    }
  }

  public getEntitiesAt(clientTimestamp: number): Map<string, EntityHistoricalSample> | null {
    if (this.history.length === 0) return null;

    // Clamp within available history
    if (clientTimestamp <= this.history[0].timestamp) {
      return this.history[0].entities;
    }
    if (clientTimestamp >= this.history[this.history.length - 1].timestamp) {
      return this.history[this.history.length - 1].entities;
    }

    // Find the two surrounding snapshots to interpolate
    let prev = this.history[0];
    let next = this.history[this.history.length - 1];

    for (let i = 0; i < this.history.length - 1; i++) {
      if (this.history[i].timestamp <= clientTimestamp && this.history[i + 1].timestamp >= clientTimestamp) {
        prev = this.history[i];
        next = this.history[i + 1];
        break;
      }
    }

    const span = next.timestamp - prev.timestamp;
    const alpha = span > 0 ? (clientTimestamp - prev.timestamp) / span : 0;

    const interpolated = new Map<string, EntityHistoricalSample>();
    for (const [id, prevSample] of prev.entities.entries()) {
      const nextSample = next.entities.get(id);
      if (nextSample) {
        interpolated.set(id, {
          id,
          x: prevSample.x + (nextSample.x - prevSample.x) * alpha,
          y: prevSample.y + (nextSample.y - prevSample.y) * alpha,
          radius: prevSample.radius,
          isWeakSpotBack: prevSample.isWeakSpotBack,
          angle: prevSample.angle !== undefined && nextSample.angle !== undefined 
            ? prevSample.angle + (nextSample.angle - prevSample.angle) * alpha 
            : prevSample.angle,
        });
      } else {
        interpolated.set(id, prevSample);
      }
    }

    return interpolated;
  }
}
