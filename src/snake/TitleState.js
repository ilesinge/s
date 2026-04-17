import { Canvas } from "../canvas.js";
import { AppState } from "../app/AppState.js";

export class TitleState extends AppState {
  async onEnter() {
    this.canvas.draw_sprite(await Canvas.load_png("sprites/snake/title.png"));
    await this.canvas.flush();
  }

  async onMessage(x, y, v, sid) {
    if (x >= 6 && y >= 23 && x <= 25 && y <= 29) {
      this.canvas.color_fill(9);
      await this.canvas.flush();
      await this.setState("play");
    }
  }
}
