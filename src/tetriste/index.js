import { App } from "../app/App.js";
import { SCREEN_SIZE } from "../canvas.js";
import { TitleState } from "./TitleState.js";
import { PlayState } from "./PlayState.js";
import { GameOverState } from "./GameOverState.js";

export class TetristeApp extends App {
  grid = new Array(SCREEN_SIZE * SCREEN_SIZE).fill(false);

  constructor(canvas, options) {
    super(canvas, options);
    const deps = { canvas: this.canvas };
    this._register("title", new TitleState(deps));
    this._register("play", new PlayState(deps));
    this._register("gameover", new GameOverState(deps));
  }

  async start() {
    await this.setState("title");
  }
}
