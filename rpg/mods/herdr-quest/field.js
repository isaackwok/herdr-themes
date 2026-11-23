// The overworld (the "field" child of the stage stack): a village you walk.
//
// Every space is a house, and its agents live inside. Outside, each house shows
// what goes on within: chimney smoke, a glowing window and "in progress" while
// an agent works; a bouncing ‼ and "needs you" when one waits for you; "done!"
// when one has finished; "resting" when all are idle; and how many live there.
// Face a house and press Space (or Enter), or click it, to go in: Herdr switches
// to that space. Inside, the agents stand around the room looking like their
// tab icons (Clawd for Claude Code); face one and press Space to speak, and its
// live terminal opens in a window. The quest board, bookshelf and chest open
// that space's Quests, Chronicle and Inventory. Walk out the door (or Esc) to
// leave, back in front of the house.
//
// The village plaza holds the quest board, campfire (party), chest (Files),
// lectern (Changes), the well (summon) and the signpost (spellbook).
//
// Popups the field opens (palette, finder, menus) hand the keyboard back to it when they
// close (see popup()); otherwise Herdr would give it to a terminal hidden behind the village.
//
// Keys (while the field has the keyboard; click it to take control):
//   arrows / WASD / hjkl  walk      Space / Enter / Z  enter, speak, use
//   Q quests  P party  M map  I inventory  C chronicle  Tab command menu
//   N summon  G spellbook  F scout  O camp (settings)  ? lore (help)
//   Esc leave a house (after closing windows)   B the workshop (terminals); Cmd-E toggles
// Mod commands herdr-quest.up|down|left|right|speak|leave do the same from keys.json.

import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, spaces, run, openOverlay, checking, nextCommand, shared, setShared, exec } from "herdr";
import { C, root, openMenu, clean, STATUS, statusGlyph, togglePanel, layoutCommand, syncParty, stop, toBattle, BAR } from "./kit.js";

const TILE = 32;
// Walking: a tile takes two ticks of HALF ms. The first tick starts the glide on a
// stride frame, the second shows the stand frame mid-glide (two frames per tile,
// left and right strides in turn). The glide lasts exactly one tile's time, so
// held keys chain tiles into one continuous walk.
const HALF = 60; // ms: half a tile, so a tile takes 120 ms (about 8 tiles a second)
const ART = "mods/herdr-quest/art";
const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEY = { up: "up", down: "down", left: "left", right: "right", w: "up", s: "down", a: "left", d: "right", k: "up", j: "down", h: "left", l: "right" };
const HOT = { q: "journal", p: "party", m: "map", i: "files", c: "changes" };
const ROBES = ["blue", "green", "purple", "red", "teal", "orange"];
const ROBE_OF = { claude: "orange", "claude-code": "orange", codex: "teal", gemini: "blue", cursor: "purple", opencode: "green", pi: "red" };

