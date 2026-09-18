// The cartridge shelf. Each game lives in its own repo and is checked out here as a
// git submodule under games/<id>/. To add a game, add the submodule and append an entry.
//
//   id       unique slug
//   title    name printed on the label (keep it short)
//   tagline  one line under the title
//   url      path to the game's page, relative to this site (games/<id>/)
//   repo     source repo (for reference)
//   shell    cartridge plastic color
//   label    label background [top, bottom]
//   sprite   pixel art for the label: rows of characters, one per pixel;
//            "." is transparent, every other character is a key in `palette`
window.GAMES = [
  {
    id: "dronehunt",
    title: "Drone Hunt",
    tagline: "Clear the sky. Mind the reload.",
    url: "games/dronehunt/",
    repo: "https://github.com/bhumphrey/dronehunt",
    shell: "#5b5f6b",
    label: ["#79c8ff", "#2f6fb8"],
    palette: { X: "#1b1d24", g: "#8a8f9c", r: "#ff3b3b", w: "#e9eef7" },
    sprite: [
      "XXX......XXX",
      "XgX......XgX",
      "XXXX....XXXX",
      "...XX..XX...",
      "....XXXX....",
      "....XrrX....",
      "....XXXX....",
      "...XX..XX...",
      "XXXX....XXXX",
      "XgX......XgX",
      "XXX......XXX",
    ],
  },
  {
    id: "datacenterseige",
    title: "Datacenter Siege",
    tagline: "Rocks versus servers.",
    url: "games/datacenterseige/",
    repo: "https://github.com/bhumphrey/datacenterseige",
    shell: "#3f5a3a",
    label: ["#ffcf6b", "#d0612a"],
    palette: { X: "#1b1d24", a: "#4a5160", g: "#6cff6c", o: "#8b7a66", d: "#5a4c3d" },
    sprite: [
      "..........oo",
      ".........odo",
      "XXXXXXXXX.o.",
      "XaaaaaaaX...",
      "XagaaagaX...",
      "XXXXXXXXX...",
      "XaaaaaaaX...",
      "XaaagaaaX...",
      "XXXXXXXXX...",
      "XagaaaaaX...",
      "XXXXXXXXX...",
      ".X.....X....",
    ],
  },
  {
    id: "liar-liar",
    title: "Liar Liar",
    tagline: "Pick the lie. Light the pants.",
    url: "games/liar-liar/",
    repo: "https://github.com/bhumphrey/liar-liar",
    shell: "#8a2f2f",
    label: ["#fff1b8", "#ff8a3d"],
    palette: { r: "#d62b1f", o: "#ff7a1a", y: "#ffd23f", w: "#fffbe6" },
    sprite: [
      ".....r......",
      "....rr...r..",
      "....ror..rr.",
      "...roor.ror.",
      "..rroyorrorr",
      "..royyyoroor",
      ".rroyyyyooor",
      ".royywwyyor.",
      ".royywwwyyor",
      "..royywwyor.",
      "...rooooor..",
      "....rrrrr...",
    ],
  },
  {
    id: "patriot",
    title: "We The People",
    tagline: "Hold the Capitol steps.",
    url: "games/patriot/",
    repo: "https://github.com/bhumphrey/patriot",
    shell: "#23345e",
    label: ["#eadbb4", "#c49f5e"],
    palette: { P: "#4a3a28", b: "#1f3f8f", s: "#ffffff", r: "#c8202f", w: "#ffffff" },
    sprite: [
      "Pbsbsbrrrrrr",
      "Pbbsbbwwwwww",
      "Pbsbsbrrrrrr",
      "Pbbsbbwwwwww",
      "Prrrrrrrrrrr",
      "Pwwwwwwwwwww",
      "Prrrrrrrrrrr",
      "P...........",
      "P...........",
      "P...........",
      "P...........",
      "PP..........",
    ],
  },
];
