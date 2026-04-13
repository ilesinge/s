import readline from "readline";

import {
  color_fill,
  qrcode,
  doubleqrcode,
  push_state,
  pop_state,
  conform_state,
  draw_sprite,
  draw_pixel,
  load_png,
  execute_queue,
  loadServerState,
  openStream,
  get_pixel,
  SCREEN_X,
  SCREEN_Y,
  SCREEN_SIZE,
} from "./canvas.js";

const SNAKE_COLOR = 5; // vert
const HEAD_COLOR = 6; // émeraude
const FOOD_COLOR = 2; // orange
const BONUS_COLOR = 8; // violet
const BG_COLOR = 0; // crème

const FOOD_COUNT = 5;
const BONUS_SPAWN_DELAY = 15000; // apparaît toutes les 15s
const BONUS_LIFETIME = 8000; // disparaît après 8s si pas mangé
const BONUS_DURATION = 10000; // effet dure 10s

function placeFood(snake, foods = []) {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * SCREEN_SIZE),
      y: Math.floor(Math.random() * SCREEN_SIZE),
    };
  } while (
    snake.some((s) => s.x === pos.x && s.y === pos.y) ||
    foods.some((f) => f.x === pos.x && f.y === pos.y)
  );
  return pos;
}

function scheduleBonus() {
  const s = STATES.play;
  s.spawnTimeoutId = setTimeout(async () => {
    if (currentState !== STATES.play) return;
    const bf = placeFood(s.snake, [
      ...s.foods,
      ...(s.bonusFruit ? [s.bonusFruit] : []),
    ]);
    s.bonusFruit = bf;
    await draw_pixel(bf.x + SCREEN_X, bf.y + SCREEN_Y, BONUS_COLOR);

    // Disparaît si pas mangé
    s.bonusLifetimeId = setTimeout(async () => {
      if (currentState !== STATES.play || !s.bonusFruit) return;
      const bgColor = s.bg[`${bf.x},${bf.y}`] ?? BG_COLOR;
      await draw_pixel(bf.x + SCREEN_X, bf.y + SCREEN_Y, bgColor);
      s.bonusFruit = null;
      scheduleBonus();
    }, BONUS_LIFETIME);
  }, BONUS_SPAWN_DELAY);
}

let currentState = null;

