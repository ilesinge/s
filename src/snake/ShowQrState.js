import { Canvas } from "../canvas.js";
import { AppState } from "../app/AppState.js";

export class ShowQrState extends AppState {
  async onEnter() {
    this.canvas.qrcode_centered("t.ly/XhonS");
    await this.canvas.flush();
    await Canvas.wait(3000);
    await this.setState("title");
  }
}
