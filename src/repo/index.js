import { App } from "../app/App.js";
import { QRState } from "./QRState.js";

export class RepoApp extends App {
  constructor(canvas, options) {
    super(canvas, options);
    const deps = { canvas: this.canvas };
    this._register("qr", new QRState(deps));
  }

  async start() {
    await this.setState("qr");
  }
}
