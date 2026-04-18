import { Canvas } from "../canvas.js";
import { AppState } from "../app/AppState.js";
import { Sprite } from "../scene/Sprite.js";
import { Button } from "../scene/Button.js";
import { GameObject } from "../scene/GameObject.js";

const BOARD_X = 11;
const BOARD_Y = 1;
const BOARD_W = 10;
const BOARD_H = 20;
const INITIAL_DROP_INTERVAL = 800;

const TETROMINOS = [
  { name: "I", color: 4, nextSprite: "sprites/tetriste/next-tetromino1.png" },
  { name: "T", color: 3, nextSprite: "sprites/tetriste/next-tetromino2.png" },
  {
    name: "O",
    color: 10,
    nextSprite: "sprites/tetriste/next-tetromino3.png",
  },
  { name: "Z", color: 6, nextSprite: "sprites/tetriste/next-tetromino4.png" },
  { name: "S", color: 5, nextSprite: "sprites/tetriste/next-tetromino5.png" },
  { name: "L", color: 7, nextSprite: "sprites/tetriste/next-tetromino6.png" },
  {
    name: "J",
    color: 2,
    nextSprite: "sprites/tetriste/next-tetromino7.png",
  },
];

// Each piece: array of rotations, each rotation: array of [row, col] offsets
const SHAPES = [
  // 0: I
  [
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
    [
      [3, 0],
      [3, 1],
      [3, 2],
      [3, 3],
    ],
    [
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ],
  ],
  // 1: T
  [
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  // 2: O
  [
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  ],
  // 3: Z
  [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  ],
  // 4: S
  [
    [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  // 5: L
  [
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  ],
  // 6: J
  [
    [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [2, 0],
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
  ],
];

class BoardDrawable extends GameObject {
  board = null;
  piece = null; // { type, rotation, row, col }

  draw(buf, width) {
    // Draw locked cells
    for (let r = 0; r < BOARD_H; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        const color = this.board[r][c];
        if (color === 0) continue;
        const bx = BOARD_X + c;
        const by = BOARD_Y + r;
        if (bx >= 0 && bx < width && by >= 0 && by < width)
          buf[by * width + bx] = color;
      }
    }

    // Draw active piece
    if (this.piece) {
      const cells = SHAPES[this.piece.type][this.piece.rotation];
      const color = TETROMINOS[this.piece.type].color;
      for (const [dr, dc] of cells) {
        const r = this.piece.row + dr;
        const c = this.piece.col + dc;
        if (r < 0 || r >= BOARD_H || c < 0 || c >= BOARD_W) continue;
        const bx = BOARD_X + c;
        const by = BOARD_Y + r;
        if (bx >= 0 && bx < width && by >= 0 && by < width)
          buf[by * width + bx] = color;
      }
    }
  }
}

class NextPieceDrawable extends GameObject {
  #images = [];
  #current = 0;

  constructor(rawSprites) {
    super();
    this.#images = rawSprites.map(({ width, height, pixels }) => ({
      width,
      height,
      colors: pixels.map((hex) =>
        hex === null ? null : Canvas.nearest_palette(hex),
      ),
    }));
  }

  setCurrent(index) {
    this.#current = index;
  }

  draw(buf, width) {
    const img = this.#images[this.#current];
    for (let dy = 0; dy < img.height; dy++) {
      for (let dx = 0; dx < img.width; dx++) {
        const c = img.colors[dy * img.width + dx];
        if (c === null) continue;
        if (dx >= 0 && dx < width && dy >= 0 && dy < width)
          buf[dy * width + dx] = c;
      }
    }
  }
}

export class PlayState extends AppState {
  #board = [];
  #boardDrawable = null;
  #nextDrawable = null;

  #currentPiece = null;
  #nextPieceType = -1;

  #dropAccumulator = 0;
  #dropInterval = INITIAL_DROP_INTERVAL;
  #lines = 0;
  #gameOver = false;

  async onEnter() {
    this.#board = Array.from({ length: BOARD_H }, () =>
      new Array(BOARD_W).fill(0),
    );
    this.#dropAccumulator = 0;
    this.#dropInterval = INITIAL_DROP_INTERVAL;
    this.#lines = 0;
    this.#gameOver = false;

    // Load resources
    const [gameImg, ...nextImgs] = await Promise.all([
      Canvas.load_png("sprites/tetriste/game.png"),
      ...TETROMINOS.map((t) => Canvas.load_png(t.nextSprite)),
    ]);

    // Game background
    this.add(new Sprite(0, 0, gameImg));

    // Board drawable
    this.#boardDrawable = new BoardDrawable();
    this.#boardDrawable.board = this.#board;
    this.add(this.#boardDrawable);

    // Next piece display
    this.#nextDrawable = new NextPieceDrawable(nextImgs);
    this.#nextPieceType = this.#randomType();
    this.#nextDrawable.setCurrent(this.#nextPieceType);
    this.add(this.#nextDrawable);

    // Buttons
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
        11,
        22,
        await Canvas.load_png("sprites/tetriste/buttons2.png"),
        () => this.onRotateLeftButton(),
      ),
    );

