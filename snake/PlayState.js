import { SCREEN_X, SCREEN_Y, SCREEN_SIZE } from "../canvas.js";
import { AppState } from "../states/AppState.js";

const SNAKE_COLOR = 5; // vert
const HEAD_COLOR = 6; // émeraude
const FOOD_COLOR = 2; // orange
const BONUS_COLOR = 8; // violet
const BG_COLOR = 0; // crème
const PORTAL_COLOR = 10; // turquoise

const FOOD_COUNT = 20;
const BONUS_SPAWN_DELAY = 15000;
const BONUS_LIFETIME = 8000;
const BONUS_DURATION = 10000;
const PORTAL_SPAWN_DELAY = 20000;
const PORTAL_LIFETIME = 10000;

export class PlayState extends AppState {
  snake = null;
  dir = null;
  nextDir = null;
  foods = null;
  bg = null;
  score = 0;
  currentMs = 1000;
  bonusFruit = null;
  bonusTimeoutId = null;
  bonusLifetimeId = null;
  spawnTimeoutId = null;
  portalPair = null;
  portalSpawnTimeoutId = null;
  portalLifetimeId = null;

  #loopRunning = false;
  #loopIntervalId = null;

  #bgAt(x, y) {
    return this.bg[`${x},${y}`] ?? BG_COLOR;
  }

  #allSpecials() {
    return [
      ...this.foods,
      ...(this.bonusFruit ? [this.bonusFruit] : []),
      ...(this.portalPair ?? []),
    ];
  }

  #placeFood(blocked = []) {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * SCREEN_SIZE),
        y: Math.floor(Math.random() * SCREEN_SIZE),
      };
    } while (
      this.snake.some((s) => s.x === pos.x && s.y === pos.y) ||
      blocked.some((f) => f.x === pos.x && f.y === pos.y)
    );
    return pos;
  }

  #startLoop(ms) {
    if (this.#loopIntervalId) clearInterval(this.#loopIntervalId);
    this.#loopIntervalId = setInterval(async () => {
      if (this.#loopRunning) return;
      this.#loopRunning = true;
      try {
        await this.onUpdate();
      } finally {
        this.#loopRunning = false;
      }
    }, ms);
  }

  #scheduleBonus() {
    this.spawnTimeoutId = setTimeout(() => {
      if (!this.snake) return;
      const bf = this.#placeFood(this.#allSpecials());
      this.bonusFruit = bf;
      this.canvas.draw_pixel(bf.x + SCREEN_X, bf.y + SCREEN_Y, BONUS_COLOR);
      this.bonusLifetimeId = setTimeout(() => {
        if (!this.bonusFruit) return;
        this.canvas.draw_pixel(
          bf.x + SCREEN_X,
          bf.y + SCREEN_Y,
          this.#bgAt(bf.x, bf.y),
        );
        this.bonusFruit = null;
        this.#scheduleBonus();
      }, BONUS_LIFETIME);
    }, BONUS_SPAWN_DELAY);
  }

  #schedulePortal() {
    this.portalSpawnTimeoutId = setTimeout(() => {
      if (!this.snake) return;
      const pfA = this.#placeFood(this.#allSpecials());
      const pfB = this.#placeFood([...this.#allSpecials(), pfA]);
      this.portalPair = [pfA, pfB];
      this.canvas.draw_pixel(pfA.x + SCREEN_X, pfA.y + SCREEN_Y, PORTAL_COLOR);
      this.canvas.draw_pixel(pfB.x + SCREEN_X, pfB.y + SCREEN_Y, PORTAL_COLOR);
      this.portalLifetimeId = setTimeout(() => {
        if (!this.portalPair) return;
        for (const pf of this.portalPair)
          this.canvas.draw_pixel(
            pf.x + SCREEN_X,
            pf.y + SCREEN_Y,
            this.#bgAt(pf.x, pf.y),
          );
        this.portalPair = null;
        this.#schedulePortal();
      }, PORTAL_LIFETIME);
    }, PORTAL_SPAWN_DELAY);
  }

  onEnter() {
    this.canvas.lock();
    this.score = 0;
    this.currentMs = 1000;
    this.bonusFruit = null;
    this.portalPair = null;

    this.bg = {};
    for (let y = 0; y < SCREEN_SIZE; y++)
      for (let x = 0; x < SCREEN_SIZE; x++)
        this.bg[`${x},${y}`] = this.canvas.get_pixel(
          x + SCREEN_X,
          y + SCREEN_Y,
        );

    const cx = Math.floor(SCREEN_SIZE / 2);
    const cy = Math.floor(SCREEN_SIZE / 2);
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    this.dir = { dx: 1, dy: 0 };
    this.nextDir = { dx: 1, dy: 0 };
    this.foods = [];

    for (let i = 0; i < FOOD_COUNT; i++) {
      const f = this.#placeFood(this.foods);
      this.foods.push(f);
      this.canvas.draw_pixel(f.x + SCREEN_X, f.y + SCREEN_Y, FOOD_COLOR);
    }
    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      this.canvas.draw_pixel(
        seg.x + SCREEN_X,
        seg.y + SCREEN_Y,
        i === 0 ? HEAD_COLOR : SNAKE_COLOR,
      );
    }

    this.#startLoop(1000);
    this.#scheduleBonus();
    this.#schedulePortal();
  }

  async onUpdate() {
    this.dir = this.nextDir;

    const head = this.snake[0];
    const newHead = {
      x: (head.x + this.dir.dx + SCREEN_SIZE) % SCREEN_SIZE,
      y: (head.y + this.dir.dy + SCREEN_SIZE) % SCREEN_SIZE,
    };

    if (this.snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
      await this.setState("game_over");
      return;
    }

    const foodIndex = this.foods.findIndex(
      (f) => f.x === newHead.x && f.y === newHead.y,
    );
    const ateBonus =
      this.bonusFruit?.x === newHead.x && this.bonusFruit?.y === newHead.y;
    const portalIndex =
      this.portalPair?.findIndex(
        (p) => p.x === newHead.x && p.y === newHead.y,
      ) ?? -1;

    if (portalIndex !== -1) {
      clearTimeout(this.portalLifetimeId);
      const dest = this.portalPair[1 - portalIndex];
      this.portalPair = null;
      this.canvas.draw_pixel(head.x + SCREEN_X, head.y + SCREEN_Y, SNAKE_COLOR);
      this.canvas.draw_pixel(
        newHead.x + SCREEN_X,
        newHead.y + SCREEN_Y,
        this.#bgAt(newHead.x, newHead.y),
      );
      this.canvas.draw_pixel(
        dest.x + SCREEN_X,
        dest.y + SCREEN_Y,
        this.#bgAt(dest.x, dest.y),
      );
      this.snake.unshift(dest);
      this.canvas.draw_pixel(dest.x + SCREEN_X, dest.y + SCREEN_Y, HEAD_COLOR);
      const portalTail = this.snake.pop();
      this.canvas.draw_pixel(
        portalTail.x + SCREEN_X,
        portalTail.y + SCREEN_Y,
        this.#bgAt(portalTail.x, portalTail.y),
      );
      this.#schedulePortal();
      return;
    }

    this.canvas.draw_pixel(head.x + SCREEN_X, head.y + SCREEN_Y, SNAKE_COLOR);
    this.snake.unshift(newHead);
    this.canvas.draw_pixel(
      newHead.x + SCREEN_X,
      newHead.y + SCREEN_Y,
      HEAD_COLOR,
    );

    if (ateBonus) {
      clearTimeout(this.bonusLifetimeId);
      clearTimeout(this.bonusTimeoutId);
      this.bonusFruit = null;
      const boostedMs = Math.max(50, Math.floor(this.currentMs / 2));
      this.#startLoop(boostedMs);
      this.bonusTimeoutId = setTimeout(() => {
        if (!this.snake) return;
        this.#startLoop(this.currentMs);
        this.#scheduleBonus();
      }, BONUS_DURATION);
    } else if (foodIndex !== -1) {
      this.score++;
      if (this.score % 10 === 0) {
        this.currentMs = Math.max(
          200,
          1000 - Math.floor(this.score / 10) * 100,
        );
        this.#startLoop(this.currentMs);
      }
      const newFood = this.#placeFood(this.#allSpecials());
      this.foods[foodIndex] = newFood;
      this.canvas.draw_pixel(
        newFood.x + SCREEN_X,
        newFood.y + SCREEN_Y,
        FOOD_COLOR,
      );
    } else {
      const tail = this.snake.pop();
      this.canvas.draw_pixel(
        tail.x + SCREEN_X,
        tail.y + SCREEN_Y,
        this.#bgAt(tail.x, tail.y),
      );
    }
  }

  onExit() {
    this.canvas.unlock();
    clearInterval(this.#loopIntervalId);
    this.#loopIntervalId = null;
    clearTimeout(this.spawnTimeoutId);
    clearTimeout(this.bonusLifetimeId);
    clearTimeout(this.bonusTimeoutId);
    clearTimeout(this.portalSpawnTimeoutId);
    clearTimeout(this.portalLifetimeId);
    this.snake = null;
    this.bonusFruit = null;
    this.portalPair = null;
  }

  onMessage(x, y, v, sid) {
    if (!this.snake) return;

    const bx = x - SCREEN_X;
    const by = y - SCREEN_Y;
    if (bx >= 0 && bx < SCREEN_SIZE && by >= 0 && by < SCREEN_SIZE) {
      const oldColor = this.canvas.get_pixel(x, y);
      this.bg[`${bx},${by}`] = oldColor;
      this.canvas.draw_pixel(x, y, oldColor);
    }

    const head = this.snake[0];
    const ry = y - SCREEN_Y - head.y;
    const rx = x - SCREEN_X - head.x;

    if (this.nextDir.dx !== 0) {
      if (ry < 0) this.nextDir = { dx: 0, dy: -1 };
      else if (ry > 0) this.nextDir = { dx: 0, dy: 1 };
    } else {
      if (rx < 0) this.nextDir = { dx: -1, dy: 0 };
      else if (rx > 0) this.nextDir = { dx: 1, dy: 0 };
    }
  }
}
