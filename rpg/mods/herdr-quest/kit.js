// Herdr Quest's drawing kit: the palette, the pixel font, status glyphs and
// small helpers shared by every role of the herdr-quest mod.
//
// Text is drawn in PxPlus IBM VGA 8x16 (bundled in ./fonts, CC BY-SA 4.0) at
// 16 px, so every glyph lands on whole pixels; one character is 8 px wide.
// Glyphs come from code page 437 (► ♦ ☼ ‼ ⌂ ▲ ♣ ≈ ░ ▒ ▓ █), which the font
// draws natively, so nothing falls back to another font.

import { div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { keys, openOverlay, closeOverlay, layout, run, shared, setShared, focused, agents, setAgentOrder, setBadge, props, hc, checking, window as appWindow } from "herdr";

export const FONT = "PxPlus IBM VGA 8x16";
export const T = 16; // the one text size: the font's native cell height

// A medieval scriptorium: parchment panels written in brown ink, framed in
// walnut, with rubrics (headings, the cursor, what's chosen) in oxblood, gold
// leaf for victory, vermilion for alarms, moss for work, verdigris for paths.
export const C = {
  text: "#3b2614", // ink
  muted: "#6b4a2b",
  dim: "#8f7350",
  gold: "#8b1e1e", // the rubric: headings, cursor, the chosen one
  amber: "#a8740f", // gold leaf: victory
  goldDim: "#b8933a",
  red: "#c8321f", // vermilion: needs you
  rose: "#a8453a", // a gentler red for dangerous menu items
  green: "#3f6e27", // moss: at work
  cyan: "#2e6a6a", // verdigris: branches, terrain
  silver: "#5a3a1e", // walnut: frames
  rule: "#5a3a1e55",
  win: "#efe2c4", // parchment
  winDeep: "#e3d2ac",
  hover: "#5a3a1e1f",
  select: "#dcc595",
  ink: "#2a1a0e", // dark leather: gauge tracks, chips
};

/** Every role's root: the pixel font, its size and the window text color. */
export function root(el) {
  return el.font_family(FONT).text_size(T).line_height(`${T}px`).text_color(C.text);
}

/** A press on a control inside a window_drag bar belongs to the control. */
export const stop = (_e, cx) => cx.stop_propagation();

/** Finds a layout node by id. */
export function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The stage stack shows the village ("field") or the terminals ("main"). Don't
// trust layout()'s `active` for which one is on screen: focusing a pane brings
// its tab into view without changing it. So the views are shown explicitly, and
// a key knows where it was pressed by which copy received it (mod commands
// reach shown copies only): the field in the village, the quest bar in battle.

/** The stack's recorded choice (may lag what's on screen; see above). */
export function stageShows() {
  return find(layout(), "stage")?.active ?? "main";
}

/** Brings the terminals into view (a quest, a hero, an answer, B). */
export function toBattle() {
  run("layout.select", { stack: "stage", child: "main" });
}

/** Brings the village into view and gives it the keyboard. */
export function toField() {
  // Through "main" first, so the switch happens even when `active` already says field.
  run("layout.select", { stack: "stage", child: "main" });
  run("layout.select", { stack: "stage", child: "field" });
  // The field takes the keyboard in its own task (focus can't move during render).
  run("herdr-quest.focus");
}

/** Cmd-E: from the village to battle, or back. `where` is the view the key came from. */
export function toggleStage(where) {
  if (where === "field") toBattle();
  else toField();
}

/** A window's title row: "♦ TITLE" in gold, with optional controls on the right. */
export function heading(title, right = []) {
  return h_flex()
    .flex_none()
    .h(T + 4)
    .items_center()
    .gap(8)
    .child(div().flex_none().text_color(C.gold).child(`♦ ${title}`))
    .child(div().flex_1())
    .children(right);
}

/** A thin rule under a heading. */
export function rule() {
  return div().flex_none().h(2).my(6).bg(C.rule);
}

/** A small text button: [label], gold on hover. */
export function rune(id, text, onClick, tip) {
  let el = div()
    .id(id)
    .flex_none()
    .px(4)
    .rounded(3)
    .text_color(C.muted)
    .cursor_pointer()
    .hover((s) => s.bg(C.hover).text_color(C.gold))
    .on_mouse_down("left", stop)
    .on_click((e, cx) => {
      cx.stop_propagation();
      onClick(e, cx);
    })
    .child(text);
  if (tip) el = el.tooltip(tip);
  return el;
}

/** The menu cursor. Blinks gently while `blink`. */
export function cursor(on, blink = true) {
  const el = div().flex_none().w(8).text_color(C.gold).child(on ? "►" : " ");
  return on && blink ? el.loop("opacity", { from: 0.45, to: 1, period: 900 }) : el;
}

// ---- status: how the party reads

export const STATUS = {
  working: { word: "At work", color: C.green },
  blocked: { word: "Awaiting orders!", color: C.red },
  done: { word: "Victory!", color: C.amber },
  idle: { word: "Resting", color: C.dim },
};

/** One character for a status, animated natively (no timers). */
export function statusGlyph(status) {
  switch (status) {
    case "working":
      return div().flex_none().w(8).text_color(C.green).frames(["░", "▒", "▓", "█", "▓", "▒"], 120).child("░");
    case "blocked":
      return div().flex_none().w(8).text_color(C.red).loop("opacity", { from: 0.2, to: 1, period: 700 }).child("‼");
    case "done":
      return div().flex_none().w(8).text_color(C.amber).child("☼");
    default:
      return null;
  }
}

/** A gauge (the party's ATB bar): `w` px wide. Working sweeps, blocked flashes. */
export function gauge(status, w = 72) {
  const color = STATUS[status]?.color ?? C.dim;
  const fill = div().absolute().top(0).left(0).h_full().bg(color);
  const bar =
    status === "working"
      ? fill.w(w).loop("width", { from: 6, to: w, period: 1600 })
      : status === "blocked"
        ? fill.w(w).loop("opacity", { from: 0.35, to: 1, period: 700 })
        : status === "done"
          ? fill.w(w)
          : fill.w(Math.round(w / 3));
  return div().flex_none().relative().w(w).h(6).rounded(2).bg(C.ink).border(1).border_color(C.rule).child(bar);
}

// ---- programs

/** A program's icon from the app's table: a tinted glyph or a picture. */
export function programIcon(p, size = 14, color = C.muted) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

/** A terminal's folder, ~ for home. */
export function folder(cwd, homeDir) {
  if (!cwd) return "";
  return cwd === homeDir ? "~" : cwd.startsWith(homeDir + "/") ? "~" + cwd.slice(homeDir.length) : cwd;
}

// Drops what an agent puts before its title (a status glyph or spinner), as the agents list does.
export const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}\p{Ps}\p{Pi}]+/u, "").replace(/^\[ [!.] \] /, "").trim();