const STATES = {
  draw_title: {
    onEnter: async () => {
      await draw_sprite(await load_png("sprites/snake-index1.png"));
      await execute_queue();
      await setState("wait");
    },
  },
  wait: {
    onMessage: async (x, y) => {
      if (x >= 42 && y >= 26 && x <= 44 && y <= 28) {
        await setState("prepare_play");
      }
    },
  },
  prepare_play: {
    onEnter: async () => {
      await color_fill(9);
      await execute_queue();
      await setState("play");
    },
  },
  play: {
    snake: null,
    dir: null,
    nextDir: null,
    foods: null,
    bg: null,
    score: 0,
    currentMs: 1000,
    bonusFruit: null,
    bonusTimeoutId: null,
    bonusLifetimeId: null,
    spawnTimeoutId: null,

    onEnter: async () => {
      const s = STATES.play;
      s.score = 0;
      s.currentMs = 1000;
      s.bonusFruit = null;
      startLoop(1000);
      scheduleBonus();

      // Snapshot du canvas avant de dessiner quoi que ce soit
      s.bg = {};
      for (let y = 0; y < SCREEN_SIZE; y++) {
        for (let x = 0; x < SCREEN_SIZE; x++) {
          s.bg[`${x},${y}`] = get_pixel(x + SCREEN_X, y + SCREEN_Y);
        }
      }

      const cx = Math.floor(SCREEN_SIZE / 2);
      const cy = Math.floor(SCREEN_SIZE / 2);
      s.snake = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
      ];
      s.dir = { dx: 1, dy: 0 };
      s.nextDir = { dx: 1, dy: 0 };
      s.foods = [];
      for (let i = 0; i < FOOD_COUNT; i++) {
        const f = placeFood(s.snake, s.foods);
        s.foods.push(f);
        await draw_pixel(f.x + SCREEN_X, f.y + SCREEN_Y, FOOD_COLOR);
      }

      for (let i = 0; i < s.snake.length; i++) {
        const seg = s.snake[i];
        await draw_pixel(
          seg.x + SCREEN_X,
          seg.y + SCREEN_Y,
          i === 0 ? HEAD_COLOR : SNAKE_COLOR,
        );
      }
    },

    onLoop: async () => {
      const s = STATES.play;
      s.dir = s.nextDir;

      const head = s.snake[0];
      const newHead = { x: head.x + s.dir.dx, y: head.y + s.dir.dy };

      if (
        newHead.x < 0 ||
        newHead.x >= SCREEN_SIZE ||
        newHead.y < 0 ||
        newHead.y >= SCREEN_SIZE ||
        s.snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)
      ) {
        await setState("game_over");
        return;
      }

      const foodIndex = s.foods.findIndex(
        (f) => f.x === newHead.x && f.y === newHead.y,
      );
      const ateBonus =
        s.bonusFruit &&
        newHead.x === s.bonusFruit.x &&
        newHead.y === s.bonusFruit.y;

      await draw_pixel(head.x + SCREEN_X, head.y + SCREEN_Y, SNAKE_COLOR);
      s.snake.unshift(newHead);
      await draw_pixel(newHead.x + SCREEN_X, newHead.y + SCREEN_Y, HEAD_COLOR);

      if (ateBonus) {
        clearTimeout(s.bonusLifetimeId);
        clearTimeout(s.bonusTimeoutId);
        s.bonusFruit = null;
        const boostedMs = Math.max(50, Math.floor(s.currentMs / 2));
        startLoop(boostedMs);
        s.bonusTimeoutId = setTimeout(() => {
          if (currentState !== STATES.play) return;
          startLoop(s.currentMs);
          scheduleBonus();
        }, BONUS_DURATION);
      } else if (foodIndex !== -1) {
        s.score++;
        if (s.score % 5 === 0) {
          s.currentMs = Math.max(50, 1000 - Math.floor(s.score / 5) * 100);
          startLoop(s.currentMs);
        }
        const newFood = placeFood(s.snake, s.foods);
        s.foods[foodIndex] = newFood;
        await draw_pixel(
          newFood.x + SCREEN_X,
          newFood.y + SCREEN_Y,
          FOOD_COLOR,
        );
      } else {
        const tail = s.snake.pop();
        const bgColor = s.bg[`${tail.x},${tail.y}`] ?? BG_COLOR;
        await draw_pixel(tail.x + SCREEN_X, tail.y + SCREEN_Y, bgColor);
      }
    },

    onExit: () => {
      const s = STATES.play;
      clearTimeout(s.spawnTimeoutId);
      clearTimeout(s.bonusLifetimeId);
      clearTimeout(s.bonusTimeoutId);
      s.bonusFruit = null;
    },

    onMessage: (x, y, c, own) => {
      const s = STATES.play;
      if (!s.snake) return;

      // Ignorer nos propres pixels pour la direction
      if (own) return;

      const bx = x - SCREEN_X;
      const by = y - SCREEN_Y;
      if (bx >= 0 && bx < SCREEN_SIZE && by >= 0 && by < SCREEN_SIZE) {
        // oldColor est la couleur AVANT le clic (canvasState pas encore mis à jour)
        const oldColor = get_pixel(x, y);
        s.bg[`${bx},${by}`] = oldColor;
        // Remettre le pixel comme il était
        draw_pixel(x, y, oldColor);
      }

      // Direction : seulement perpendiculaire à la direction courante
      const head = s.snake[0];
      const ry = y - SCREEN_Y - head.y;
      const rx = x - SCREEN_X - head.x;

      if (s.nextDir.dx !== 0) {
        if (ry < 0) s.nextDir = { dx: 0, dy: -1 };
        else if (ry > 0) s.nextDir = { dx: 0, dy: 1 };
      } else {
        if (rx < 0) s.nextDir = { dx: -1, dy: 0 };
        else if (rx > 0) s.nextDir = { dx: 1, dy: 0 };
      }
    },
  },

  game_over: {
    onEnter: async () => {
      await draw_sprite(await load_png("sprites/snake-index2.png"));
      await execute_queue();
      await new Promise((r) => setTimeout(r, 5000));
      await setState("draw_title");
    },
  },

  clearing: {},
};

let loopRunning = false;
let loopIntervalId = null;

function startLoop(ms) {
  if (loopIntervalId) clearInterval(loopIntervalId);
  loopIntervalId = setInterval(async () => {
    if (!currentState?.onLoop) return;
    if (loopRunning) return;
    loopRunning = true;
    try {
      await currentState.onLoop();
    } finally {
      loopRunning = false;
    }
  }, ms);
}

async function setState(name) {
  console.log("Setting state to ", name);
  const state = STATES[name];
  if (currentState && currentState.onExit) await currentState.onExit();

  currentState = state;

  if (currentState.onEnter) await currentState.onEnter();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function input(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function onMessage({ x, y, c, own }) {
  if (currentState && currentState.onMessage)
    currentState.onMessage(x, y, c, own);
}

async function main_loop() {
  push_state();

  while (true) {
    console.log("--- Menu ---");
    console.log("c: clear");
    console.log("qr: qrcode");
    console.log("dqr: double qrcode");
    console.log("push: push state");
    console.log("pop: restore state");
    console.log("sprite: draw a sprite");
    console.log("snake: play snake");
    console.log("q: quit");
    const choice = await input(": ");

    if (choice === "q") {
      setState("clearing");
      break;
    }

    if (choice === "c") {
      await color_fill(0);
    }

    if (choice === "qr") {
      const str = await input("QRCode content: ");
      await qrcode(str);
    }

    if (choice === "dqr") {
      const str = await input("QRCode content: ");
      await doubleqrcode(str);
    }

    if (choice === "push") {
      console.log("Push state");
      push_state();
    }

    if (choice === "pop") {
      console.log("Pop state");
      const state = pop_state();
      conform_state(state);
      console.log("Previous state queued");
    }

    if (choice === "sprite") {
      const name = await input("Sprite name: ");
      draw_sprite(await load_png(`sprites/${name}.png`));
    }

    if (choice === "snake") {
      await setState("draw_title");
    }

    await execute_queue();
  }

  const state = pop_state();
  conform_state(state);
  await execute_queue();
}

await loadServerState();
openStream(onMessage);

await main_loop();
rl.close();
