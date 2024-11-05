import leaflet from "leaflet";

import "./style.css";

// Work around bug in Leaflet (https://github.com/Leaflet/Leaflet/issues/4968)
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (leaflet.Icon.Default.prototype as unknown as { _getIconUrl: unknown })
  ._getIconUrl;
leaflet.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const APP_NAME = "Geocoin Carrier";
const APP = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

interface Cell {
  readonly i: number;
  readonly j: number;
}

interface Cache {
  coins: number;
}

/*
Interfaces, Functions, and Events for later
interface Coin {
  cell: Cell;
  serial: number;
}

function collect(coin: Coin, cell: Cell) {
    if (!cell) { return; }

}

function deposit(coin: Coin, cell: Cell) {
    if (!cell) { return; }
}

const updateCache = new CustomEvent("cache-updated");
const playerMoved = new CustomEvent("player-moved", {
    detail: {movement}
});
const inventoryChanged = new CustomEvent("player-inventory-changed", {
    detail: {item}
})
*/

const BUTTON = document.createElement("button");
const BUTTON_TEXT = "Click me!";
BUTTON.innerHTML = BUTTON_TEXT;
BUTTON.addEventListener("click", () => alert("you clicked the button!"));
APP.append(BUTTON);
