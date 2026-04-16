import QRCode from "qrcode";
import { EventSource } from "eventsource";
import sharp from "sharp";

export const SCREEN_X = 44;
export const SCREEN_Y = 76;
export const SCREEN_SIZE = 32;

const SYNC_URL = process.env.WALL_URL ?? "https://wall.plgrnd.cc";
const SYNC_TOPIC = "https://plgrnd.cc/wall";

export const PALETTE = [
  "#EDE8DC", // 0  — vide (crème)
  "#D4B882", // 1  — buff doré
  "#F05A20", // 2  — orange vif
  "#A82020", // 3  — rouge intense
  "#F5C820", // 4  — jaune éclatant
  "#5EC462", // 5  — vert franc
  "#1E8858", // 6  — émeraude
  "#3858CC", // 7  — bleu électrique
  "#8E40D0", // 8  — violet saturé
  "#1E1830", // 9  — encre profonde
  "#50D8C8", // 10 — turquoise vif
];

export class Canvas {
  #sessionId = crypto.randomUUID();
  #eventSource = null;
  #initialState = {};
  #state = {};
  #savedStates = [];
  #dirty = new Set();
  #closed = false;
  #locked = false;
  #syncWake = null;

  async connect(msgCallback) {
    await this.#loadServerState();
    this.#openStream(msgCallback);
    this.#syncLoop();
  }

