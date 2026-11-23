// The satchel's title (over the right panel): Inventory (the Files panel) and
// Chronicle (the Changes panel), the shipped mods underneath; x closes it.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { run, layout } from "herdr";
import { C, root, cursor, rune, find } from "./kit.js";

export default class Satchel {
  init() {}

  render(_cx) {
    const active = find(layout(), "panel-body")?.active ?? "files";
    const tab = (child, label) => {
      const on = active === child;
      return h_flex()
        .id(`hq-satchel-${child}`)
        .flex_none()
        .h(24)
        .px(4)
        .gap(4)
        .items_center()
        .rounded(4)
        .text_color(on ? C.gold : C.muted)
        .when(on, (el) => el.bg(C.hover))
        .cursor_pointer()
        .hover((s) => s.text_color(C.gold))
        .on_click(() => run("layout.select", { stack: "panel-body", child }))
        .child(cursor(on, false))
        .child(label);
    };
    return root(h_flex())
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .border_b(2)
      .border_color(C.silver)
      .child(div().flex_none().text_color(C.gold).child("♦ SATCHEL"))
      .child(tab("files", "Inventory"))
      .child(tab("changes", "Chronicle"))
      .child(div().flex_1())
      .child(rune("hq-satchel-close", "x", () => run("layout.hide", { id: "panel" }), "Close the satchel"));
  }
}
