import leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./style.css";
import luck from "./luck.ts";
import "./leafletWorkaround.ts";
import { Board } from "./board.ts";
import { Cell } from "./board.ts";

const APP_NAME = "Geocoin Carrier";
const APP = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

interface Cache {
  coins: Coin[];
}

interface Coin {
  cell: Cell;
  serial: number;
}

/*
Interfaces, Functions, and Events for later


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

const STARTING_POINT = leaflet.latLng(36.98949379578401, -122.06277128548504);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

const map = leaflet.map(document.getElementById("map")!, {
  center: STARTING_POINT,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(STARTING_POINT);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const playerPoints: Coin[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No coins yet...";

function updateStatusPanel() {
  statusPanel.innerHTML = `${playerPoints.length} points accumulated`;
  if (playerPoints.length > 0) {
    statusPanel.innerHTML += `<br>Coins in inventory:`;
  }
  for (const coin of playerPoints) {
    statusPanel.innerHTML += `
      <br>${coin.cell.i}:${coin.cell.j}#${coin.serial}.
      `;
  }
}

function spawnCache(cell: Cell) {
  const bounds = GEO_BOARD.getCellBounds(cell);
  // Add a rectangle to the map to represent the cache
  const cache = leaflet.rectangle(bounds);
  cache.addTo(map);

  // Handle interactions with the cache
  cache.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    const pointValue = Math.floor(
      luck([cell.i, cell.j, "initialValue"].toString()) * 100,
    );

    const customDetails: Cache = { coins: [] };
    for (let i = 0; i < pointValue; i++) {
      customDetails.coins.push({ cell: cell, serial: i });
    }

    cache.cacheDetail = customDetails;
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    const cacheLat = (cell.i * TILE_DEGREES).toFixed(4);
    const cacheLng = (cell.j * TILE_DEGREES).toFixed(4);
    popupDiv.innerHTML = `
                  <div>There is a cache here at "${cacheLat},${cacheLng}". It has value <span id="value">${cache.cacheDetail.coins.length}</span>.</div>
                  <button id="collect">collect</button>
                  <button id="deposit">deposit</button>`;

    function updateCache() {
      popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache
        .cacheDetail.coins.length.toString();
    }

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (cache.cacheDetail.coins.length > 0) {
          playerPoints.push(cache.cacheDetail.coins.pop());
          updateCache();
          updateStatusPanel();
          cache.bindPopup();
        }
      });

    // Clicking the deposit button increments cache's value and decrements the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerPoints.length > 0) {
          cache.cacheDetail.coins.push(playerPoints.pop());
          updateCache();
          updateStatusPanel();
        }
      });

    return popupDiv;
  });
}

const GEO_BOARD = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const NEIGHBORHOOD_CELLS: Cell[] = GEO_BOARD.getCellsNearPoint(STARTING_POINT);
let count = 0;
for (const cell of NEIGHBORHOOD_CELLS) {
  count++;
  if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
    spawnCache(cell);
  }
}

const BUTTON = document.createElement("button");
const BUTTON_TEXT = "Click me!";
BUTTON.innerHTML = BUTTON_TEXT;
BUTTON.addEventListener("click", () => alert("you clicked the button!"));
APP.append(BUTTON);
