import { AppState } from "../app/AppState.js";
import { GameObject } from "../scene/GameObject.js";
import { SCREEN_SIZE } from "../canvas.js";
import { GridDrawable } from "./GridDrawable.js";

const DRAW_TIME = 30000;

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

export class DrawState extends AppState {
  #elapsed = 0;
  #done = false;

  async onEnter() {
    this.#elapsed = 0;
    this.#done = false;
    this.app.grid.fill(false);
    this.add(new GridDrawable(this.app.grid));
    this.add(
      new ProgressBarDrawable(() => Math.max(0, 1 - this.#elapsed / DRAW_TIME)),
    );

    await this.render();
  }

  onUpdate(dt) {
    if (this.#done) return;
    this.#elapsed += dt;
    if (this.#elapsed >= DRAW_TIME) {
      this.#done = true;
      this.setState("simulate");
    }
  }

  onMessage(x, y, v, sid) {
    if (y === 0) return;
    const idx = y * SCREEN_SIZE + x;
    this.app.grid[idx] = !this.app.grid[idx];
  }
}
