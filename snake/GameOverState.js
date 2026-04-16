import { Canvas } from "../canvas.js";
import { AppState } from "../states/AppState.js";

export class GameOverState extends AppState {
  async onEnter() {
    this.canvas.draw_sprite(
      await Canvas.load_png("sprites/snake/game-over.png"),
    );
    await this.canvas.flush();
    await Canvas.wait(5000);
    await this.setState("show_qr");
  }
}
