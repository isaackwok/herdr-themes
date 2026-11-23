// The quest bar (top, window_drag): the crest, the shown realm's tabs as
// quests, and + to start one. Click a quest to take it up, double-click to
// rename, right-click for its menu; the wheel walks through them. A quest's
// glyph is its party's state: ░▒▓ at work, ‼ awaiting orders, ☼ done.
// Settled tabs ("resting at the inn") show dimmed with z.

import { div, svg } from "gpui-kit";
import { h_flex, ScrollHandle } from "gpui-base";
import { spaces, panes, run, layout, settings, nextCommand, checking, window as appWindow } from "herdr";
import { C, root, stop, cursor, statusGlyph, programIcon, clean, openMenu, rune, toBattle, toField, togglePanel, panelOpen, layoutCommand } from "./kit.js";

// A tab nobody named follows its agent's live title, as the shipped tab bar does.
function questName(tab, lead) {
  const prog = lead?.program?.name;
  const base = tab.named ? tab.name : prog ?? "Adventure";
  if (!lead?.program?.agent) return base;
  const live = clean(lead.title);
  const path = /^[~/]|^[A-Za-z]:\\/.test((lead.title ?? "").replace(/^[^\p{L}\p{N}~/]+/u, ""));
  const telling = live && live !== lead.terminal && live !== prog && !path && !live.includes("@") && live.toLowerCase() !== lead.program.key;
  return (tab.name === prog || !tab.named) && telling ? live : base;
}

export default class Quests {
  init(_p, cx) {
    this.scroll = ScrollHandle.new();
    this.swipe = { acc: 0, at: 0, last: 0 };
    if (checking() || !cx) return;
    // Among the terminals this bar answers the layout's keys (Esc, Cmd-E); the field does in the village.
    cx.spawn(async () => {
      for (;;) {
        layoutCommand(await nextCommand(), "battle");
      }
    });
  }

  wheel(e) {
    if (e.delta_lines) {
      if (e.delta_lines.y) run(e.delta_lines.y > 0 ? "tab.prev" : "tab.next");
      return;
    }
    const s = this.swipe;
    const now = Date.now();
    if (now - s.at > 250 || e.delta.y * s.acc < 0) s.acc = 0;
    s.at = now;
    s.acc += e.delta.y;
    if (Math.abs(s.acc) < 40 || now - s.last < 120) return;
    s.acc = 0;
    s.last = now;
    run(e.delta.y > 0 ? "tab.prev" : "tab.next");
  }

  quest(space, tab, i) {
    const lead = panes().find((p) => p.tab === tab.id && p.program?.agent) ?? panes().find((p) => p.tab === tab.id);
    const name = questName(tab, lead);
    const on = tab.active;
    const glyph = statusGlyph(tab.status);
    return h_flex()
      .id(`hq-q-${tab.id}`)
      .flex_none()
      .h(30)
      .pl(6)
      .pr(8)
      .gap(6)
      .items_center()
      .rounded(6)
      .border(2)
      .border_color(on ? C.silver : "#00000000")
      .bg(on ? C.select : "#00000000")
      .text_color(on ? C.gold : tab.settled ? C.dim : C.text)
      .cursor_pointer()
      .hover((s) => s.bg(on ? C.select : C.hover))
      .on_mouse_down("left", (e, cx) => {
        cx.stop_propagation();
        if (e.click_count === 2) run("tab.rename", { id: tab.id });
      })
      .on_click(() => {
        toBattle();
        run("tab.select", { id: tab.id });
      })
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openMenu("quest", { id: tab.id, space: space.id }, 8, 260);
      })
      .tooltip(`Quest ${tab.index}: ${name}${tab.panes > 1 ? ` · ${tab.panes} panes` : ""}${tab.zoomed ? " · zoomed" : ""}`)
      .child(cursor(on))
      .when(Boolean(lead?.program?.icon), (el) => el.child(programIcon(lead.program, 14, on ? C.gold : C.muted)))
      .child(div().max_w(200).truncate().child(`${tab.index}·${name}`))
      .when(tab.zoomed, (el) => el.child(div().flex_none().text_color(C.cyan).child("■")))
      .when(tab.settled, (el) => el.child(div().flex_none().text_color(C.dim).child("z")))
      .when(Boolean(glyph), (el) => el.child(glyph))
      .when(on, (el) =>
        el.child(
          div()
            .id(`hq-qx-${tab.id}`)
            .flex_none()
            .px(2)
            .rounded(3)
            .text_color(C.dim)
            .hover((s) => s.text_color(C.red).bg(C.hover))
            .on_mouse_down("left", stop)
            .on_click((_e, cx) => {
              cx.stop_propagation();
              run("tab.close", { id: tab.id });
            })
            .tooltip("Abandon quest (close tab)")
            .child("x"),
        ),
      );
  }

  render(_cx) {
    const space = spaces().find((s) => s.active);
    const tabs = space?.tabs ?? [];
    const active = tabs.findIndex((t) => t.active);
    if (active !== this.lastActive) {
      this.lastActive = active;
      if (active >= 0) this.scroll.scroll_to_item(active);
    }
    const w = appWindow();
    const rootNode = layout();
    const lights = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && rootNode?.traffic_lights;
    const left = lights ? Math.max(12, (rootNode.traffic_lights[0] + 64) / (Number(settings().zoom) || 1)) : 12;
    return root(h_flex())
      .size_full()
      .min_w(0)
      .pl(left)
      .pr(10)
      .gap(6)
      .items_center()
      .on_scroll_wheel((e) => this.wheel(e))
      .child(
        h_flex()
          .id("hq-crest")
          .flex_none()
          .gap(6)
          .px(6)
          .h(30)
          .items_center()
          .rounded(6)
          .cursor_pointer()
          .hover((s) => s.bg(C.hover))
          .on_mouse_down("left", stop)
          .on_click(() => openMenu("world", {}, 10, 280))
          .tooltip("The world: warp to another layout, settings, help")
          .child(div().text_color(C.gold).child("♦"))
          .child(div().text_color(C.silver).font_weight(700).child("HERDR QUEST"))
          .child(div().text_color(C.gold).child("♦")),
      )
      .child(div().flex_none().w(2).h(24).bg(C.rule))
      .child(
        div()
          .flex_none()
          .text_color(C.dim)
          .truncate()
          .max_w(180)
          .child(space ? `${space.name}:` : "No realm"),
      )
      .child(
        h_flex()
          .id("hq-quest-scroll")
          .flex_1()
          .min_w(0)
          .h_full()
          .gap(4)
          .items_center()
          .overflow_x_scrollbar()
          .track_scroll(this.scroll)
          .children(space ? tabs.map((t, i) => this.quest(space, t, i)) : []),
      )
      .child(rune("hq-explore", "► Explore", () => toField(), "Back to the village (Cmd-E)"))
      .child(rune("hq-new-quest", "+ Quest", () => openMenu("summon", {}, 16, 300), "Start a quest: a terminal or a hero (agent)"))
      .child(rune("hq-menu", panelOpen("command") ? "■ Menu" : "≡ Menu", () => togglePanel("command"), "The command menu: panels, spells, camp"))
      .when(Boolean(w?.buttons), (el) =>
        el
          .child(rune("hq-min", "_", () => run("window.minimize"), "Minimize"))
          .child(rune("hq-max", w.maximized ? "▬" : "■", () => run("window.maximize"), "Maximize"))
          .child(rune("hq-close", "X", () => run("window.close"), "Close window")),
      );
  }
}
