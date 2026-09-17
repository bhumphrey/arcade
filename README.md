# Arcade

A landing page for browser games that live in their own repos and are included here as git
submodules under `games/`. Games sit on a shelf as cartridges; picking one plugs it into the
console, and pressing **POWER** turns on the TV and hands the whole browser page to the game. Hit **Back** to return to the shelf.

No build step, no dependencies.

## Get the code

The games are submodules, so clone with them:

```bash
git clone --recurse-submodules <this repo>
```

In an existing clone, run `git submodule update --init`.

## Run it

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>. Use a server rather than opening `index.html` from disk,
because some games load files with `fetch()`, and browsers block that for `file://` pages.

## Update the games

Pull the latest commit of every game, then commit the new pointers:

```bash
git submodule update --remote
git commit -am "Update games"
```

## Add a game

Add the game's repo as a submodule under `games/`:

```bash
git submodule add https://github.com/bhumphrey/my-game.git games/my-game
```

Then add an entry to [`games.js`](games.js) pointing at the local copy:

```js
{
  id: "my-game",
  title: "My Game",                 // printed on the label
  tagline: "One short line.",
  url: "games/my-game/",
  repo: "https://github.com/bhumphrey/my-game",
  shell: "#5b5f6b",                 // cartridge plastic
  label: ["#79c8ff", "#2f6fb8"],    // label gradient, top → bottom
  palette: { X: "#1b1d24", r: "#ff3b3b" },
  sprite: [                         // label pixel art, "." = transparent
    "..XX..",
    ".XrrX.",
    "..XX..",
  ],
}
```

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page markup: marquee, TV, console, shelf |
| `style.css` | Look of the TV, console and cartridges |
| `arcade.js` | Builds the shelf and runs the insert-and-launch animation |
| `games.js` | The list of games |
| `games/` | One submodule per game |

## How the handoff works

Clicking a cartridge opens the lid over the slot and plugs the cartridge in; clicking it again
(or picking another one) puts it back on the shelf, and the lid closes once the slot is empty. Pressing POWER with a cartridge in turns on the TV, then goes to the local
copy in `games/<id>/` with `location.assign`. With no cartridge in, the TV shows NO CARTRIDGE and
switches back off. The game gets the whole page: no iframe or wrapper. The browser's Back
button returns to the arcade with the console off and every cartridge back on the shelf. Cmd/Ctrl-click opens a game in a new tab without the animation. With
reduced motion turned on, the animation is skipped.
