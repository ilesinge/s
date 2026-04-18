import { GameObject } from "./GameObject.js";
import { Canvas } from "../canvas.js";

export class Sprite extends GameObject {
  #ox;
  #oy;
  #width;
  #height;
  #colors;

  constructor(x, y, { width, height, pixels }) {
    super();
    this.#ox = x;
    this.#oy = y;
    this.#width = width;
    this.#height = height;
    this.#colors = pixels.map((hex) => {
      return hex === null ? null : Canvas.nearest_palette(hex);
    });
  }

  get ox() {
    return this.#ox;
  }
  get oy() {
    return this.#oy;
  }
  get width() {
    return this.#width;
  }
  get height() {
    return this.#height;
  }

  draw(buf, width) {
    for (let dy = 0; dy < this.#height; dy++) {
      for (let dx = 0; dx < this.#width; dx++) {
        const c = this.#colors[dy * this.#width + dx];
        if (c === null) continue;
        const bx = this.#ox + dx;
        const by = this.#oy + dy;
        if (bx < 0 || bx >= width || by < 0 || by >= width) continue;
        buf[by * width + bx] = c;
      }
    }
  }
}
