import { Canvas } from "../canvas.js";
import { AppState } from "../app/AppState.js";
import { Sprite } from "../scene/Sprite.js";
import { Button } from "../scene/Button.js";

const TETROMINOS = [
  { name: "bar", color: 4, nextSprite: "sprites/tetriste/next-tetromino1.png" },
  { name: "T", color: 3, nextSprite: "sprites/tetriste/next-tetromino2.png" },
  {
    name: "square",
    color: 10,
    nextSprite: "sprites/tetriste/next-tetromino3.png",
  },
  { name: "Z", color: 6, nextSprite: "sprites/tetriste/next-tetromino4.png" },
  { name: "S", color: 5, nextSprite: "sprites/tetriste/next-tetromino5.png" },
  { name: "L", color: 7, nextSprite: "sprites/tetriste/next-tetromino6.png" },
  {
    name: "invertedL",
    color: 2,
    nextSprite: "sprites/tetriste/next-tetromino7.png",
  },
];

export class PlayState extends AppState {
  async onEnter() {
    this.add(
      new Sprite(0, 0, await Canvas.load_png("sprites/tetriste/game.png")),
    );

    this.add(
      new Button(
        9,
        27,
        await Canvas.load_png("sprites/tetriste/buttons1.png"),
        () => this.onLeftButton(),
      ),
    );

    this.add(
      new Button(
        14,
        22,
        await Canvas.load_png("sprites/tetriste/buttons2.png"),
        () => this.onUpButton(),
      ),
    );

    this.add(
      new Button(
        19,
        27,
        await Canvas.load_png("sprites/tetriste/buttons3.png"),
        () => this.onRightButton(),
      ),
    );

    this.add(
      new Button(
        14,
        27,
        await Canvas.load_png("sprites/tetriste/buttons4.png"),
        () => this.onDownButton(),
      ),
    );
  }

  // move tetrominos left
  onLeftButton() {}

  // rotate tetrominos
  onUpButton() {}

  // move tetrominos right
  onRightButton() {}

  // validate tetrominos down
  onDownButton() {}
}
