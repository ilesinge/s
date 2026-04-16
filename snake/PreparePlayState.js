import { AppState } from "../states/AppState.js";

export class PreparePlayState extends AppState {
  async onEnter() {
    this.canvas.lock();
    this.canvas.color_fill(9);
    await this.setState("play");
  }
}
