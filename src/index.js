import readline from "readline";

import { Canvas } from "./canvas.js";
import { SnakeApp } from "./snake/index.js";

// Parse --key=value and --flag args
const rawArgs = process.argv.slice(2);
const args = {};
for (const a of rawArgs) {
  if (!a.startsWith("--")) continue;
  const eq = a.indexOf("=");
  if (eq === -1) args[a.slice(2)] = true;
  else args[a.slice(2, eq)] = a.slice(eq + 1);
}

const canvas = new Canvas({
  x: Number(args.x ?? 0),
  y: Number(args.y ?? 0),
  restore: !args["no-restore"],
});

let currentAppIndex = -1;

async function startAppAt(index) {
  if (currentAppIndex >= 0) await apps[currentAppIndex].app.onExit();
  currentAppIndex = index;
  await apps[currentAppIndex].app.onEnter();
}

async function nextApp() {
  await startAppAt((currentAppIndex + 1) % apps.length);
}

async function prevApp() {
  await startAppAt((currentAppIndex - 1 + apps.length) % apps.length);
}

const apps = [
  { name: "snake", app: new SnakeApp(canvas, { nextApp, prevApp }) },
  { name: "snakeVs", app: new SnakeApp(canvas, { nextApp, prevApp }, true) },
];

await canvas.connect(({ x, y, c, sid }) => {
  if (currentAppIndex >= 0) apps[currentAppIndex].app.onMessage(x, y, c, sid);
});

function help() {
  console.log("/help            — afficher cette aide");
  console.log("/c               — effacer le canvas");
  console.log("/qr [text]       — afficher un QR code");
  console.log("/dqr [text]      — afficher un double QR code");
  console.log("/sprite [name]   — afficher un sprite");
  console.log(
    `/app [name]      — lancer une app (${apps.map((a) => a.name).join(", ")})`,
  );
  console.log("/q               — quitter");
}

async function run(cmd, arg) {
  switch (cmd) {
    case "help":
      help();
      break;
    case "c":
      canvas.color_fill(0);
      break;
    case "qr":
      canvas.qrcode(arg);
      break;
    case "dqr":
      canvas.doubleqrcode(arg);
      break;
    case "sprite":
      canvas.draw_sprite(await Canvas.load_png(`sprites/${arg}.png`));
      break;
    case "app": {
      const idx = apps.findIndex((a) => a.name === arg);
      if (idx === -1) {
        console.log(
          `App inconnue: ${arg}. Apps disponibles: ${apps.map((a) => a.name).join(", ")}`,
        );
        break;
      }
      await startAppAt(idx);
      break;
    }
    case "q":
      return false;
    default:
      console.log(`Commande inconnue: ${cmd}. Tapez /help pour la liste.`);
  }
  return true;
}

// Detect if a command was passed as a CLI arg
const cliCmd = ["c", "qr", "dqr", "sprite", "app"].find(
  (c) => args[c] !== undefined,
);

if (cliCmd) {
  await run(cliCmd, args[cliCmd] === true ? "" : args[cliCmd]);

  if (cliCmd === "app") {
    // Stay alive; let the event loop keep the process running.
    // Clean shutdown on SIGINT / SIGTERM.
    for (const sig of ["SIGINT", "SIGTERM"]) {
      process.on(sig, async () => {
        await canvas.close();
        process.exit(0);
      });
    }
  } else {
    await canvas.flush();
    await canvas.close();
  }
} else {
  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () =>
    rl.question("> ", async (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("/")) {
        console.log("Les commandes commencent par /. Tapez /help.");
        return prompt();
      }
      const [rawCmd, ...rest] = trimmed.slice(1).split(" ");
      const cont = await run(rawCmd.toLowerCase(), rest.join(" "));
      if (cont) prompt();
      else {
        rl.close();
        await canvas.close();
      }
    });

  prompt();
}
