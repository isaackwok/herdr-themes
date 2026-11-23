// The party (left, bottom): agents as heroes. Pinned heroes lead (the
// vanguard), then whoever needs you most: awaiting orders, victorious, in
// work, resting. Each card shows the hero's class (its program), where it
// works (realm · quest), a gauge (sweeping at work, flashing when it needs
// orders, full on victory) and how long it has fought. Sub-agents a hero
// started are its familiars, listed under it; click one to scry (peek) it.
// Click a hero to give orders (agent.focus); right-click for its menu.
// agent.next / agent.prev follow this order; the Dock badge counts heroes
// awaiting orders.

import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, terminals, spaces, run, checking } from "herdr";
import { C, root, heading, rule, rune, cursor, statusGlyph, gauge, programIcon, clean, openMenu, STATUS, toBattle, closeRune, syncParty, stop } from "./kit.js";

const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };

function since(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h${String(m % 60).padStart(2, "0")}` : `${Math.floor(h / 24)}d`;
}

function heroName(a) {
  const prog = a.program?.name;
  const live = clean(a.title);
  const path = /^[~/]|^[A-Za-z]:\\/.test((a.title ?? "").replace(/^[^\p{L}\p{N}~/]+/u, ""));
  const telling = live && live !== a.address && live !== prog && !path && !live.includes("@") && live.toLowerCase() !== a.program?.key;
  if (telling) return live;
  return /^\d+$/.test(a.tab_name ?? "") ? prog ?? "Hero" : a.tab_name;
}

export default class Party {
  init(_p, cx) {
    this.badge = undefined;
    if (checking()) return;
    // Work times are minutes: redraw twice a minute, and only while someone works.
    cx.timer.every(30000, (cx) => {
      if (agents().some((a) => a.status === "working")) cx.notify();
    });
  }

  card(a, kids, tabs) {
    const st = STATUS[a.status] ?? STATUS.idle;
    const tab = tabs.get(a.tab);
    const fought = a.status === "working" && tab?.working_since ? since(Date.now() - tab.working_since) : "";
    const glyph = statusGlyph(a.status);
    const on = a.focused;
    return v_flex()
      .flex_none()
      .child(
        v_flex()
          .id(`hq-hero-${a.address}`)
          .px(4)
          .py(4)
          .gap(2)
          .rounded(4)
          .cursor_pointer()
          .when(on, (el) => el.bg(C.hover))
          .when(a.status === "blocked", (el) => el.border(1).border_color(C.red))
          .hover((s) => s.bg(C.hover))
          .on_click(() => {
            toBattle();
            run("agent.focus", { terminal: a.address });
          })
          .on_mouse_down("right", (_e, cx) => {
            cx.stop_propagation();
            openMenu("member", { terminal: a.address }, 5, 280);
          })
          .tooltip(`${a.program?.name ?? "Hero"} in ${a.space_name} · quest ${a.tab_index}. Click to give orders.`)
          .child(
            h_flex()
              .gap(6)
              .items_center()
              .child(cursor(on))
              .child(programIcon(a.program, 14, on ? C.gold : C.silver) ?? div().w(14).child("☺"))
              .child(div().flex_1().min_w(0).truncate().text_color(on ? C.gold : C.text).child(heroName(a)))
              .when(a.pinned, (el) => el.child(div().flex_none().text_color(C.red).tooltip("Vanguard (pinned)").child("♥")))
              .when(Boolean(glyph), (el) => el.child(glyph)),
          )
          .child(
            h_flex()
              .pl(28)
              .gap(6)
              .text_color(C.dim)
              .child(div().flex_1().min_w(0).truncate().child(`${a.program?.name ?? "Hero"} · ${a.space_name}·${a.tab_index}`)),
          )
          .child(
            h_flex()
              .pl(28)
              .gap(8)
              .items_center()
              .child(gauge(a.status, 64))
              .child(div().flex_1().min_w(0).truncate().text_color(st.color).child(st.word))
              .when(Boolean(fought), (el) => el.child(div().flex_none().text_color(C.dim).child(fought))),
          ),
      )
      .children(
        kids.map((k) =>
          h_flex()
            .id(`hq-fam-${k.address}`)
            .pl(32)
            .gap(6)
            .h(18)
            .items_center()
            .text_color(C.dim)
            .cursor_pointer()
            .hover((s) => s.text_color(C.gold))
            .on_click(() => run("terminal.peek", { terminal: k.address }))
            .tooltip("A familiar (sub-agent). Click to scry it.")
            .child(div().flex_none().child("└♣"))
            .child(div().flex_1().min_w(0).truncate().child(k.name || k.program?.name || k.address))
            .child(div().flex_none().child(k.status === "working" ? "~" : k.status === "blocked" || k.status === "error" ? "!" : "")),
        ),
      );
  }

  render(_cx) {
    const tabs = new Map(spaces().flatMap((s) => s.tabs.map((t) => [t.id, t])));
    const list = syncParty();
    const listed = new Set(list.map((a) => a.address));
    const all = terminals();
    const kidsOf = (addr) => all.filter((t) => t.parent === addr && !listed.has(t.address) && t.state !== "exited");
    return root(v_flex())
      .size_full()
      .min_h(0)
      .p(10)
      .child(
        heading(`PARTY ${list.length ? `(${list.length})` : ""}`.trim(), [
          rune("hq-prev-hero", "◄", () => run("agent.prev"), "Previous hero (agent.prev)"),
          rune("hq-next-hero", "►", () => run("agent.next"), "Next hero (agent.next)"),
          rune("hq-summon", "+Hero", () => openMenu("summon", {}, 16, 300), "Summon a hero (start an agent)"),
          closeRune(),
        ].filter(Boolean)),
      )
      .child(rule())
      .child(
        v_flex()
          .id("hq-heroes")
          .on_mouse_down("left", stop)
          .flex_1()
          .min_h(0)
          .gap(4)
          .overflow_y_scrollbar()
          .when(list.length === 0, (el) =>
            el.child(
              v_flex()
                .gap(6)
                .p(4)
                .text_color(C.dim)
                .child(div().child("Your party is empty."))
                .child(
                  div()
                    .id("hq-first-hero")
                    .text_color(C.gold)
                    .cursor_pointer()
                    .hover((s) => s.text_color(C.text))
                    .on_click(() => openMenu("summon", {}, 16, 300))
                    .child("► Summon a hero"),
                ),
            ),
          )
          .children(list.map((a) => this.card(a, kidsOf(a.address), tabs))),
      );
  }
}
