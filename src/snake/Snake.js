import { GameObject } from "../scene/GameObject.js";
import { SCREEN_SIZE } from "../canvas.js";

export class Snake extends GameObject {
  #segments = [];
  #dir = { dx: 1, dy: 0 };
  #nextDir = { dx: 1, dy: 0 };
  #speed = 1000; // ms per tick
  #accumulator = 0;
  #inactivity = 0;
  static #INACTIVITY_LIMIT = 30000;
  #pendingGrow = false;
  #moveCount = 0;
  #pattern = [5];
  #sid = undefined;
  #dead = false;

  #food = null;
  #snakes = null;
  #bonus = null;
  #portal = null;

  onDead = () => {};
  onAteFood = (snake) => {};
  onAteBonus = (snake) => {};
  onUsedPortal = (snake) => {};

  constructor(pattern, { food, snakes, bonus, portal }, sid = undefined) {
    super();
    this.#pattern = pattern;
    this.#food = food;
    this.#snakes = snakes;
    this.#bonus = bonus;
    this.#portal = portal;
    this.#sid = sid;
  }

  onAdd() {
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const cx = Math.floor(Math.random() * SCREEN_SIZE);
    const cy = Math.floor(Math.random() * SCREEN_SIZE);
    this.#segments = [
      { x: cx, y: cy },
      { x: (cx - dir.dx + SCREEN_SIZE) % SCREEN_SIZE, y: (cy - dir.dy + SCREEN_SIZE) % SCREEN_SIZE },
      { x: (cx - dir.dx * 2 + SCREEN_SIZE) % SCREEN_SIZE, y: (cy - dir.dy * 2 + SCREEN_SIZE) % SCREEN_SIZE },
    ];
    this.#dir = dir;
    this.#nextDir = dir;
  }

  getSid() {
    return this.#sid;
  }

  onUpdate(dt) {
    if (this.#dead) return;
    this.#inactivity += dt;
    if (this.#inactivity >= Snake.#INACTIVITY_LIMIT) {
      this.die();
      return;
    }
    this.#accumulator += dt;
    if (this.#accumulator < this.#speed) return;
    this.#accumulator = 0;
    this.#step();
  }

  #step() {
    const newHead = this.tryMove();

    const allSegments = this.#snakes.flatMap((s) => s.getSegments());
    if (allSegments.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      this.die();
      return;
    }

    if (this.#portal.at(newHead)) {
      const dest = this.#portal.getOther(newHead);
      this.#portal.clear();
      this.teleport(dest);
      this.onUsedPortal(this);
    } else if (this.#food.tryEat(newHead)) {
      this.eat();
      const occ = this.#snakes
        .flatMap((s) => s.getSegments())
        .concat(this.#bonus.getPosition() ? [this.#bonus.getPosition()] : [])
        .concat(this.#portal.getPair() ?? []);
      this.#food.addNew(occ);
      this.onAteFood(this);
    } else if (this.#bonus.at(newHead)) {
      this.#bonus.clear();
      this.eat();
      this.onAteBonus(this);
    }

    this.move();
  }

  isDead() {
    return this.#dead;
  }

  tryMove() {
    const head = this.#segments[0];
    return {
      x: (head.x + this.#nextDir.dx + SCREEN_SIZE) % SCREEN_SIZE,
      y: (head.y + this.#nextDir.dy + SCREEN_SIZE) % SCREEN_SIZE,
    };
  }

  move() {
    this.#moveCount++;
    this.#dir = this.#nextDir;
    const head = this.#segments[0];
    const newHead = {
      x: (head.x + this.#dir.dx + SCREEN_SIZE) % SCREEN_SIZE,
      y: (head.y + this.#dir.dy + SCREEN_SIZE) % SCREEN_SIZE,
    };
    this.#segments.unshift(newHead);
    if (this.#pendingGrow) {
      this.#pendingGrow = false;
    } else {
      this.#segments.pop();
    }
    return newHead;
  }

  setSpeed(ms) {
    this.#speed = ms;
  }

  getSpeed() {
    return this.#speed;
  }

  eat() {
    this.#pendingGrow = true;
  }

  teleport(dest) {
    this.#segments[0] = dest;
  }

  getHead() {
    return this.#segments[0];
  }

  getSegments() {
    return this.#segments;
  }

  onMessage(x, y, v, sid) {
    if (this.#sid && this.#sid != sid) return;
    this.#inactivity = 0;
    if (this.#segments.length === 0) return;
    const head = this.#segments[0];
    const ry = y - head.y;
    const rx = x - head.x;

    if (this.#dir.dx !== 0) {
      if (ry < 0) this.#nextDir = { dx: 0, dy: -1 };
      else if (ry > 0) this.#nextDir = { dx: 0, dy: 1 };
    } else {
      if (rx < 0) this.#nextDir = { dx: -1, dy: 0 };
      else if (rx > 0) this.#nextDir = { dx: 1, dy: 0 };
    }
  }

  draw(buf, width) {
    for (let i = 0; i < this.#segments.length; i++) {
      const { x, y } = this.#segments[i];
      if (x >= 0 && x < width && y >= 0 && y < width)
        buf[y * width + x] =
          this.#pattern[(i + this.#moveCount) % this.#pattern.length];
    }
  }

  die() {
    this.#dead = true;
    this.#segments.pop();

    if (this.#segments.length > 0) setTimeout(() => this.die(), 150);
    else this.onDead(this);
  }
}
