// The world map (left, top): spaces as realms, grouped by machine (lands).
// Click a realm to travel there, double-click to rename it, right-click for
// its menu. Each realm keeps a terrain glyph from its id; its line shows the
// branch (§) and how many quests (tabs) it holds, and the most urgent party
// state of its quests on the right.

import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, machines, run } from "herdr";
import { C, root, heading, rule, rune, cursor, statusGlyph, openMenu, closeRune } from "./kit.js";

const TERRAIN = ["⌂", "▲", "♣", "≈", "Ω", "π", "∩", "Σ", "♠", "Φ"];

function terrain(id) {
  let h = 0;
  for (const ch of id ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TERRAIN[h % TERRAIN.length];
}

export default class WorldMap {
  init() {}

  realm(s) {
    const on = s.active;
    const glyph = statusGlyph(s.status);
    const quests = s.tabs.length;
    return v_flex()
      .id(`hq-realm-${s.id}`)
      .flex_none()
      .px(4)
      .py(3)
      .rounded(4)
      .cursor_pointer()
      .when(on, (el) => el.bg(C.hover))
      .hover((st) => st.bg(C.hover))
      .on_mouse_down("left", (e, cx) => {
        cx.stop_propagation();
        if (e.click_count === 2) run("space.rename", { id: s.id });
      })
      .on_click(() => run("space.select", { id: s.id }))
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openMenu("realm", { id: s.id }, 12, 300);
      })
      .child(
        h_flex()
          .gap(6)
          .items_center()
          .child(cursor(on))
          .child(div().flex_none().text_color(on ? C.gold : C.cyan).child(terrain(s.id)))
          .child(div().flex_1().min_w(0).truncate().text_color(on ? C.gold : C.text).child(s.name))
          .when(Boolean(glyph), (el) => el.child(glyph)),
      )
      .child(
        h_flex()
          .pl(28)
          .gap(8)
          .text_color(C.dim)
          .child(div().flex_1().min_w(0).truncate().child(s.branch ? `§ ${s.branch}` : "· wilds"))
          .child(div().flex_none().child(`${quests} quest${quests === 1 ? "" : "s"}`)),
      );
  }

  render(_cx) {
    const all = spaces();
    const lands = machines();
    const names = [...new Set([null, ...lands.map((m) => m.name), ...all.map((s) => s.machine ?? null)])];
    const several = names.length > 1;
    const groups = names
      .map((name) => ({
        name,
        info: lands.find((m) => m.name === name),
        realms: all.filter((s) => (s.machine ?? null) === name),
      }))
      .filter((g) => g.realms.length || g.name !== null || !several);
    return root(v_flex())
      .size_full()
      .min_h(0)
      .p(10)
      .child(
        heading("WORLD MAP", [
          rune("hq-new-realm", "+Realm", () => run("space.new"), "Discover a new realm (new space)"),
          rune("hq-new-land", "+Land", () => run("mod.open", { name: "machine-add" }), "Chart a new land (add a machine over ssh)"),
          closeRune(),
        ].filter(Boolean)),
      )
      .child(rule())
      .child(
        v_flex()
          .id("hq-realms")
          .flex_1()
          .min_h(0)
          .gap(2)
          .overflow_y_scrollbar()
          .when(all.length === 0, (el) =>
            el.child(
              div()
                .id("hq-no-realm")
                .p(4)
                .text_color(C.dim)
                .cursor_pointer()
                .hover((s) => s.text_color(C.gold))
                .on_click(() => run("space.new"))
                .child("The map is blank. ► Discover a realm"),
            ),
          )
          .children(
            groups.flatMap((g) => [
              ...(several
                ? [
                    h_flex()
                      .flex_none()
                      .pt(4)
                      .gap(6)
                      .text_color(g.info?.layout === "unavailable" ? C.red : C.muted)
                      .child(div().child(g.name === null ? "≡ Home land" : `≡ ${g.name}`))
                      .when(g.info?.layout === "unavailable", (el) => el.child(div().text_color(C.red).child("(lost)")))
                      .when(g.info?.layout === "loading", (el) => el.child(div().text_color(C.dim).frames([".", "..", "..."], 400).child("."))),
                  ]
                : []),
              ...g.realms.map((s) => this.realm(s)),
            ]),
          ),
      );
  }
}