// ---- keys

/** The key bound to an action (`tab.new`, or `pane.split` + {direction: "right"}), for hints. */
export function shortcut(name, args) {
  const value = args && Object.values(args)[0];
  const k = keys().find((b) => b.section === "global" && (b.action === name || (value !== undefined && b.action === `${name}:${value}`)));
  if (!k?.keys?.trim()) return "";
  const mac = appWindow()?.platform === "macos";
  const names = mac ? { ctrl: "^", alt: "Opt-", shift: "Shift-", cmd: "Cmd-" } : { ctrl: "Ctrl-", alt: "Alt-", shift: "Shift-", cmd: "Super-" };
  return k.keys
    .trim()
    .split(/\s+/)
    .map((stroke) => {
      const parts = stroke.split("-");
      let key = parts.pop();
      if (key === "") {
        key = "-";
        parts.pop();
      }
      const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1);
      return parts.map((m) => names[m.toLowerCase()] ?? `${m}-`).join("") + label;
    })
    .join(" ");
}

// ---- menus

/**
 * Opens an RPG menu popup (the menu role). kind: summon | realm | quest | pane | member | world.
 * `rows` is the most rows it can show, for its height; the window draws only what it needs.
 */
export function openMenu(kind, target = {}, rows = 8, width = 300) {
  return openOverlay({
    mod: "herdr-quest",
    kind: "popup",
    frame: "none",
    width,
    height: Math.min(560, 48 + rows * 24),
    props: { role: "menu", kind, target },
  });
}

// ---- panels: RPG windows opened by hotkeys and by things in the village

export const WIN = { gradient: ["#f3e8cf", "#e2cfa6"], angle: 180 }; // parchment
export const BAR = { gradient: ["#e8d6ae", "#d6bf8e"], angle: 180 }; // a scroll's rolled edge

export const PANELS = {
  journal: { title: "QUEST LOG", role: "journal", w: 440, h: 470, key: "Q" },
  party: { title: "PARTY", role: "party", w: 380, h: 520, key: "P" },
  map: { title: "WORLD MAP", role: "map", w: 360, h: 470, key: "M" },
  command: { title: "COMMAND", role: "command", w: 540, h: 182, key: "Tab" },
  files: { title: "INVENTORY", mod: "files", w: 440, h: 600, key: "I" },
  changes: { title: "CHRONICLE", mod: "changes", w: 500, h: 600, key: "C" },
};