function hash(s) {
  let h = 0;
  for (const ch of String(s ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
const noise = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
const robe = (a) => ROBE_OF[a.program?.key] ?? ROBE_OF[a.app] ?? ROBES[hash(a.address) % ROBES.length];
const key = (x, y) => `${x},${y}`;

function heroName(a) {
  const live = clean(a.title);
  const telling = live && live !== a.address && live !== a.program?.name && !/^[~/]/.test(live) && !live.includes("@");
  return telling ? live : a.program?.name ?? "Hero";
}

const THINGS = {
  well: { title: "The Well of Summoning.", line: "Toss in a coin and a hero answers. [N]", hint: "Space: summon" },
  sign: { title: "A signpost.", line: "\"All spells are written in the Spellbook.\" [G]", hint: "Space: read" },
  board: { title: "The quest board.", line: "Every quest is pinned here. [Q]", hint: "Space: read" },
  chest: { title: "A treasure chest.", line: "This realm's files: your inventory. [I]", hint: "Space: open" },
  lectern: { title: "The Chronicle.", line: "What has changed in this realm (git). [C]", hint: "Space: read" },
  fire: { title: "The campfire.", line: "Your whole party, from every house. [P]", hint: "Space: rest" },
  mat: { title: "The door.", line: "Step out to return to the village.", hint: "Walk out · Esc" },
};
const LEGEND = "Q quests · P party · M map · I items · C chronicle · N summon · Tab menu · ? help";

const LINES = {
  blocked: "‼ I await your orders, commander!",
  working: "Hard at work on your quest. Come and watch?",
  done: "☼ My task is done! Come and see what I've made.",
  idle: "Zzz... ready for a new quest.",
};

// ---- the village: houses outside, the plaza by the gate

function village(cols, rows, realms) {
  const ground = [];
  const solid = new Set();
  const things = new Map(); // "x,y" -> { kind, ... }: what Space acts on
  for (let y = 0; y < rows; y++) {
    ground.push([]);
    for (let x = 0; x < cols; x++) ground[y].push(noise(x, y) % 11 === 0 ? `flowers-${noise(y, x) % 2}` : `grass-${noise(x + 1, y) % 2}`);
  }
  const blocks = [];
  for (let x = 0; x < cols; x++) blocks.push([x, 0, "tree"], [x, rows - 1, "tree"]);
  for (let y = 1; y < rows - 1; y++) blocks.push([0, y, "tree"], [cols - 1, y, "tree"]);
  for (const [x, y] of blocks) solid.add(key(x, y));

  const spawnX = Math.floor(cols / 2);
  // Houses in bands: house (2 rows), road (1), front yard (1), a row of trees' worth of air (1).
  const per = Math.max(1, Math.floor((cols - 2) / 6));
  const bands = Math.max(0, Math.floor((rows - 6) / 5));
  const houses = [];
  let overflow = 0;
  realms.forEach((s, i) => {
    const band = Math.floor(i / per);
    if (band >= bands) {
      overflow++;
      return;
    }
    const x = 2 + (i % per) * 6;
    const y = 1 + band * 5;
    houses.push({ x, y, space: s });
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      solid.add(key(x + dx, y + dy));
      things.set(key(x + dx, y + dy), { kind: "house", space: s, x, y });
    }
  });
  const used = Math.min(bands, Math.ceil(realms.length / per));
  for (let band = 0; band < used; band++) for (let x = 1; x < cols - 1; x++) ground[1 + band * 5 + 2][x] = "path";
  const lastRoad = used > 0 ? 1 + (used - 1) * 5 + 2 : 1;
  for (let y = lastRoad; y < rows - 1; y++) if (!solid.has(key(spawnX, y))) ground[y][spawnX] = "path";

  // The plaza by the gate.
  const objects = [];
  const plazaY = Math.max(lastRoad + 2, rows - 3);
  const PLAZA = [
    { kind: "lectern", panel: "changes", dx: -6, dy: 0 },
    { kind: "board", panel: "journal", dx: -4, dy: 0 },
    { kind: "sign", dx: -2, dy: 1 },
    { kind: "chest", panel: "files", dx: 2, dy: 0 },
    { kind: "well", dx: 4, dy: 0 },
    { kind: "fire", panel: "party", dx: 6, dy: 0 },
  ];
  for (const o of PLAZA) {
    const x = spawnX + o.dx;
    const y = Math.min(rows - 2, plazaY + o.dy);
    if (x < 1 || x > cols - 2 || y <= lastRoad || solid.has(key(x, y))) continue;
    solid.add(key(x, y));
    things.set(key(x, y), { kind: o.kind, panel: o.panel });
    objects.push({ ...o, x, y });
  }
  // A pond in the lower right corner, where nothing stands.
  if (cols >= 20 && rows >= 10)
    for (let y = rows - 4; y < rows - 1; y++)
      for (let x = cols - 6; x < cols - 1; x++) {
        if (solid.has(key(x, y)) || y <= lastRoad || (x === cols - 6 && y === rows - 4)) continue;
        ground[y][x] = `water-${(x + y) % 2}`;
        solid.add(key(x, y));
      }
  return { cols, rows, ground, blocks, houses, npcs: [], objects, solid, things, overflow, door: null, spawn: [spawnX, rows - 2] };
}

// ---- inside a house: a room for that space's agents

function interior(cols, rows, space, party) {
  const ground = [];
  const solid = new Set();
  const things = new Map();
  for (let y = 0; y < rows; y++) ground.push(new Array(cols).fill("floor"));
  const spawnX = Math.floor(cols / 2);
  const door = [spawnX, rows - 1];
  const blocks = [];
  for (let x = 0; x < cols; x++) {
    blocks.push([x, 0, "wall"], [x, 1, "wall"]);
    if (x !== spawnX) blocks.push([x, rows - 1, "wall"]);
  }
  for (let y = 2; y < rows - 1; y++) blocks.push([0, y, "wall"], [cols - 1, y, "wall"]);
  for (const [x, y] of blocks) solid.add(key(x, y));
  ground[door[1]][door[0]] = "mat";
  things.set(key(...door), { kind: "mat" });

  // Along the back wall: this house's quest board, bookshelf (Chronicle) and chest.
  const objects = [];
  for (const o of [
    { kind: "board", panel: "journal", x: 2 },
    { kind: "lectern", panel: "changes", x: 4 },
    { kind: "chest", panel: "files", x: cols - 3 },
  ]) {
    if (o.x < 1 || o.x > cols - 2 || solid.has(key(o.x, 2))) continue;
    const it = { ...o, y: 2 };
    solid.add(key(it.x, it.y));
    things.set(key(it.x, it.y), { kind: it.kind, panel: it.panel });
    objects.push(it);
  }

  // The agents, in rows with a walkway between (their name plates hang under them).
  const members = party.filter((a) => a.space === space.id);
  const npcs = [];
  let overflow = 0;
  const xs = [];
  for (let x = 3; x <= cols - 4; x += 3) xs.push(x);
  const ys = [];
  for (let y = 4; y <= rows - 4; y += 3) ys.push(y);
  members.forEach((a, i) => {
    const x = xs[i % xs.length];
    const y = ys[Math.floor(i / xs.length)];
    if (x === undefined || y === undefined) {
      overflow++;
      return;
    }
    npcs.push({ x, y, agent: a });
    solid.add(key(x, y));
    things.set(key(x, y), { kind: "npc", agent: a });
  });
  return { cols, rows, ground, blocks, houses: [], npcs, objects, solid, things, overflow, door, spawn: [spawnX, rows - 2], inside: space };
}

export default class Field {
  init(_p, cx) {
    this.handle = cx.focus_handle();
    this.size = null;
    this.facing = "down";
    this.frame = 0; // 0 stand, 1 right stride, 2 left stride
    this.stride = 1;
    this.held = []; // directions held, latest last
    this.walker = null;
    this.phase = 0;
    this.note = null;
    this.scene = null; // the space whose house we're in, or null outside
    this.outside = null; // { pos, facing } in front of the house we went into
    try {
      const saved = JSON.parse(localStorage.getItem("hero") ?? "null");
      if (Array.isArray(saved?.pos)) this.pos = saved.pos;
      if (STEP[saved?.facing]) this.facing = saved.facing;
      if (typeof saved?.scene === "string") this.scene = saved.scene;
      if (Array.isArray(saved?.outside?.pos)) this.outside = saved.outside;
    } catch {}
    if (checking()) return;
    // Key commands ("herdr-quest.up" ... in keys.json, or herdr-app do): walk and speak without focus.
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        const w = this.world;
        if (c === "focus") {
          this.handle.focus();
          cx.notify();
          continue;
        }
        if (c === "picker") {
          this.popup(cx, () => run("mod.open", { name: "picker" }));
          continue;
        }
        if (c === "palette") {
          this.popup(cx, () => run("app.palette"));
          continue;
        }
        if (c === "leave") {
          if (this.scene) this.leave();
          cx.notify();
          continue;
        }
        if (layoutCommand(c, "field")) continue;
        if (!w) continue;
        if (STEP[c]) {
          this.walk(c, w);
          // One step from a command: settle back to standing after the glide.
          cx.timer.after(HALF * 2, (cx) => {
            if (!this.walker) {
              this.frame = 0;
              cx.notify();
            }
          });
        } else if (c === "speak") this.act(w, cx);
        else continue;
        cx.notify();
      }
    });
  }

  save() {
    try {
      localStorage.setItem("hero", JSON.stringify({ pos: this.pos, facing: this.facing, scene: this.scene, outside: this.outside }));
    } catch {}
  }

  ahead() {
    if (!STEP[this.facing]) this.facing = "down";
    const [dx, dy] = STEP[this.facing];
    return [this.pos[0] + dx, this.pos[1] + dy];
  }

  /** One tile toward dir: faces it, moves if free (on a stride frame). Returns whether it moved. */
  walk(dir, w) {
    if (!STEP[dir] || !w) return false;
    this.facing = dir;
    const [dx, dy] = STEP[dir];
    const nx = this.pos[0] + dx;
    const ny = this.pos[1] + dy;
    this.note = null;
    if (nx < 0 || ny < 0 || nx >= w.cols || ny >= w.rows || w.solid.has(key(nx, ny))) {
      this.frame = 0;
      return false;
    }
    this.pos = [nx, ny];
    this.frame = this.stride;
    this.stride = this.stride === 1 ? 2 : 1;
    // Out through the door.
    if (w.door && nx === w.door[0] && ny === w.door[1]) {
      this.stopWalk();
      this.leave();
      return true;
    }
    this.save();
    return true;
  }

  /** Starts walking toward the latest held direction, and keeps going while it's held. */
  startWalk(cx) {
    const dir = this.held[this.held.length - 1];
    if (!STEP[dir] || !this.world) return;
    this.phase = 0;
    this.walk(dir, this.world);
    this.walker?.cancel();
    this.walker = cx.timer.every(HALF, (cx) => this.tick(cx));
  }

  tick(cx) {
    this.phase ^= 1;
    // Mid-glide: the stand frame, whatever is held.
    if (this.phase === 1) {
      this.frame = 0;
      cx.notify();
      return;
    }
    // A tile's end: walk on only while a direction is still held and the field has the keyboard.
    if (!this.handle.is_focused()) this.held = [];
    const dir = this.held[this.held.length - 1];
    if (!STEP[dir] || !this.world) {
      this.stopWalk();
      cx.notify();
      return;
    }
    this.walk(dir, this.world);
    cx.notify();
  }

  stopWalk() {
    this.walker?.cancel();
    this.walker = null;
    this.held = [];
    this.frame = 0;
    this.phase = 0;
  }

  async close() {
    this.walker?.cancel();
  }

  // ---- houses

  /** Goes into a space's house: Herdr shows that space, the hero stands inside the door. */
  enter(house, cx) {
    const s = house.space;
    this.stopWalk();
    this.outside = { pos: [house.x, house.y + 2], facing: "down" };
    this.scene = s.id;
    this.pos = null; // the room's spawn, inside the door
    this.facing = "up";
    this.note = `You enter the house of ${s.name}.`;
    if (!s.active) {
      run("space.select", { id: s.id });
      // Herdr hands the keyboard to the new space's terminal (hidden behind the village):
      // take it back once the switch has landed, so walking keeps working.
      this.reclaim(cx);
    }
    this.save();
  }

  /** Back out to the village, in front of the house. */
  leave() {
    const name = spaces().find((s) => s.id === this.scene)?.name;
    this.scene = null;
    this.pos = this.outside?.pos ?? null;
    this.facing = "down";
    this.note = name ? `You step out of ${name}.` : null;
    this.save();
  }

  act(w, cx) {
    const [x, y] = this.ahead();
    const it = w.things.get(key(x, y));
    if (!it) return;
    if (it.kind === "npc") this.speak(it.agent);
    else if (it.kind === "house") this.enter(it, cx);
    else if (it.kind === "mat") this.leave();
    else this.use(it, cx);
  }

  /**
   * Opens a popup (the palette, the finder, a menu...) and takes the keyboard back once it
   * closes. Herdr returns the keyboard to the space's terminal (hidden behind the village),
   * and sends no "focus" for focus a mod took itself, so the field watches the overlay list
   * (herdr-app status) until the popup it opened has gone.
   */
  popup(cx, open) {
    if (!cx) return open();
    const overlays = async () => {
      try {
        const r = await exec("herdr-app", ["status"], { timeout: 3000 });
        return JSON.parse(r.stdout).overlays ?? [];
      } catch {
        return null;
      }
    };
    const wait = (cx, ms) => new Promise((done) => cx.timer.after(ms, () => done()));
    cx.spawn(async (cx) => {
      const before = await overlays();
      open();
      if (!before) return this.reclaim(cx);
      const start = Date.now();
      let shown = false;
      for (;;) {
        await wait(cx, 200);
        const now = await overlays();
        if (!now) return;
        if (now.length > before.length) shown = true;
        else if (shown) break; // it opened and has closed
        else if (Date.now() - start > 2500) return; // it never opened
        if (Date.now() - start > 30 * 60 * 1000) return;
      }
      if (!this.handle.is_focused()) {
        this.handle.focus();
        cx.notify();
      }
      // Herdr may hand the keyboard to the terminal a moment after the popup has gone.
      this.reclaim(cx);
    });
  }

  /** Takes the keyboard back after something moved it to a (hidden) terminal. */
  reclaim(cx) {
    if (!cx) return;
    for (const ms of [60, 250]) {
      cx.timer.after(ms, (cx) => {
        if (!this.handle.is_focused()) {
          this.handle.focus();
          cx.notify();
        }
      });
    }
  }

  /** Uses a thing (Space facing it, or a click). */
  use(it, cx) {
    if (it.panel) togglePanel(it.panel);
    else if (it.kind === "well") this.popup(cx, () => openMenu("summon", {}, 16, 300));
    else if (it.kind === "sign") this.popup(cx, () => run("app.palette"));
  }

  speak(a) {
    const id = openOverlay({
      kind: "window",
      key: `hq-talk-${a.address}`,
      width: 780,
      height: 470,
      layout: {
        type: "column",
        children: [
          {
            type: "block",
            size: { px: 34 },
            background: BAR,
            content: { mod: "herdr-quest", props: { role: "talk", terminal: a.address } },
          },
          { type: "block", background: "background", content: { terminal: a.address } },
        ],
      },
    });
    // Registered here (and by its title bar) so Esc can close it.
    if (id) {
      const talks = { ...(shared("hq.talks") ?? {}) };
      delete talks[a.address];
      setShared("hq.talks", { ...talks, [a.address]: id });
    }
    run("pane.focus", { terminal: a.address });
    this.note = `You speak with ${heroName(a)}.`;
  }

  describe(w, party) {
    if (this.note) return { title: this.note, line: w.inside ? LEGEND : "" };
    const [x, y] = this.ahead();
    const it = w.things.get(key(x, y));
    if (it?.kind === "npc") {
      const a = it.agent;
      return {
        title: `${heroName(a)} · ${a.program?.name ?? "Hero"} · quest ${a.tab_index}`,
        line: `"${LINES[a.status] ?? LINES.idle}"`,
        color: STATUS[a.status]?.color,
        hint: "Space: speak",
      };
    }
    if (it?.kind === "house") {
      const s = it.space;
      const n = party.filter((a) => a.space === s.id).length;
      const st = s.status && n ? ` · ${STATUS[s.status]?.word ?? ""}` : "";
      return {
        title: `The house of ${s.name}.`,
        line: `${n ? `${n} hero${n === 1 ? " lives" : "es live"} here` : "Nobody lives here yet"}${st} · ${s.tabs.length} quest${s.tabs.length === 1 ? "" : "s"}`,
        color: s.status && n ? STATUS[s.status]?.color : undefined,
        hint: "Space: enter",
      };
    }
    if (it && THINGS[it.kind]) return THINGS[it.kind];
    if (w.inside) {
      const n = w.npcs.length;
      return {
        title: n
          ? `Inside ${w.inside.name}: ${n} hero${n === 1 ? "" : "es"}.${w.overflow ? ` ${w.overflow} more upstairs.` : ""}`
          : `Nobody's home in ${w.inside.name}. Press N to summon a hero.`,
        line: LEGEND,
        hint: "Door / Esc: leave",
      };
    }
    const blocked = party.filter((a) => a.status === "blocked");
    if (blocked.length)
      return { title: `‼ ${heroName(blocked[0])} awaits your orders in ${blocked[0].space_name}!`, color: C.red, line: LEGEND, hint: "Space: enter a house" };
    return {
      title: `${party.length} hero${party.length === 1 ? "" : "es"} live in ${w.houses.length} house${w.houses.length === 1 ? "" : "s"}.${w.overflow ? ` ${w.overflow} more beyond the hills.` : ""}`,
      line: LEGEND,
      hint: "Arrows walk · Space enter · B workshop",
    };
  }

  // ---- drawing

  /** An agent, drawn as its tab icon on a shadow, with its status bubble. */
  npc(a, x, y, S, at, label) {
    const prog = a.program;
    const size = Math.round((S * 13) / 16);
    const x0 = Math.round((S - size) / 2);
    const y0 = S - size - Math.round(S / 16);
    const look = prog?.icon
      ? prog.tint
        ? svg(prog.icon).w(size).h(size).text_color(prog.tile ?? prog.color ?? C.text)
        : image(prog.icon).w(size).h(size)
      : null;
    const body = look
      ? div().absolute().left(x0).top(y0).w(size).h(size).child(look)
      : div().absolute().left(0).top(0).child(image(`${ART}/npc-${robe(a)}.svg`).w(S).h(S));
    const top = look ? y0 : 0;
    const left = look ? x0 : 0;
    // Working: quick little hops. Done: a big, slow victory jump. Needs you: shakes.
    // Resting: stands still.
    const sprite =
      a.status === "working"
        ? body.loop("top", { from: top, to: top - Math.round(S / 8), period: 420, easing: "ease-out" })
        : a.status === "done"
          ? body.loop("top", { from: top, to: top - Math.round(S / 3.5), period: 900, easing: "ease-out" })
          : a.status === "blocked"
          ? body.loop("left", { from: left - Math.max(1, Math.round(S / 24)), to: left + Math.max(1, Math.round(S / 24)), period: 160 })
          : body;
    // Motion tells the state; only "needs you" also gets a bubble (‼), to be seen from afar.
    const bubble = a.status === "blocked";
    return at(div().id(`hq-npc-${a.address}`).w(S).h(S), x, y)
      .cursor_pointer()
      .on_mouse_down("left", stop)
      .tooltip(`${heroName(a)} (${a.program?.name ?? "Hero"}): ${STATUS[a.status]?.word ?? ""}`)
      .on_click(() => this.speak(a))
      .when(Boolean(look), (el) =>
        el.child(div().absolute().left(Math.round(S * 0.18)).top(S - Math.round(S / 8)).w(Math.round(S * 0.64)).h(Math.round(S / 10)).rounded_full().bg("#0000004d")),
      )
      .child(sprite)
      .when(bubble, (el) =>
        el.child(div().absolute().top(-14).left(S / 2 - 6).px(1).rounded(3).bg(C.select).border(1).border_color(STATUS[a.status]?.color ?? C.dim).child(statusGlyph(a.status))),
      )
      .when(Boolean(label), (el) =>
        el.child(
          div()
            .absolute()
            .top(S + 2)
            .left(-S / 2)
            .w(S * 2)
            .flex()
            .justify_center()
            .child(div().px(3).max_w(S * 2).h(16).rounded(3).bg("#efe2c4e6").border(1).border_color(C.silver).text_color(C.text).truncate().child(label)),
        ),
      );
  }

  /** What a house shows outside: smoke, light, a bouncing alarm, and its plaque. */
  houseSigns(h, S, party) {
    const s = h.space;
    const n = party.filter((a) => a.space === s.id).length;
    const st = n ? s.status : null;
    const px = (v) => Math.round((S * 2 * v) / 32); // art pixels of the 32 px house
    const ox = h.x * S;
    const oy = h.y * S;
    const out = [];
    if (st === "working") {
      // Smoke from the chimney: three puffs rising at different paces.
      [0, 1, 2].forEach((i) => {
        const size = Math.round(S / 4) + i * 3;
        const cx = ox + px(23) + (i - 1) * 3;
        const cy = oy + px(1);
        out.push(
          div()
            .absolute()
            .left(cx)
            .top(cy)
            .loop("top", { from: cy, to: cy - Math.round(S * 0.9), period: 1500 + i * 350, easing: "ease-out" })
            .child(div().size(size).rounded_full().bg("#f4efe6").loop("opacity", { from: 0.95, to: 0.1, period: 1500 + i * 350, easing: "ease-in" })),
        );
      });
    }
    if (st === "working" || st === "blocked") {
      // The window glows: warm while someone works, red when someone needs you.
      out.push(
        div()
          .absolute()
          .left(ox + px(19))
          .top(oy + px(20))
          .w(px(6))
          .h(px(4))
          .bg(st === "blocked" ? "#ff5a3c" : "#ffcf5a")
          .loop("opacity", { from: 0.1, to: 0.75, period: st === "blocked" ? 500 : 1100 }),
      );
    }
    if (st === "blocked") {
      // A ‼ bouncing over the roof, seen from across the village.
      const by = oy - 12;
      out.push(
        div()
          .absolute()
          .left(ox + S - 12)
          .top(by)
          .loop("top", { from: by, to: by - 8, period: 450, easing: "ease-out" })
          .px(4)
          .rounded(4)
          .bg(C.win)
          .border(2)
          .border_color(C.red)
          .text_color(C.red)
          .child("‼"),
      );
    }
    // The plaque beside the door (clear of the road, where the hero stands): name,
    // what's going on inside, who lives there.
    const state =
      st === "working"
        ? div().flex_none().text_color(C.green).frames(["in progress·  ", "in progress·· ", "in progress···"], 400).child("in progress···")
        : st === "blocked"
          ? div().flex_none().text_color(C.red).loop("opacity", { from: 0.35, to: 1, period: 700 }).child("‼ needs you")
          : st === "done"
            ? div().flex_none().text_color(C.amber).child("☼ done!")
            : n
              ? div().flex_none().text_color(C.dim).child("z resting")
              : null;
    out.push(
      h_flex()
        .absolute()
        .left(ox + S * 2 + 4)
        .top(oy + S + Math.round(S / 2) - 9)
        .max_w(S * 4 - 8)
        .h(18)
        .px(4)
        .gap(6)
        .items_center()
        .rounded(3)
        .bg("#efe2c4ee")
        .border(1)
        .border_color(st === "blocked" ? C.red : C.silver)
        .child(div().flex_none().max_w(S * 3).truncate().text_color(s.active ? C.gold : C.text).child(`${s.active ? "►" : "⌂"}${s.name}`))
        .when(Boolean(state), (el) => el.child(state))
        .when(n > 0, (el) => el.child(div().flex_none().text_color(C.muted).child(`☺${n}`))),
    );
    return out;
  }

  render(_cx) {
    const party = syncParty(); // agent.next/prev order and the Dock badge, now that no sidebar shows the party
    const box = this.size ?? { width: 640, height: 400 };
    // Tiles are whole multiples of the 16 px art: as big as still leaves an 18 x 11 village.
    const S = [64, 48, 32].find((t) => Math.floor(box.width / t) >= 18 && Math.floor(box.height / t) >= 11) ?? TILE;
    const cols = Math.max(12, Math.floor(box.width / S));
    const rows = Math.max(9, Math.floor(box.height / S));
    const all = spaces();
    let home = this.scene ? all.find((s) => s.id === this.scene) : null;
    if (this.scene && !home) {
      // The space went away while we were inside: back outside.
      this.scene = null;
      this.pos = this.outside?.pos ?? null;
    }
    const w = home ? interior(cols, rows, home, party) : village(cols, rows, all);
    this.world = w;
    const bad = (p) => !p || p[0] < 0 || p[1] < 0 || p[0] >= cols || p[1] >= rows || w.solid.has(key(p[0], p[1])) || (w.door && p[0] === w.door[0] && p[1] === w.door[1]);
    if (bad(this.pos)) this.pos = w.spawn;
    const focused = this.handle.is_focused();
    const say = this.describe(w, party);
    const at = (el, x, y) => el.absolute().left(x * S).top(y * S);
    const tile = (name, x, y, size = S) => at(image(`${ART}/${name}.svg`).w(size).h(size), x, y);

    const map = div()
      .relative()
      .flex_none()
      .w(cols * S)
      .h(rows * S)
      .bg(home ? "#b8875a" : "#5f8a62")
      .children(w.ground.flatMap((row, y) => row.map((g, x) => tile(g, x, y, S + 1))))
      .children(w.blocks.map(([x, y, sprite]) => tile(sprite, x, y, sprite === "wall" ? S + 1 : S)))
      .children(
        w.houses.map((h) =>
          at(div().id(`hq-house-${h.space.id}`).w(S * 2).h(S * 2), h.x, h.y)
            .cursor_pointer()
            .tooltip(`Enter the house of ${h.space.name}`)
            .on_mouse_down("left", stop)
            .on_click((_e, cx) => this.enter(h, cx))
            .child(image(`${ART}/house.svg`).w(S * 2).h(S * 2)),
        ),
      )
      .children(w.houses.flatMap((h) => this.houseSigns(h, S, party)))
      .children(
        w.objects.map((o) =>
          at(div().id(`hq-obj-${o.kind}`).w(S).h(S), o.x, o.y)
            .cursor_pointer()
            .tooltip(THINGS[o.kind]?.title ?? o.kind)
            .on_mouse_down("left", stop)
            .on_click((_e, cx) => this.use(o, cx))
            .child(image(`${ART}/${o.kind === "fire" ? "fire-0" : o.kind}.svg`).absolute().left(0).top(0).w(S).h(S))
            .when(o.kind === "fire", (el) =>
              el.child(image(`${ART}/fire-1.svg`).absolute().left(0).top(0).w(S).h(S).loop("opacity", { from: 0, to: 1, period: 500 })),
            ),
        ),
      )
      .children(w.npcs.map((n) => this.npc(n.agent, n.x, n.y, S, at, `${n.agent.tab_index}·${heroName(n.agent)}`)))
      .child(
        div()
          // One element per scene: entering or leaving places the hero, it doesn't glide across.
          .id(`hq-hero-${home?.id ?? "village"}`)
          .absolute()
          .left(this.pos[0] * S)
          .top(this.pos[1] * S)
          .transition("left", { duration: HALF * 2, easing: "linear" })
          .transition("top", { duration: HALF * 2, easing: "linear" })
          // A one-pixel bob on stride frames.
          .child(
            div()
              .relative()
              .top(this.frame ? -S / 16 : 0)
              .child(image(`${ART}/hero-${this.facing}-${this.frame}.svg`).w(S).h(S)),
          ),
      );

    return root(v_flex())
      .id("hq-field")
      .track_focus(this.handle)
      .size_full()
      .min_h(0)
      .bg(home ? "#2a1a0e" : "#26392a")
      .on_mouse_down("left", () => this.handle.focus())
      .on_key_down((e, cx) => {
        const mods = e.modifiers ?? {};
        if (mods.control || mods.platform || mods.alt) return;
        const k = String(e.key ?? "").toLowerCase();
        const dir = KEY[k];
        if (dir) {
          // The walker repeats on its own beat; the system's key repeat is ignored.
          if (e.is_held && this.walker) {
            cx.stop_propagation();
            return;
          }
          this.held = [...this.held.filter((d) => d !== dir), dir];
          if (!this.walker) this.startWalk(cx);
        } else if (k === "enter" || k === "space" || k === "z") this.act(w, cx);
        else if (HOT[k]) togglePanel(HOT[k]);
        else if (k === "tab") togglePanel("command");
        else if (k === "b") toBattle();
        else if (k === "n") this.popup(cx, () => openMenu("summon", {}, 16, 300));
        else if (k === "g") this.popup(cx, () => run("app.palette"));
        else if (k === "f") this.popup(cx, () => run("mod.open", { name: "picker" }));
        else if (k === "o") this.popup(cx, () => run("app.settings"));
        else if (e.key_char === "?" || (k === "/" && mods.shift)) this.popup(cx, () => run("app.help"));
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .on_key_up((e, cx) => {
        const dir = KEY[String(e.key ?? "").toLowerCase()];
        if (!dir) return;
        this.held = this.held.filter((d) => d !== dir);
        cx.stop_propagation();
      })
      .child(
        div()
          .id("hq-field-view")
          .flex_1()
          .min_h(0)
          .w_full()
          .flex()
          .items_center()
          .justify_center()
          .overflow_hidden()
          .on_size_change((size, cx) => {
            const s = { width: Math.floor(size.width), height: Math.floor(size.height) };
            if (!this.size || Math.abs(s.width - this.size.width) >= 4 || Math.abs(s.height - this.size.height) >= 4) {
              this.size = s;
              cx.notify();
            }
          })
          .child(map),
      )
      .child(
        v_flex()
          .flex_none()
          .h(66)
          .mx(8)
          .mb(8)
          .px(12)
          .py(8)
          .gap(4)
          .rounded(6)
          .bg(C.win)
          .border(2)
          .border_color(C.silver)
          .child(
            h_flex()
              .gap(8)
              .child(div().flex_none().text_color(C.gold).child("►"))
              .child(div().flex_1().min_w(0).truncate().text_color(say.color ?? C.text).child(say.title))
              .when(Boolean(say.hint), (el) => el.child(div().flex_none().text_color(C.gold).child(say.hint))),
          )
          .child(
            h_flex()
              .pl(16)
              .gap(8)
              .child(div().flex_1().min_w(0).truncate().text_color(C.muted).child(say.line))
              .child(
                focused
                  ? div().flex_none().text_color(C.silver).loop("opacity", { from: 0.2, to: 1, period: 1000 }).child("▼")
                  : div().flex_none().text_color(C.red).loop("opacity", { from: 0.4, to: 1, period: 900 }).child("Click the field to take control"),
              ),
          ),
      );
  }
}
