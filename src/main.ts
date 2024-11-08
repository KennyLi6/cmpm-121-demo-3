import leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./style.css";
import luck from "./luck.ts";
import "./leafletWorkaround.ts";
//import { Board } from "./board.ts";

const APP_NAME = "Geocoin Carrier";
const APP = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

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

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
//const MAP_ORIGIN = leaflet.latLng(0, 0);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
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

const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [
      origin.lat + (i + 1) * TILE_DEGREES,
      origin.lng + (j + 1) * TILE_DEGREES,
    ],
  ]);

  // Add a rectangle to the map to represent the cache
  const cache = leaflet.rectangle(bounds);
  cache.addTo(map);

  // Handle interactions with the cache
  cache.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    const pointValue = Math.floor(
      luck([i, j, "initialValue"].toString()) * 100,
    );
    const customDetails: Cache = {
      coins: pointValue,
    };
    cache.cacheDetail = customDetails;
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                  <div>There is a cache here at "${i},${j}". It has value <span id="value">${cache.cacheDetail.coins}</span>.</div>
                  <button id="collect">collect</button>
                  <button id="deposit">deposit</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (cache.cacheDetail.coins > 0) {
          cache.cacheDetail.coins--;
          popupDiv.querySelector<HTMLSpanElement>(
            "#value",
          )!.innerHTML = cache.cacheDetail.coins.toString();
          playerPoints++;
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
          cache.bindPopup();
        }
      });

    // Clicking the deposit button increments cache's value and decrements the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerPoints > 0) {
          playerPoints--;
          cache.cacheDetail.coins++;
          popupDiv.querySelector<HTMLSpanElement>(
            "#value",
          )!.innerHTML = cache.cacheDetail.coins.toString();
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
        }
      });

    return popupDiv;
  });
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}

const BUTTON = document.createElement("button");
const BUTTON_TEXT = "Click me!";
BUTTON.innerHTML = BUTTON_TEXT;
BUTTON.addEventListener("click", () => alert("you clicked the button!"));
APP.append(BUTTON);
