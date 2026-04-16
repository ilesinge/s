import readline from "readline";

import { Canvas } from "./canvas.js";
import { SnakeApp } from "./snake/index.js";

const canvas = new Canvas();
const snake = new SnakeApp({ canvas });

await canvas.connect(({ x, y, c, sid }) => snake.onMessage(x, y, c, sid));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function input(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main_loop() {
  while (true) {
    console.log("--- Menu ---");
    console.log("c: clear");
    console.log("qr: qrcode");
    console.log("dqr: double qrcode");
    console.log("push: push state");
    console.log("pop: restore state");
    console.log("sprite: draw a sprite");
    console.log("snake: play snake");
    console.log("q: quit");
    const choice = await input(": ");

    if (choice === "q") break;

    if (choice === "c") canvas.color_fill(0);
    if (choice === "qr") canvas.qrcode(await input("QRCode content: "));
    if (choice === "dqr") canvas.doubleqrcode(await input("QRCode content: "));
    if (choice === "push") canvas.push_state();

    if (choice === "pop") {
      const state = canvas.pop_state();
      canvas.conform_state(state);
    }

    if (choice === "sprite") {
      const name = await input("Sprite name: ");
      canvas.draw_sprite(await Canvas.load_png(`sprites/${name}.png`));
    }

    if (choice === "snake") await snake.start();
  }
}

await main_loop();
rl.close();
await canvas.close();
