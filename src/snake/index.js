import { App } from "../app/App.js";
import { TitleState } from "./TitleState.js";
import { PlayState } from "./PlayState.js";
import { GameOverState } from "./GameOverState.js";
import { ShowQrState } from "./ShowQrState.js";

export class SnakeApp extends App {
  constructor(canvas, options, vsmode = false) {
    super(canvas, options);
    this.vsmode = vsmode;

    this._register("title", new TitleState());
    this._register("play", new PlayState());
    this._register("game_over", new GameOverState());
    this._register("show_qr", new ShowQrState());
  }

  async start() {
    await this.setState("title");
  }
}
