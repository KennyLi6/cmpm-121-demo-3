import leaflet from "leaflet";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell); //took this idea from KeatonShawhan
    }
    return this.knownCells.get(key)!;
  }

  //took division idea from Justin-Lam
  getCellForPoint(point: leaflet.LatLng): Cell {
    const cell: Cell = {
      i: Math.trunc(point.lat / this.tileWidth),
      j: Math.trunc(point.lng / this.tileWidth),
    };
    return this.getCanonicalCell(cell);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const tileWidth = this.tileWidth;
    const cellBox = leaflet.latLngBounds([
      [cell.i * tileWidth, cell.j * tileWidth],
      [(cell.i + 1) * tileWidth, (cell.j + 1) * tileWidth],
    ]);
    return cellBox;
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    const visibilityRadius = this.tileVisibilityRadius;
    const originLat = originCell.i;
    const originLng = originCell.j;
    for (
      let i = originLat - visibilityRadius;
      i < originLat + visibilityRadius;
      i++
    ) {
      for (
        let j = originLng - visibilityRadius;
        j < originLng + visibilityRadius;
        j++
      ) {
        const pointCell = { i: i, j: j };
        resultCells.push(this.getCanonicalCell(pointCell));
      }
    }
    return resultCells;
  }
}
