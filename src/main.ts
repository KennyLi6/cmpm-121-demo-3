import leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./style.css";
import luck from "./luck.ts";
import "./leafletWorkaround.ts";
import { Board } from "./board.ts";
import { Cell } from "./board.ts";

const APP_NAME = "Geocoin Carrier";
//const APP = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

interface Cache {
  cell: Cell;
  coins: Coin[];
}

interface Coin {
  cell: Cell;
  serial: number;
}

interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

class CacheMemory implements Memento<string> {
  cache: Cache;

  constructor(cache: Cache) {
    this.cache = cache;
  }

  toMemento(): string {
    return JSON.stringify(this.cache.coins);
  }

  fromMemento(memento: string): void {
    this.cache.coins = JSON.parse(memento);
  }
}

let mementos: { [key: string]: string } = {};

// thank you to phoebila for these ideas
function saveCache() {
  localCaches.forEach((cache) => {
    const key = `${cache.cell.i}:${cache.cell.j}`;
    const cacheToSave = new CacheMemory(cache);
    mementos[key] = cacheToSave.toMemento();
  });
  localStorage.setItem("mementos", JSON.stringify(mementos));
}

function restoreCache() {
  localCaches.forEach((cache) => {
    const key = `${cache.cell.i}:${cache.cell.j}`;
    const memento = mementos[key];
    if (memento) {
      const cacheToRestore = new CacheMemory(cache);
      cacheToRestore.fromMemento(memento);
    }
  });
}

const STARTING_POINT = leaflet.latLng(36.98949379578401, -122.06277128548504);
let playerLocation = STARTING_POINT;

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

let playerPoints: Coin[] = [];
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
  localStorage.setItem("inventory", JSON.stringify(playerPoints));
}

const localCaches: Cache[] = [];

function spawnCache(cell: Cell, initialized: boolean) {
  const cacheVisual = createCacheRectangle(cell);
  const cache = initializeCache(cell, initialized);
  const popupDiv = createCachePopupContent(cache);
  // Handle interactions with the cache
  cacheVisual.bindPopup(() => {
    const updateFunc = () => updateCacheUI(cache, popupDiv);
    bindPopupEvents(popupDiv, cache, updateFunc);
    return popupDiv;
  });
}

function createCacheRectangle(cell: Cell): leaflet.Rectangle {
  const bounds = GEO_BOARD.getCellBounds(cell);
  // Add a rectangle to the map to represent the cache
  const cache = leaflet.rectangle(bounds);
  cache.addTo(map);
  return cache;
}

function initializeCache(cell: Cell, initialized: boolean): Cache {
  let cache: Cache = { cell: { i: cell.i, j: cell.j }, coins: [] };
  if (!initialized) {
    // Each cache has a random point value, mutable by the player
    const pointValue = Math.floor(
      luck([cell.i, cell.j, "initialValue"].toString()) * 100,
    );

    for (let i = 0; i < pointValue; i++) {
      cache.coins.push({ cell: cell, serial: i });
    }
    localCaches.push(cache);
  } else {
    const memento = mementos[`${cell.i}:${cell.j}`];
    const detailExtraction = new CacheMemory({ cell: cell, coins: [] });
    detailExtraction.fromMemento(memento);
    cache = detailExtraction.cache;
  }
  return cache;
}

