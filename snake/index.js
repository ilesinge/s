import { App } from "../App.js";
import { TitleState } from "./TitleState.js";
import { PlayState } from "./PlayState.js";
import { GameOverState } from "./GameOverState.js";
import { ShowQrState } from "./ShowQrState.js";

export class SnakeApp extends App {
  constructor(deps) {
    super(deps);
    const stateDeps = {
      canvas: this.canvas,
      setState: (name) => this.setState(name),
    };
    this._register("title", new TitleState(stateDeps));
    this._register("play", new PlayState(stateDeps));
    this._register("game_over", new GameOverState(stateDeps));
    this._register("show_qr", new ShowQrState(stateDeps));
  }

  async start() {
    await this.setState("title");
  }
}
