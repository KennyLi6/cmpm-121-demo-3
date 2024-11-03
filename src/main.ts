// todo

import "./style.css";

const APP_NAME = "Geocoin Carrier";
const APP = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const BUTTON = document.createElement("button");
const BUTTON_TEXT = "Click me!";
BUTTON.innerHTML = BUTTON_TEXT;
BUTTON.addEventListener("click", () => alert("you clicked the button!"));
APP.append(BUTTON);