function createCachePopupContent(cache: Cache): HTMLDivElement {
  // The popup offers a description and button
  const popupDiv = document.createElement("div");
  const cacheLat = (cache.cell.i * TILE_DEGREES).toFixed(4);
  const cacheLng = (cache.cell.j * TILE_DEGREES).toFixed(4);
  const coinCount = cache.coins.length;
  popupDiv.innerHTML = `
                  <div>
                    There is a cache here at "${cacheLat},${cacheLng}". It has <span id="value">${coinCount}</span> coin(s).
                    <br><span id="topCoinText">${
    coinCount > 0
      ? `You can take coin ${cache.coins[coinCount - 1].cell.i}:${
        cache.coins[coinCount - 1].cell.j
      }#${cache.coins[coinCount - 1].serial}.`
      : `No coins available.`
  }</span>
                  </div>
                  <button id="collect">Collect</button>
                  <button id="deposit">Deposit</button>`;

  return popupDiv;
}

function bindPopupEvents(
  popupDiv: HTMLDivElement,
  cache: Cache,
  updateCacheFunc: () => void,
) {
  // Clicking the button decrements the cache's value and increments the player's points
  popupDiv
    .querySelector<HTMLButtonElement>("#collect")!
    .addEventListener("click", () => {
      if (cache.coins.length > 0) {
        const coin = cache.coins.pop();
        playerPoints.push(coin!);
        updateCacheFunc();
        updateStatusPanel();
      }
    });

  // Clicking the deposit button increments cache's value and decrements the player's points
  popupDiv
    .querySelector<HTMLButtonElement>("#deposit")!
    .addEventListener("click", () => {
      if (playerPoints.length > 0) {
        const coin = playerPoints.pop();
        cache.coins.push(coin!);
        updateCacheFunc();
        updateStatusPanel();
      }
    });
}

function updateCacheUI(cache: Cache, popupDiv: HTMLDivElement) {
  const coinCount = cache.coins.length;
  popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coinCount
    .toString();
  if (coinCount > 0) {
    const topCoin = cache.coins[coinCount - 1];
    console.log(topCoin);
    if (topCoin && typeof topCoin.serial === "number" && topCoin.serial >= 0) {
      popupDiv.querySelector<HTMLSpanElement>(
        "#topCoinText",
      )!.innerHTML =
        `You can take coin ${topCoin.cell.i}:${topCoin.cell.j}#${topCoin.serial}.`;
    } else {
      console.error("Invalid coin data detected:", topCoin);
      popupDiv.querySelector<HTMLSpanElement>("#topCoinText")!.innerHTML =
        "Error: Coin data is corrupted.";
    }
  } else {
    popupDiv.querySelector<HTMLSpanElement>("#topCoinText")!.innerHTML = ``;
  }

  const index = localCaches.findIndex(
    (c) => c.cell.i == cache.cell.i && c.cell.j == cache.cell.j,
  );
  if (index !== -1) {
    localCaches[index] = cache;
  } else {
    console.warn("Cache not found in global state:", cache);
  }

  saveCache();
}

const GEO_BOARD = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

function generateNeighborhood(point: leaflet.LatLng) {
  const NEIGHBORHOOD_CELLS: Cell[] = GEO_BOARD.getCellsNearPoint(point);
  for (const cell of NEIGHBORHOOD_CELLS) {
    if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
      let initialized = false;
      const cache = GEO_BOARD.getCellForPoint(point);
      if (cache) {
        const memento = mementos[`${cell.i}:${cell.j}`];
        if (memento) {
          initialized = true;
        }
      }
      spawnCache(cell, initialized);
    }
  }
}

const controlPanel = document.querySelector<HTMLDivElement>("#controlPanel")!;
// thank you to KeatonShawhan for this idea
controlPanel.addEventListener("click", (event) => {
  const direction = (event.target as HTMLElement).id; //gets N,S,W,E
  if (["north", "south", "west", "east"].includes(direction)) {
    movePlayer(direction as "north" | "south" | "west" | "east");
  }
});

function movePlayer(direction: "north" | "south" | "west" | "east") {
  let { lat, lng } = playerMarker.getLatLng();
  if (direction === "north") lat += TILE_DEGREES;
  if (direction === "south") lat -= TILE_DEGREES;
  if (direction === "east") lng += TILE_DEGREES;
  if (direction === "west") lng -= TILE_DEGREES;
  playerMoved(lat, lng);
}

function clearCaches() {
  map.eachLayer(function (layer: leaflet.layer) {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });
}

