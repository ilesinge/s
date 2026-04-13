import QRCode from "qrcode";
import { EventSource } from "eventsource";
import sharp from "sharp";

export const SCREEN_X = 15;
export const SCREEN_Y = 0;
export const SCREEN_SIZE = 32;

const SYNC_URL = "https://wall.plgrnd.cc";
const SYNC_TOPIC = "https://plgrnd.cc/wall";
const POST_DELAY = 0;

let eventSource = null;

let canvasState = {};
let savedStates = [];

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

const ownPixels = new Map();

export async function draw_pixel(x, y, c) {
  const key = `${x},${y}`;
  ownPixels.set(key, (ownPixels.get(key) ?? 0) + 1);

  const body = JSON.stringify({
    c: x,
    r: y,
    v: c,
    sid: "pouet",
  });

  const resp = await fetch("https://wall.plgrnd.cc/pixel", {
    body,
    method: "POST",
  });

  if (!resp.ok) {
    console.error(
      `draw_pixel(${x},${y}) failed: ${resp.status} ${resp.statusText}`,
    );
  }
}

const queue = [];

export async function noise_fill() {
  return new Promise((resolve) => {
    for (let y = 0; y < SCREEN_SIZE; ++y) {
      for (let x = 0; x < SCREEN_SIZE; ++x) {
        const color = Math.floor(Math.random() * 10);
        queue.push([x + SCREEN_X, y + SCREEN_Y, color]);
      }
    }

    resolve();
  });
}

export async function color_fill(color) {
  return new Promise((resolve) => {
    for (let y = 0; y < SCREEN_SIZE; ++y) {
      for (let x = 0; x < SCREEN_SIZE; ++x) {
        queue.push([x + SCREEN_X, y + SCREEN_Y, color]);
      }
    }

    resolve();
  });
}

export async function qrcode(text) {
  return new Promise((resolve) => {
    const qr = QRCode.create(text, { errorCorrectionLevel: "L" });

    const { data, size } = qr.modules;

    for (let y = 0; y < size && y < SCREEN_SIZE; y++) {
      for (let x = 0; x < size && x < SCREEN_SIZE; x++) {
        const isDark = data[y * size + x];

        queue.push([x + SCREEN_X, y + SCREEN_Y, isDark ? 9 : 0]);
      }
    }

    resolve();
  });
}

export async function doubleqrcode(text) {
  return new Promise((resolve) => {
    const text_a = text.substring(0, text.length / 2);
    const text_b = text.substring(text.length / 2);

    const qra = QRCode.create(text_a, { errorCorrectionLevel: "L" });
    const qrb = QRCode.create(text_b, { errorCorrectionLevel: "L" });

    const { data: data1, size } = qra.modules;
    const { data: data2 } = qrb.modules;

    for (let y = 0; y < size && y < SCREEN_SIZE; y++) {
      for (let x = 0; x < size && x < SCREEN_SIZE; x++) {
        let c = 0;

        const dataA = data1[y * size + x];
        const dataB = data2[y * size + x];

        if (dataA) c = 3;
        if (dataB) c = 7;
        if (dataA && dataB) c = 9;

        queue.push([x + SCREEN_X, y + SCREEN_Y, c]);
      }
    }

    resolve();
  });
}

export async function load_png(path) {
  const image = sharp(path);
  const { width, height } = await image.metadata();
  const raw = await image.removeAlpha().raw().toBuffer();

  const pixels = [];

  for (let i = 0; i < raw.length; i += 3) {
    const r = raw[i].toString(16).padStart(2, "0");
    const g = raw[i + 1].toString(16).padStart(2, "0");
    const b = raw[i + 2].toString(16).padStart(2, "0");
    pixels.push(`#${r}${g}${b}`);
  }

  return { width, height, pixels };
}

export async function wait(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function pick_random_in_queue() {
  const index = Math.floor(Math.random() * queue.length);
  return queue.splice(index, 1)[0];
}

export async function conform_state(state) {
  return new Promise((resolve) => {
    for (const coords in state) {
      const [x, y] = coords.split(",").map(Number);
      const c = state[coords];
      queue.push([x, y, c]);
    }
    resolve();
  });
}

export function nearest_palette(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  let best = 0;
  let bestDist = Infinity;

  for (let i = 0; i < PALETTE.length; i++) {
    const pr = parseInt(PALETTE[i].slice(1, 3), 16);
    const pg = parseInt(PALETTE[i].slice(3, 5), 16);
    const pb = parseInt(PALETTE[i].slice(5, 7), 16);
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }

  return best;
}

export async function draw_sprite({ width, height, pixels }) {
  return new Promise((resolve) => {
    const colors = pixels.map(nearest_palette);

    for (let y = 0; y < SCREEN_SIZE && y < height; ++y) {
      for (let x = 0; x < SCREEN_SIZE && x < width; ++x) {
        const index = y * width + x;
        queue.push([x + SCREEN_X, y + SCREEN_Y, colors[index]]);
      }
    }

    resolve();
  });
}

export function push_state() {
  const newState = {};

  for (let y = 0; y < SCREEN_SIZE; ++y) {
    for (let x = 0; x < SCREEN_SIZE; ++x) {
      const coords = `${x + SCREEN_X},${y + SCREEN_Y}`;
      const v = canvasState[coords] ?? 0;
      newState[coords] = v;
    }
  }

  savedStates.push(newState);
}

export function pop_state() {
  return savedStates.pop();
}

export async function execute_queue() {
  let requestCount = 0;
  while (queue.length > 0) {
    const params = pick_random_in_queue();
    const [x, y, c] = params;
    const canvas_coords = `${x},${y}`;
    const canvas_color = canvasState[canvas_coords] ?? 0;

    if (canvas_color === c) continue;

    await draw_pixel(...params);
    requestCount++;
    if (requestCount >= 20) {
      requestCount = 0;
      await wait(0);
    }
  }

  return;
}

export function openStream(msgCallback) {
  if (!SYNC_URL) return;
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(
    SYNC_URL + "/.well-known/mercure?topic=" + encodeURIComponent(SYNC_TOPIC),
  );

  eventSource.onmessage = ({ data }) => {
    const parsed = JSON.parse(data);
    const coords = `${parsed.c},${parsed.r}`;

    const count = ownPixels.get(coords) ?? 0;
    const own = count > 0;
    if (own) {
      if (count === 1) ownPixels.delete(coords);
      else ownPixels.set(coords, count - 1);
    }

    msgCallback?.({ x: parsed.c, y: parsed.r, c: parsed.v, own });

    canvasState[coords] = parsed.v;
  };

  //eventSource.onerror = (...data) => console.error(data);
}

export function get_pixel(x, y) {
  return canvasState[`${x},${y}`] ?? 0;
}

export async function loadServerState() {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => {
    ctrl.abort();
    console.log("ABORT");
  }, 3000);

  try {
    const res = await fetch(SYNC_URL + "/state", { signal: ctrl.signal });
    const serverState = await res.json();
    canvasState = serverState;
    clearTimeout(timeout);
  } catch {
    console.log("error");
    clearTimeout(timeout);
  }
}