    this.add(
      new Button(
        17,
        22,
        await Canvas.load_png("sprites/tetriste/buttons5.png"),
        () => this.onRotateRightButton(),
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

    // Spawn first piece
    this.#spawnPiece();
  }

  #randomType() {
    return Math.floor(Math.random() * TETROMINOS.length);
  }

  #spawnPiece() {
    const type = this.#nextPieceType;
    const rotation = 0;
    const cells = SHAPES[type][rotation];

    const maxCol = Math.max(...cells.map(([, c]) => c));
    const col = Math.floor((BOARD_W - maxCol - 1) / 2);
    const row = 0;

    this.#currentPiece = { type, rotation, row, col };
    this.#boardDrawable.piece = this.#currentPiece;

    if (!this.#isValid(type, rotation, row, col)) {
      this.#gameOver = true;
      this.setState("gameover");
      return;
    }

    this.#nextPieceType = this.#randomType();
    this.#nextDrawable.setCurrent(this.#nextPieceType);
    this.#dropAccumulator = 0;
  }

  #isValid(type, rotation, row, col) {
    const cells = SHAPES[type][rotation % SHAPES[type].length];
    for (const [dr, dc] of cells) {
      const r = row + dr;
      const c = col + dc;
      if (c < 0 || c >= BOARD_W || r >= BOARD_H) return false;
      if (r >= 0 && this.#board[r][c] !== 0) return false;
    }
    return true;
  }

  #lock() {
    const { type, rotation, row, col } = this.#currentPiece;
    const cells = SHAPES[type][rotation % SHAPES[type].length];
    const color = TETROMINOS[type].color;
    for (const [dr, dc] of cells) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < BOARD_H && c >= 0 && c < BOARD_W) {
        this.#board[r][c] = color;
      }
    }
    this.#clearLines();
    this.#spawnPiece();
  }

  #clearLines() {
    let cleared = 0;
    for (let r = BOARD_H - 1; r >= 0; r--) {
      if (this.#board[r].every((c) => c !== 0)) {
        this.#board.splice(r, 1);
        this.#board.unshift(new Array(BOARD_W).fill(0));
        cleared++;
        r++; // re-check this row since rows shifted down
      }
    }
    if (cleared > 0) {
      this.#lines += cleared;
      this.#dropInterval = Math.max(
        100,
        INITIAL_DROP_INTERVAL - Math.floor(this.#lines / 5) * 80,
      );
    }
  }

  onUpdate(dt) {
    if (this.#gameOver || !this.#currentPiece) return;

    this.#dropAccumulator += dt;
    if (this.#dropAccumulator >= this.#dropInterval) {
      this.#dropAccumulator = 0;
      this.#tryMoveDown();
    }
  }

  #tryMoveDown() {
    const { type, rotation, row, col } = this.#currentPiece;
    if (this.#isValid(type, rotation, row + 1, col)) {
      this.#currentPiece.row++;
    } else {
      this.#lock();
    }
  }

  // move tetromino left
  onLeftButton() {
    if (this.#gameOver || !this.#currentPiece) return;
    const { type, rotation, row, col } = this.#currentPiece;
    if (this.#isValid(type, rotation, row, col - 1)) {
      this.#currentPiece.col--;
    }
  }

  #tryRotate(nextRot) {
    if (this.#gameOver || !this.#currentPiece) return;
    const { type, row, col } = this.#currentPiece;
    if (this.#isValid(type, nextRot, row, col)) {
      this.#currentPiece.rotation = nextRot;
    } else if (this.#isValid(type, nextRot, row, col - 1)) {
      this.#currentPiece.rotation = nextRot;
      this.#currentPiece.col--;
    } else if (this.#isValid(type, nextRot, row, col + 1)) {
      this.#currentPiece.rotation = nextRot;
      this.#currentPiece.col++;
    }
  }

  // rotate tetromino counterclockwise
  onRotateLeftButton() {
    if (!this.#currentPiece) return;
    const { type, rotation } = this.#currentPiece;
    this.#tryRotate((rotation - 1 + SHAPES[type].length) % SHAPES[type].length);
  }

  // rotate tetromino clockwise
  onRotateRightButton() {
    if (!this.#currentPiece) return;
    const { type, rotation } = this.#currentPiece;
    this.#tryRotate((rotation + 1) % SHAPES[type].length);
  }

  // move tetromino right
  onRightButton() {
    if (this.#gameOver || !this.#currentPiece) return;
    const { type, rotation, row, col } = this.#currentPiece;
    if (this.#isValid(type, rotation, row, col + 1)) {
      this.#currentPiece.col++;
    }
  }

  // hard drop
  onDownButton() {
    if (this.#gameOver || !this.#currentPiece) return;
    const { type, rotation, col } = this.#currentPiece;
    let row = this.#currentPiece.row;
    while (this.#isValid(type, rotation, row + 1, col)) {
      row++;
    }
    this.#currentPiece.row = row;
    this.#lock();
  }
}
