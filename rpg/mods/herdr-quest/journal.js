// The quest log (a panel window: Q, or the notice board): every realm's
// quests (tabs). The shown realm comes first. Click a quest to take it up
// (travel there and go to the workshop), double-click to rename, right-click for
// its menu; + Quest starts one in the shown realm.

import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, panes, run } from "herdr";
import { C, root, heading, rule, rune, cursor, statusGlyph, programIcon, clean, openMenu, closeRune, stop, toBattle } from "./kit.js";

function questName(tab, lead) {
  const prog = lead?.program?.name;
  const base = tab.named ? tab.name : prog ?? "Adventure";
  if (!lead?.program?.agent) return base;
  const live = clean(lead.title);
  const telling = live && live !== lead.terminal && live !== prog && !/^[~/]/.test(live) && !live.includes("@");
  return (tab.name === prog || !tab.named) && telling ? live : base;
}

export default class Journal {
  init() {}

  quest(space, tab) {
    const lead = panes().find((p) => p.tab === tab.id && p.program?.agent) ?? panes().find((p) => p.tab === tab.id);
    const on = space.active && tab.active;
    const glyph = statusGlyph(tab.status);
    return h_flex()
      .id(`hq-log-${tab.id}`)
      .flex_none()
      .h(22)
      .px(4)
      .gap(6)
      .items_center()
      .rounded(3)
      .cursor_pointer()
      .text_color(on ? C.gold : tab.settled ? C.dim : C.text)
      .when(on, (el) => el.bg(C.hover))
      .hover((s) => s.bg(C.hover))
      .on_mouse_down("left", (e, cx) => {
        cx.stop_propagation();
        if (e.click_count === 2) run("tab.rename", { id: tab.id });
      })
      .on_click(() => {
        if (!space.active) run("space.select", { id: space.id });
        run("tab.select", { id: tab.id });
        toBattle();
      })
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openMenu("quest", { id: tab.id, space: space.id }, 8, 260);
      })
      .child(cursor(on, false))
      .child(programIcon(lead?.program, 14, on ? C.gold : C.muted) ?? div().w(14))
      .child(div().flex_1().min_w(0).truncate().child(`${tab.index}·${questName(tab, lead)}`))
      .when(tab.settled, (el) => el.child(div().flex_none().text_color(C.dim).child("z")))
      .when(tab.panes > 1, (el) => el.child(div().flex_none().text_color(C.dim).child(`${tab.panes}■`)))
      .when(Boolean(glyph), (el) => el.child(glyph));
  }

  render(_cx) {
    const all = spaces();
    const ordered = [...all.filter((s) => s.active), ...all.filter((s) => !s.active)];
    return root(v_flex())
      .size_full()
      .min_h(0)
      .p(10)
      .child(
        heading("QUEST LOG", [
          rune("hq-log-new", "+Quest", () => openMenu("summon", {}, 16, 300), "Start a quest: a terminal or a hero (agent)"),
          closeRune(),
        ].filter(Boolean)),
      )
      .child(rule())
      .child(
        v_flex()
          .id("hq-log-list")
          .flex_1()
          .min_h(0)
          .gap(2)
          .overflow_y_scrollbar()
          .on_mouse_down("left", stop)
          .when(all.length === 0, (el) => el.child(div().p(4).text_color(C.dim).child("No realms yet. Discover one first.")))
          .children(
            ordered.flatMap((s) => [
              h_flex()
                .flex_none()
                .pt(4)
                .gap(6)
                .text_color(s.active ? C.gold : C.muted)
                .child(div().flex_none().child(s.active ? "⌂" : "≡"))
                .child(div().flex_1().min_w(0).truncate().child(s.name))
                .when(Boolean(s.branch), (el) => el.child(div().flex_none().max_w(140).truncate().text_color(C.cyan).child(`§ ${s.branch}`))),
              ...s.tabs.map((t) => this.quest(s, t)),
            ]),
          ),
      );
  }
}
