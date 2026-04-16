import { Canvas } from "../canvas.js";
import { AppState } from "../states/AppState.js";

export class TitleState extends AppState {
  async onEnter() {
    this.canvas.draw_sprite(await Canvas.load_png("sprites/snake/title.png"));
    await this.canvas.flush();
  }

  async onMessage(x, y, v, sid) {
    if (x >= 71 && y >= 102 && x <= 73 && y <= 104) {
      this.canvas.color_fill(9);
      await this.canvas.flush();
      await this.setState("play");
    }
  }
}
