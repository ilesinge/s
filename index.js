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

const canvas = new Canvas({ x: Number(args.x ?? 0), y: Number(args.y ?? 0) });
const snake = new SnakeApp({ canvas });

await canvas.connect(({ x, y, c, sid }) => snake.onMessage(x, y, c, sid));

function help() {
  console.log("/help          — afficher cette aide");
  console.log("/c             — effacer le canvas");
  console.log("/qr [text]     — afficher un QR code");
  console.log("/dqr [text]    — afficher un double QR code");
  console.log("/sprite [name] — afficher un sprite");
  console.log("/snake         — jouer au snake");
  console.log("/q             — quitter");
}

async function run(cmd, arg) {
  switch (cmd) {
    case "help": help(); break;
    case "c":    canvas.color_fill(0); break;
    case "qr":   canvas.qrcode(arg); break;
    case "dqr":  canvas.doubleqrcode(arg); break;
    case "sprite":
      canvas.draw_sprite(await Canvas.load_png(`sprites/${arg}.png`));
      break;
    case "snake":
      await snake.start();
      break;
    case "q":
      return false;
    default:
      console.log(`Commande inconnue: ${cmd}. Tapez /help pour la liste.`);
  }
  return true;
}

// If a command was passed as CLI arg, run it and exit
for (const cmd of ["c", "qr", "dqr", "sprite", "snake", "q"]) {
  if (args[cmd] !== undefined) {
    const arg = args[cmd] === true ? "" : args[cmd];
    await run(cmd, arg);
    await canvas.close();
    process.exit(0);
  }
}

// Interactive mode
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const prompt = () => rl.question("> ", async (line) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("/")) {
    console.log('Les commandes commencent par /. Tapez /help.');
    return prompt();
  }
  const [rawCmd, ...rest] = trimmed.slice(1).split(" ");
  const cmd = rawCmd.toLowerCase();
  const arg = rest.join(" ");
  const cont = await run(cmd, arg);
  if (cont) prompt();
  else {
    rl.close();
    await canvas.close();
  }
});

prompt();