function playerMoved(lat: number, lng: number) {
  const event = new CustomEvent("player-moved", {
    detail: { lat, lng },
  });
  document.dispatchEvent(event);
}

document.addEventListener("player-moved", (event: Event) => {
  const customEvent = event as CustomEvent;
  const { lat, lng } = customEvent.detail;
  const previousLat = playerLocation.lat;
  const previousLng = playerLocation.lng;
  playerMarker.setLatLng([lat, lng]);
  playerLocation = leaflet.latLng(lat, lng);
  map.panTo([lat, lng]);
  localStorage.setItem("userLocation", JSON.stringify({ lat, lng }));
  clearCaches();
  generateNeighborhood(playerLocation);
  restoreCache();
  playerMarker.addTo(map);
  leaflet
    .polyline(
      [
        [previousLat, previousLng],
        [lat, lng],
      ],
      { color: "blue" },
    )
    .addTo(map);
});

// thank you brace for this logic
globalThis.onload = function () {
  const storedLocation = localStorage.getItem("userLocation");
  if (storedLocation) {
    const { lat, lng } = JSON.parse(storedLocation);
    playerLocation = leaflet.latLng(lat, lng);
    const localMementos = localStorage.getItem("mementos");
    if (localMementos) {
      const parsedMementos = JSON.parse(localMementos);
      if (Object.keys(parsedMementos).length > 0) {
        mementos = parsedMementos;
        Object.keys(mementos).forEach((key) => {
          const coords = key.split(":");
          const [lat, lng] = coords.map((numStr) => parseInt(numStr, 10));
          const value = new CacheMemory({
            cell: { i: lat, j: lng },
            coins: [],
          });
          value.fromMemento(mementos[key]);
          localCaches.push({
            cell: { i: lat, j: lng },
            coins: value.cache.coins,
          });
        });
      }
    }
    const inventory = localStorage.getItem("inventory");
    if (inventory) {
      playerPoints = JSON.parse(inventory);
      updateStatusPanel();
    }
    playerMoved(lat, lng);
  }
};

// thank you to AKris0090 for these two ideas
function onLocationFound(event: leaflet.LocationEvent) {
  const { lat, lng } = event.latlng;
  playerMoved(lat, lng);
}

function onLocationError(event: leaflet.LocationError) {
  alert(event.message);
}

map.on("locationfound", onLocationFound);
map.on("locationeroor", onLocationError);

document.getElementById("sensor")!.addEventListener("click", toggleTracking);

let playerTracking: boolean = false;

function toggleTracking() {
  playerTracking = !playerTracking;
  if (playerTracking) {
    map.locate({ setView: true, watch: playerTracking });
  } else {
    map.stopLocate();
  }
  toggleDirectionButtons();
}

function toggleDirectionButtons() {
  const buttons = document.querySelectorAll("#controlPanel button");
  buttons.forEach(function (button) {
    const b = button as HTMLButtonElement;
    if (["north", "south", "west", "east"].includes(b.id)) {
      b.disabled = !b.disabled;
    }
  });
}

const RESET_PROMPT = "I am sure!";

document.getElementById("reset")!.addEventListener("click", resetGame);

function resetGame() {
  const input = prompt(
    `Are you sure you want to reset the game? Please type "${RESET_PROMPT}"`,
  );
  if (input == RESET_PROMPT) {
    localCaches.length = 0;
    mementos = {};
    localStorage.setItem("mementos", JSON.stringify({}));
    playerPoints = [];
    localStorage.setItem("inventory", JSON.stringify([]));
    playerLocation = STARTING_POINT;
    updateStatusPanel();
    clearCaches();
    clearPolyline();
    playerMoved(STARTING_POINT.lat, STARTING_POINT.lng);
  }
}

function clearPolyline() {
  map.eachLayer(function (layer: leaflet.layer) {
    if (layer instanceof leaflet.Polyline) {
      map.removeLayer(layer);
    }
  });
}