const openPanels = () => shared("hq.panels") ?? {};

export function panelOpen(name) {
  return Boolean(openPanels()[name]);
}

/** Opens a panel window, or closes it when it's open. Windows register themselves (main.js). */
export function togglePanel(name) {
  const open = openPanels();
  if (open[name]) {
    closeOverlay(open[name]);
    const rest = { ...open };
    delete rest[name];
    setShared("hq.panels", rest);
    return;
  }
  const p = PANELS[name];
  if (!p) return;
  const children = p.mod
    ? [
        { type: "block", size: { px: 34 }, background: BAR, content: { mod: "herdr-quest", props: { role: "wintitle", panel: name, title: p.title } } },
        { type: "block", background: "surface", content: { mod: p.mod } },
      ]
    : [{ type: "block", background: WIN, content: { mod: "herdr-quest", props: { role: p.role, panel: name } } }];
  openOverlay({ kind: "window", key: `hq-panel-${name}`, width: p.w, height: p.h, layout: { type: "column", children } });
}

/** Closes the panel opened last. Returns whether one was open. */
export function closeLastPanel() {
  const names = Object.keys(openPanels());
  if (!names.length) return false;
  togglePanel(names[names.length - 1]);
  return true;
}

/** A panel's own close button, for headings drawn inside a panel window. */
export function closeRune() {
  const overlay = props()?.overlay;
  return overlay ? rune("hq-close-panel", "x", () => closeOverlay(overlay), "Close (Esc)") : null;
}

// ---- the party, kept in order whichever role is on screen

const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
let lastBadge;

/** Agents in party order (vanguard, then most urgent). Sets agent.next/prev order and the Dock badge. */
export function syncParty() {
  const list = [...agents()].sort(
    (x, y) => Number(y.pinned) - Number(x.pinned) || (RANK[y.status] ?? 0) - (RANK[x.status] ?? 0) || x.seq - y.seq,
  );
  if (checking()) return list;
  setAgentOrder(list.map((a) => a.address));
  const blocked = list.filter((a) => a.status === "blocked").length;
  const badge = blocked ? String(blocked) : null;
  if (badge !== lastBadge) {
    lastBadge = badge;
    setBadge(badge);
  }
  return list;
}

// ---- the layout's keys (keys.json "layout:herdr-quest"), answered by whichever role is shown

/**
 * Esc: closes an open Herdr Quest menu, then a talk window whose terminal has the
 * keyboard; in the village, the talk window opened last, else the panel opened last. Among the terminals,
 * the focused terminal gets a real Esc (hc keys), so agents and editors see it.
 */
export function escapeKey(where) {
  const menu = shared("hq.menu");
  if (menu) {
    closeOverlay(menu);
    setShared("hq.menu", null);
    if (where === "field") run("herdr-quest.focus");
    return;
  }
  const f = focused();
  const talks = shared("hq.talks") ?? {};
  // A terminal in a window has the keyboard: focused() reports it with no pane.
  if (f?.terminal && !f.pane && talks[f.terminal]) {
    closeOverlay(talks[f.terminal]);
    const rest = { ...talks };
    delete rest[f.terminal];
    setShared("hq.talks", rest);
    if (where === "field") run("herdr-quest.focus");
    return;
  }
  if (where === "field") {
    // In the village, Esc closes what was opened last: a talk window, else a panel.
    const open = Object.keys(talks);
    if (open.length) {
      const last = open[open.length - 1];
      closeOverlay(talks[last]);
      const rest = { ...talks };
      delete rest[last];
      setShared("hq.talks", rest);
    } else if (!closeLastPanel()) run("herdr-quest.leave"); // nothing to close: out of the house
    run("herdr-quest.focus");
    return;
  }
  if (f?.terminal) hc(["keys", f.terminal, "esc"]).catch(() => {});
}

/** Answers a layout key command from the copy in `where` ("field" or "battle"); returns whether it was one. */
export function layoutCommand(c, where) {
  if (c === "explore") toggleStage(where);
  else if (c === "escape") escapeKey(where);
  else if (c.startsWith("panel-")) togglePanel(c.slice(6));
  // Cmd-P / Cmd-Shift-P among the terminals (the field opens and watches them itself).
  else if (c === "picker") run("mod.open", { name: "picker" });
  else if (c === "palette") run("app.palette");
  else return false;
  return true;
}
