import { AppState } from "../app/AppState.js";
import { SCREEN_SIZE } from "../canvas.js";
import { Background } from "./Background.js";
import { Food } from "./Food.js";
import { Bonus } from "./Bonus.js";
import { Portal } from "./Portal.js";
import { Snake } from "./Snake.js";

const FOOD_COUNT = 20;
const BONUS_SPAWN_DELAY = 15000;
const BONUS_DURATION = 10000;
const PORTAL_SPAWN_DELAY = 20000;

export class PlayState extends AppState {
  #bg = null;
  #food = null;
  #bonus = null;
  #portal = null;
  #snakes = [];

  #score = 0;
  #active = false;
  #bonusTimeoutId = null;
  #spawnTimeoutId = null;
  #portalSpawnTimeoutId = null;
  #availableSnakePatterns = [
    [5],
    [7],
    [4],
    [3],
    [1],
    [10],
    [5, 4],
    [3, 4],
    [7, 4],
    [1, 5],
    [3, 1],
    [5, 7],
  ];

  #players = [];

  async onEnter() {
    this.#score = 0;
    this.#active = true;

    this.#bg = new Background();
    this.#food = new Food(FOOD_COUNT);
    this.#bonus = new Bonus();
    this.#portal = new Portal();

    this.#snakes = [];

    this.add(this.#bg).add(this.#food).add(this.#bonus).add(this.#portal);

    this.addSnake(this.app.vsmode && this.app.launcherSid);

    this.#scheduleBonus();
    this.#schedulePortal();
  }

  addSnake(sid) {
    if (sid) {
      this.#players.push(sid);
    }

    const pattern =
      this.#availableSnakePatterns[
        Math.floor(Math.random() * this.#availableSnakePatterns.length)
      ];
    const snake = new Snake(
      pattern,
      {
        food: this.#food,
        snakes: this.#snakes,
        bonus: this.#bonus,
        portal: this.#portal,
      },
      sid,
    );
    snake.onDead = () => this.#onSnakeDeath(snake);
    snake.onAteFood = (s) => this.#onAteFood(s);
    snake.onAteBonus = (s) => this.#onAteBonus(s);
    snake.onUsedPortal = () => this.#schedulePortal();
    this.add(snake);
    this.#snakes.push(snake);
  }

  onExit() {
    this.#active = false;
    this.#snakes = [];
    clearTimeout(this.#spawnTimeoutId);
    clearTimeout(this.#bonusTimeoutId);
    clearTimeout(this.#portalSpawnTimeoutId);
  }

  onMessage(x, y, v, sid) {
    if (this.app.vsmode && sid) {
      if (this.#players.indexOf(sid) < 0) {
        this.addSnake(sid);
      }
    }
    for (const d of this.drawables) {
      if (d.hitTest(x, y)) d.onClick(x, y, v, sid);
      d.onMessage(x, y, v, sid);
    }
  }

  async #onSnakeDeath(snake) {
    const snakeIndex = this.#snakes.indexOf(snake);
    this.#snakes.splice(snakeIndex, 1);

    const sid = snake.getSid();
    if (sid) {
      const playerIndex = this.#players.indexOf(sid);
      if (playerIndex >= 0) this.#players.splice(playerIndex, 1);
    }

    if (this.#snakes.length <= 0) {
      await this.setState("game_over");
    }
  }

  #onAteFood(snake) {
    this.#score++;
    if (this.#score % 10 === 0) {
      const ms = Math.max(200, 1000 - Math.floor(this.#score / 10) * 100);
      snake.setSpeed(ms);
    }
  }

  #onAteBonus(snake) {
    const boostedMs = Math.max(50, Math.floor(snake.getSpeed() / 2));
    snake.setSpeed(boostedMs);
    this.#bonusTimeoutId = setTimeout(() => {
      if (!this.#active) return;
      snake.setSpeed(Math.max(200, 1000 - Math.floor(this.#score / 10) * 100));
      this.#scheduleBonus();
    }, BONUS_DURATION);
  }

  #randomPos(occupied) {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * SCREEN_SIZE),
        y: Math.floor(Math.random() * SCREEN_SIZE),
      };
    } while (occupied.some((o) => o.x === pos.x && o.y === pos.y));
    return pos;
  }

  #occupied() {
    return [
      ...this.#snakes.flatMap((s) => s.getSegments()),
      ...(this.#bonus.getPosition() ? [this.#bonus.getPosition()] : []),
      ...(this.#portal.getPair() ?? []),
    ];
  }

  #scheduleBonus() {
    this.#spawnTimeoutId = setTimeout(() => {
      if (!this.#active) return;
      this.#bonus.setPosition(this.#randomPos(this.#occupied()));
    }, BONUS_SPAWN_DELAY);
  }

  #schedulePortal() {
    this.#portalSpawnTimeoutId = setTimeout(() => {
      if (!this.#active) return;
      const occ = this.#occupied();
      const a = this.#randomPos(occ);
      const b = this.#randomPos([...occ, a]);
      this.#portal.setPortals([a, b]);
    }, PORTAL_SPAWN_DELAY);
  }
}
