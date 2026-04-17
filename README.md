Snake on plgrnd
--
Just toying with the new plgrnd.cc website.
Quick and dirty experimentations leading to a snake.

## Installation

```shell
npm install
```

## Usage

### Mode interactif

```shell
npm start
# ou
npm run dev
```

Tapez `/help` pour voir les commandes disponibles :

```
/help            — afficher cette aide
/c               — effacer le canvas
/qr [text]       — afficher un QR code
/dqr [text]      — afficher un double QR code
/sprite [name]   — afficher un sprite
/app [name]      — lancer une app (snake)
/q               — quitter
```

### Mode direct (CLI)

Lancer une app directement sans menu interactif :

```shell
node src/index.js --app=snake
node src/index.js --x=44 --y=77 --app=snake
node src/index.js --x=44 --y=77 --no-restore --app=snake
```

Commandes one-shot (flush + exit) :

```shell
node src/index.js --qr="https://example.com"
node src/index.js --c
node src/index.js --sprite=heart
```

Options globales :

| Option | Description | Défaut |
|---|---|---|
| `--x=N` | Position X du canvas | `0` |
| `--y=N` | Position Y du canvas | `0` |
| `--no-restore` | Ne pas restaurer l'état initial à la fermeture | — |

### Via npm scripts

```shell
npm run snake                        # snake avec hot-reload
WALL_URL=http://localhost:8765 npm run snake
npm run dev -- --x=44 --y=77 --app=snake   # args custom
```

### Docker

```shell
docker compose up --build
```

L'image configure par défaut `--x=44 --y=77 --app=snake`. Pour changer, modifier la ligne `CMD` du `Dockerfile` ou passer des variables d'environnement via `docker-compose.yml`.
