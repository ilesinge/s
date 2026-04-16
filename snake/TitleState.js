import { Canvas } from "../canvas.js";
import { AppState } from "../states/AppState.js";

export class TitleState extends AppState {
  async onEnter() {
    this.canvas.draw_sprite(await Canvas.load_png("sprites/snake/title.png"));
    await this.canvas.flush();
  }

  async onMessage(x, y, v, sid) {
    if (x >= 27 && y >= 26 && x <= 29 && y <= 28) {
      this.canvas.color_fill(9);
      await this.canvas.flush();
      await this.setState("play");
    }
  }
}