  async #loadServerState() {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(SYNC_URL + "/state", { signal: ctrl.signal });
    clearTimeout(timeout);
    const body = await res.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error(
        `/state: expected a plain object, got ${JSON.stringify(body)}`,
      );
    }
    this.#initialState = { ...body };
    this.#state = body;
  }

  #openStream(msgCallback) {
    if (this.#eventSource) this.#eventSource.close();
    this.#eventSource = new EventSource(
      SYNC_URL + "/.well-known/mercure?topic=" + encodeURIComponent(SYNC_TOPIC),
    );
    this.#eventSource.onmessage = ({ data }) => {
      const parsed = JSON.parse(data);
      const coords = `${parsed.c},${parsed.r}`;
      if (parsed.sid !== this.#sessionId) {
        if (this.#locked) {
          this.#dirty.add(coords);
          this.#signalSync();
        } else {
          this.#state[coords] = parsed.v;
        }
        msgCallback?.({ x: parsed.c, y: parsed.r, c: parsed.v, sid: parsed.sid });
      }
    };
  }

  #signalSync() {
    const wake = this.#syncWake;
    this.#syncWake = null;
    wake?.();
  }

  async #syncLoop() {
    let requestCount = 0;
    while (!this.#closed) {
      if (this.#dirty.size === 0) {
        await new Promise((r) => {
          this.#syncWake = r;
        });
        continue;
      }
      const keys = [...this.#dirty];
      const key = keys[Math.floor(Math.random() * keys.length)];
      const c = this.#state[key];
      this.#dirty.delete(key);
      const [x, y] = key.split(",").map(Number);
      const resp = await fetch(SYNC_URL + "/pixel", {
        method: "POST",
        body: JSON.stringify({ c: x, r: y, v: c, sid: this.#sessionId }),
      });
      if (!resp.ok)
        console.error(
          `sync pixel(${x},${y}) failed: ${resp.status} ${resp.statusText}`,
        );
      if (++requestCount >= 20) {
        requestCount = 0;
        await Canvas.wait(0);
      }
    }
  }

  lock() { this.#locked = true; }
  unlock() { this.#locked = false; }

  get_pixel(x, y) {
    return this.#state[`${x},${y}`] ?? 0;
  }

  draw_pixel(x, y, c) {
    const key = `${x},${y}`;
    this.#state[key] = c;
    this.#dirty.add(key);
    this.#signalSync();
  }

  async flush() {
    while (this.#dirty.size > 0) {
      await Canvas.wait(0);
    }
  }

  async close() {
    this.#closed = true;
    this.#signalSync();
    this.#eventSource?.close();
    this.#eventSource = null;
    this.#dirty.clear();
    for (const [key, c] of Object.entries(this.#initialState)) {
      if (this.#state[key] !== c) {
        this.#state[key] = c;
        this.#dirty.add(key);
      }
    }
    let requestCount = 0;
    while (this.#dirty.size > 0) {
      const keys = [...this.#dirty];
      const key = keys[Math.floor(Math.random() * keys.length)];
      const c = this.#state[key];
      this.#dirty.delete(key);
      const [x, y] = key.split(",").map(Number);
      const resp = await fetch(SYNC_URL + "/pixel", {
        method: "POST",
        body: JSON.stringify({ c: x, r: y, v: c, sid: this.#sessionId }),
      });
      if (!resp.ok)
        console.error(
          `close pixel(${x},${y}) failed: ${resp.status} ${resp.statusText}`,
        );
      if (++requestCount >= 20) {
        requestCount = 0;
        await Canvas.wait(0);
      }
    }
  }

  #screen_fill(colorFn) {
    for (let y = 0; y < SCREEN_SIZE; ++y)
      for (let x = 0; x < SCREEN_SIZE; ++x)
        this.draw_pixel(x + SCREEN_X, y + SCREEN_Y, colorFn(x, y));
  }

  color_fill(color) {
    this.#screen_fill(() => color);
  }

  qrcode(text, ox = 0, oy = 0) {
    const qr = QRCode.create(text, { errorCorrectionLevel: "L" });
    const { data, size } = qr.modules;
    for (let y = 0; y < size && y + oy < SCREEN_SIZE; y++)
      for (let x = 0; x < size && x + ox < SCREEN_SIZE; x++)
        this.draw_pixel(
          x + ox + SCREEN_X,
          y + oy + SCREEN_Y,
          data[y * size + x] ? 9 : 0,
        );
  }

  qrcode_centered(text) {
    const { size } = QRCode.create(text, { errorCorrectionLevel: "L" }).modules;
    const ox = Math.floor((SCREEN_SIZE - size) / 2);
    const oy = Math.floor((SCREEN_SIZE - size) / 2);
    this.qrcode(text, ox, oy);
  }

  doubleqrcode(text) {
    const mid = text.length / 2;
    const qra = QRCode.create(text.substring(0, mid), {
      errorCorrectionLevel: "L",
    });
    const qrb = QRCode.create(text.substring(mid), {
      errorCorrectionLevel: "L",
    });
    const { data: dataA, size } = qra.modules;
    const { data: dataB } = qrb.modules;
    for (let y = 0; y < size && y < SCREEN_SIZE; y++)
      for (let x = 0; x < size && x < SCREEN_SIZE; x++) {
        const a = dataA[y * size + x];
        const b = dataB[y * size + x];
        const c = a && b ? 9 : b ? 7 : a ? 3 : 0;
        this.draw_pixel(x + SCREEN_X, y + SCREEN_Y, c);
      }
  }

  static async load_png(path) {
    const image = sharp(path);
    const { width, height } = await image.metadata();
    const raw = await image.removeAlpha().raw().toBuffer();
    const ch = (v) => v.toString(16).padStart(2, "0");
    const pixels = [];
    for (let i = 0; i < raw.length; i += 3)
      pixels.push(`#${ch(raw[i])}${ch(raw[i + 1])}${ch(raw[i + 2])}`);
    return { width, height, pixels };
  }

  draw_sprite({ width, height, pixels }) {
    const colors = pixels.map(Canvas.nearest_palette);
    for (let y = 0; y < SCREEN_SIZE && y < height; ++y)
      for (let x = 0; x < SCREEN_SIZE && x < width; ++x)
        this.draw_pixel(x + SCREEN_X, y + SCREEN_Y, colors[y * width + x]);
  }

  static #hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  static nearest_palette(hex) {
    const [r, g, b] = Canvas.#hexToRgb(hex);
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
      const [pr, pg, pb] = Canvas.#hexToRgb(PALETTE[i]);
      const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  push_state() {
    const snapshot = {};
    for (let y = 0; y < SCREEN_SIZE; ++y)
      for (let x = 0; x < SCREEN_SIZE; ++x) {
        const coords = `${x + SCREEN_X},${y + SCREEN_Y}`;
        snapshot[coords] = this.#state[coords] ?? 0;
      }
    this.#savedStates.push(snapshot);
  }

  pop_state() {
    return this.#savedStates.pop();
  }

  conform_state(state) {
    if (!state) return;
    for (const coords in state) {
      const [x, y] = coords.split(",").map(Number);
      this.draw_pixel(x, y, state[coords]);
    }
  }

  static wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
