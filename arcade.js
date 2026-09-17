(() => {
  const games = window.GAMES || [];
  const $ = (id) => document.getElementById(id);
  const cartsEl = $("carts");
  const consoleEl = $("console");
  const screenText = $("screenText");
  const staticEl = $("static");
  const picture = $("picture");
  const tvScreen = $("screen");
  const led = $("led");
  const slot = $("slot");
  const powerBtn = $("power");
  const lid = $("lid");
  const rain = $("rain");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let busy = false;    // an animation is running
  let seated = null;   // { game, cart, el, scale, depth } for the cartridge in the slot

  // ---------- Shelf ----------
  for (const game of games) {
    const node = $("cartTemplate").content.cloneNode(true);
    const cart = node.querySelector(".cart");
    cart.href = game.url;
    cart.dataset.id = game.id;
    cart.setAttribute("aria-label", `Plug in ${game.title}: ${game.tagline}`);
    cart.style.setProperty("--shell", game.shell);
    cart.style.setProperty("--label-a", game.label[0]);
    cart.style.setProperty("--label-b", game.label[1]);
    node.querySelector(".cart-title").textContent = game.title;
    node.querySelector(".cart-tagline").textContent = game.tagline;
    drawSprite(node.querySelector(".cart-art"), game);

    cart.addEventListener("click", (e) => {
      // Let modified clicks (new tab, etc.) behave like a normal link.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      insert(cart, game);
    });
    cartsEl.appendChild(node);
  }

  function drawSprite(canvas, game) {
    const rows = game.sprite || [];
    canvas.width = Math.max(...rows.map((r) => r.length), 1);
    canvas.height = rows.length || 1;
    const ctx = canvas.getContext("2d");
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const color = game.palette?.[ch];
        if (ch === "." || !color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }

  powerBtn.addEventListener("click", power);

  // ---------- Helpers ----------
  const ms = (n) => (reducedMotion ? 0 : n);
  const wait = (n) => new Promise((r) => setTimeout(r, ms(n)));
  const play = (el, frames, opts) =>
    el.animate(frames, { fill: "forwards", ...opts, duration: ms(opts.duration) }).finished;
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const setScreen = (html) => { screenText.innerHTML = html; };

  let audio;
  function blip(freq, dur, type = "square", gain = 0.06, when = 0) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime + when;
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch { /* audio is optional */ }
  }
  const clunk = () => { blip(90, 0.08, "square", 0.12); blip(60, 0.12, "triangle", 0.15, 0.05); };

  // ---------- TV ----------
  async function tvOn() {
    tvScreen.classList.add("on");
    await play(picture, [
      { transform: "scale(1, .01)", filter: "brightness(4)" },
      { transform: "scale(1, 1)", filter: "brightness(1)" },
    ], { duration: 260, easing: "ease-out" });
    picture.getAnimations().forEach((a) => a.cancel());
  }
  async function tvOff() {
    await play(picture, [
      { transform: "scale(1, 1)", filter: "brightness(1)" },
      { transform: "scale(1, .01)", filter: "brightness(4)", offset: 0.6 },
      { transform: "scale(0, 0)", filter: "brightness(4)" },
    ], { duration: 240, easing: "ease-in" });
    tvScreen.classList.remove("on");
    picture.getAnimations().forEach((a) => a.cancel());
    setScreen("");
  }

  // ---------- Screensaver ----------
  // After a minute of the tab being visible with the slot empty, the TV rains green
  // characters for two seconds, then goes dark and the minute starts over.
  const IDLE_MS = 60_000;
  const RAIN_MS = 2_000;
  const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
  let idleTimer = null;
  let stopRain = null;

  function scheduleScreensaver() {
    clearTimeout(idleTimer);
    idleTimer = null;
    if (reducedMotion || seated || document.visibilityState !== "visible") return;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (busy || seated || tvScreen.classList.contains("on")) return scheduleScreensaver();
      matrixRain();
    }, IDLE_MS);
  }
  function cancelScreensaver() {
    stopRain?.();
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  function matrixRain() {
    const dpr = devicePixelRatio || 1;
    const w = rain.clientWidth;
    const h = rain.clientHeight;
    rain.width = w * dpr;
    rain.height = h * dpr;
    const ctx = rain.getContext("2d");
    ctx.scale(dpr, dpr);
    const size = Math.max(10, Math.round(w / 26));
    const cols = Math.ceil(w / size);
    const rows = Math.ceil(h / size);
    // Stagger the starts a little so columns don't fall as a flat line.
    const drops = Array.from({ length: cols }, () => -Math.floor(Math.random() * rows * 0.6));
    const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
    ctx.font = `${size}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const start = performance.now();
    let last = 0;
    let raf;
    let stopped = false;

    const frame = (t) => {
      if (t - start >= RAIN_MS) return stop();
      if (t - last >= 55) {
        last = t;
        ctx.fillStyle = "rgba(0, 0, 0, .16)"; // fade the trails
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < cols; i++) {
          const y = drops[i];
          const x = i * size + size / 2;
          if (y >= 0) {
            if (y > 0) { ctx.fillStyle = "#2fd35f"; ctx.fillText(glyph(), x, (y - 1) * size); }
            ctx.fillStyle = "#dcffe6"; // bright leading character
            ctx.fillText(glyph(), x, y * size);
          }
          drops[i] = y > rows && Math.random() > 0.85 ? -Math.floor(Math.random() * 4) : y + 1;
        }
      }
      raf = requestAnimationFrame(frame);
    };

    function stop() {
      if (stopped) return;
      stopped = true;
      stopRain = null;
      cancelAnimationFrame(raf);
      rain.classList.remove("on"); // fades out via CSS, then wipe it
      setTimeout(() => ctx.clearRect(0, 0, w, h), 300);
      scheduleScreensaver();
    }

    stopRain = stop;
    rain.classList.add("on");
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleScreensaver();
    else cancelScreensaver();
  });
  scheduleScreensaver();

  // ---------- Lid ----------
  // Swings through edge-on (scaleY 0) and swaps to the underside face halfway.
  const LID_UP = "scaleY(-2.2)";
  let lidOpen = false;
  async function setLid(open) {
    if (open === lidOpen) return;
    lidOpen = open;
    if (open) {
      blip(330, 0.05, "triangle", 0.08);
      await play(lid, [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 120, easing: "ease-in" });
      lid.classList.add("open");
      await play(lid, [{ transform: "scaleY(0)" }, { transform: LID_UP }], { duration: 240, easing: "cubic-bezier(.2,.8,.3,1.25)" });
      lid.style.transform = LID_UP;
    } else {
      await play(lid, [{ transform: LID_UP }, { transform: "scaleY(0)" }], { duration: 180, easing: "ease-in" });
      lid.classList.remove("open");
      await play(lid, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 110, easing: "ease-out" });
      lid.style.transform = "";
      blip(110, 0.07, "triangle", 0.12);
    }
    lid.getAnimations().forEach((a) => a.cancel());
  }

  // ---------- Cartridges ----------
  async function insert(cart, game) {
    if (busy) return;
    cancelScreensaver();
    if (seated?.cart === cart) return eject();
    busy = true;
    try {
      if (seated) await eject({ keepBusy: true });

      // Bring the console into view so the POWER button is reachable afterwards.
      const c = consoleEl.getBoundingClientRect();
      if (c.top < 0 || c.bottom > innerHeight) {
        scrollTo({ top: scrollY + c.top - innerHeight / 2 + c.height, behavior: reducedMotion ? "auto" : "smooth" });
        await wait(450);
      }

      const from = cart.getBoundingClientRect();
      const slotBox = slot.getBoundingClientRect();
      const scale = Math.min(1, (slotBox.width - 12) / from.width);
      const depth = from.height * scale * 0.5;
      const tx = slotBox.left + slotBox.width / 2 - (from.width * scale) / 2 - from.left;
      const ty = slotBox.top - 6 - from.height * scale - from.top;

      // Fly a copy so the shelf layout doesn't shift.
      const el = cart.cloneNode(true);
      // cloneNode copies the canvas element but not its pixels.
      el.querySelector(".cart-art").getContext("2d").drawImage(cart.querySelector(".cart-art"), 0, 0);
      el.removeAttribute("href");
      el.classList.add("flying");
      Object.assign(el.style, {
        left: `${from.left}px`, top: `${from.top}px`,
        width: `${from.width}px`, height: `${from.height}px`, transform: "none",
      });
      document.body.appendChild(el);
      cart.style.visibility = "hidden";

      // 1. Open the lid while the cartridge lifts off the shelf and hovers over the slot.
      const lidOpening = setLid(true);
      await play(el, [
        { transform: "translate(0,0) rotate(0) scale(1)" },
        { transform: `translate(${tx * 0.5}px, ${ty - 60}px) rotate(-6deg) scale(${(1 + scale) / 2})`, offset: 0.55 },
        { transform: `translate(${tx}px, ${ty}px) rotate(0) scale(${scale})` },
      ], { duration: 650, easing: "cubic-bezier(.3,.7,.3,1)" });
      await lidOpening;

      // 2. Push it down into the slot.
      el.classList.add("low");
      await play(el, [
        { transform: `translate(${tx}px, ${ty}px) scale(${scale})` },
        { transform: `translate(${tx}px, ${ty + depth}px) scale(${scale})` },
      ], { duration: 380, easing: "cubic-bezier(.5,0,.9,.6)" });
      clunk();

      // 3. Hand it to the console so it stays put when the page scrolls or resizes.
      const consoleBox = consoleEl.getBoundingClientRect();
      el.classList.remove("flying", "low");
      el.classList.add("seated");
      el.style.setProperty("--s", scale);
      Object.assign(el.style, {
        top: `${from.top + ty + depth - consoleBox.top}px`,
        transform: `scale(${scale})`,
      });
      consoleEl.appendChild(el);
      el.getAnimations().forEach((a) => a.cancel());
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", `Eject ${game.title}`);
      el.addEventListener("click", (e) => { e.preventDefault(); if (!busy) eject(); });
      el.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !busy) { e.preventDefault(); eject(); }
      });

      seated = { game, cart, el, scale, depth };
      centerSeated();
      powerBtn.classList.add("ready");
      powerBtn.setAttribute("aria-label", `Power on and play ${game.title}`);
      powerBtn.focus({ preventScroll: true });
    } finally {
      busy = false;
    }
  }

  function centerSeated() {
    if (!seated) return;
    const w = parseFloat(seated.el.style.width) * seated.scale;
    seated.el.style.left = `${(consoleEl.clientWidth - w) / 2}px`;
  }
  addEventListener("resize", centerSeated);

  async function eject({ keepBusy = false } = {}) {
    if (!seated) return;
    const { cart, el, scale, depth } = seated;
    seated = null;
    busy = true;
    powerBtn.classList.remove("ready");
    powerBtn.setAttribute("aria-label", "Power");
    try {
      // Back onto the page as a fixed element at the same spot.
      el.style.transform = `scale(${scale})`;
      const r = el.getBoundingClientRect();
      el.classList.remove("seated");
      el.classList.add("flying", "low");
      Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px` });
      document.body.appendChild(el);

      blip(140, 0.06, "square", 0.08);
      await play(el, [
        { transform: `translate(0,0) scale(${scale})` },
        { transform: `translate(0, ${-depth - 10}px) scale(${scale})` },
      ], { duration: 220, easing: "ease-out" });

      el.classList.remove("low");
      // Close the lid behind it, unless another cartridge is about to go in.
      const lidClosing = keepBusy ? null : setLid(false);
      const to = cart.getBoundingClientRect();
      await play(el, [
        { transform: `translate(0, ${-depth - 10}px) scale(${scale})` },
        { transform: `translate(${(to.left - r.left) / 2}px, ${Math.min(to.top, r.top) - r.top - 80}px) rotate(6deg) scale(${(1 + scale) / 2})`, offset: 0.45 },
        { transform: `translate(${to.left - r.left}px, ${to.top - r.top}px) rotate(0) scale(1)` },
      ], { duration: 600, easing: "cubic-bezier(.3,.7,.3,1)" });

      await lidClosing;
      el.remove();
      cart.style.visibility = "";
    } finally {
      if (!keepBusy) {
        busy = false;
        scheduleScreensaver();
      }
    }
  }

  // ---------- Power ----------
  async function power() {
    if (busy) return;
    cancelScreensaver();
    busy = true;
    powerBtn.classList.add("pressed");
    blip(220, 0.04, "square", 0.08);
    await wait(120);
    powerBtn.classList.remove("pressed");

    led.classList.add("on");
    await tvOn();
    staticEl.classList.add("on");
    await wait(seated ? 520 : 380);
    staticEl.classList.remove("on");

    if (!seated) {
      setScreen('<span class="big">NO CARTRIDGE</span><span class="small">Plug one in, then press POWER.</span>');
      blip(160, 0.25, "square", 0.05);
      await wait(1600);
      await tvOff();
      led.classList.remove("on");
      busy = false;
      scheduleScreensaver();
      return;
    }

    const { game } = seated;
    powerBtn.classList.remove("ready");
    setScreen(`<span class="big">${escapeHtml(game.title)}</span><span class="blink">LOADING</span>`);
    blip(660, 0.08, "square", 0.05);
    blip(990, 0.12, "square", 0.05, 0.09);
    await wait(650);

    // The screen grows to fill the page, then the game takes over.
    const s = tvScreen.getBoundingClientRect();
    const warp = document.createElement("div");
    warp.className = "warp";
    Object.assign(warp.style, { left: `${s.left}px`, top: `${s.top}px`, width: `${s.width}px`, height: `${s.height}px` });
    document.body.appendChild(warp);
    await play(warp, [
      { left: `${s.left}px`, top: `${s.top}px`, width: `${s.width}px`, height: `${s.height}px`, borderRadius: "14px", background: "#0b1410" },
      { left: "0px", top: "0px", width: "100vw", height: "100vh", borderRadius: "0px", background: "#000" },
    ], { duration: 420, easing: "cubic-bezier(.7,0,.3,1)" });

    location.assign(game.url);
  }

  // Coming back with the Back button can restore this page from the bfcache with the
  // console still on. Start over: power off, every cartridge back on the shelf.
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    document.querySelectorAll(".cart.flying, .cart.seated, .warp").forEach((el) => el.remove());
    document.querySelectorAll(".cart").forEach((el) => { el.style.visibility = ""; });
    led.classList.remove("on");
    staticEl.classList.remove("on");
    tvScreen.classList.remove("on");
    powerBtn.classList.remove("ready", "pressed");
    powerBtn.setAttribute("aria-label", "Power");
    setScreen("");
    lid.getAnimations().forEach((a) => a.cancel());
    lid.classList.remove("open");
    lid.style.transform = "";
    lidOpen = false;
    seated = null;
    busy = false;
    cancelScreensaver();
    scheduleScreensaver();
  });
})();
