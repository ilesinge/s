import { AppState } from "../app/AppState.js";
import { GameObject } from "../scene/GameObject.js";
import { SCREEN_SIZE } from "../canvas.js";
import { GridDrawable } from "./GridDrawable.js";

const PLAY_TIME = 60000;
const STEP_INTERVAL = 500;

class ProgressBarDrawable extends GameObject {
  #getRemaining;

  constructor(getRemaining) {
    super();
    this.#getRemaining = getRemaining;
  }

  draw(buf, width) {
    const filled = Math.round(SCREEN_SIZE * this.#getRemaining());
    for (let x = 0; x < SCREEN_SIZE; x++) buf[x] = x < filled ? 0 : 9;
  }
}

export class PlayState extends AppState {
  #elapsed = 0;
  #stepAccumulator = 0;
  #done = false;

  async onEnter() {
    this.#elapsed = 0;
    this.#stepAccumulator = 0;
    this.#done = false;
    this.app.grid.fill(false);
    this.add(new GridDrawable(this.app.grid));
    this.add(
      new ProgressBarDrawable(() => Math.max(0, 1 - this.#elapsed / PLAY_TIME)),
    );

    await this.render();
  }

  onUpdate(dt) {
    if (this.#done) return;
    this.#elapsed += dt;
    if (this.#elapsed >= PLAY_TIME) {
      this.#done = true;
      this.setState("title");
      return;
    }
    this.#stepAccumulator += dt;
    if (this.#stepAccumulator >= STEP_INTERVAL) {
      this.#stepAccumulator = 0;
      this.#doStep();
    }
  }

  onMessage(x, y, v, sid) {
    if (y === 0) return;
    const idx = y * SCREEN_SIZE + x;
    this.app.grid[idx] = !this.app.grid[idx];
  }

  #doStep() {
    const grid = this.app.grid;
    const next = new Array(SCREEN_SIZE * SCREEN_SIZE);
    for (let y = 0; y < SCREEN_SIZE; y++) {
      for (let x = 0; x < SCREEN_SIZE; x++) {
        const alive = grid[y * SCREEN_SIZE + x];
        const n = this.#countNeighbors(grid, x, y);
        next[y * SCREEN_SIZE + x] = alive ? n === 2 || n === 3 : n === 3;
      }
    }
    for (let i = 0; i < next.length; i++) grid[i] = next[i];
  }

  #countNeighbors(grid, x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = (x + dx + SCREEN_SIZE) % SCREEN_SIZE;
        const ny = (y + dy + SCREEN_SIZE) % SCREEN_SIZE;
        if (grid[ny * SCREEN_SIZE + nx]) count++;
      }
    }
    return count;
  }
}
