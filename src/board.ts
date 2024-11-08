import leaflet from "leaflet";

interface Cell {
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
    const cellCheck = this.knownCells.get(key);
    if (!cellCheck) {
      this.knownCells.set(key, cell);
    }
    return cellCheck!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const cell: Cell = {
      i: point.lat,
      j: point.lng,
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
