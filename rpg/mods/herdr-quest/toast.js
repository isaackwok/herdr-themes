// Notifications as a dialogue box (the layout's "toast"). Herdr gives props
// { title, body, level, icon, action, timeout, overlay }. Click: run its
// action (e.g. go to the hero) and close.

import { div, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { props, closeOverlay, run } from "herdr";
import { C, root } from "./kit.js";

const COLOR = { error: C.red, warning: C.amber, success: C.green, info: C.cyan };

export default class Toast {
  init() {}

  render(_cx) {
    const p = props() ?? {};
    const color = COLOR[p.level] ?? C.gold;
    return root(h_flex())
      .id("hq-toast")
      .size_full()
      .px(14)
      .gap(10)
      .items_center()
      .bg(C.win)
      .border(2)
      .border_color(C.silver)
      .cursor_pointer()
      .hover((s) => s.bg(C.select))
      .on_click(() => {
        if (p.action?.name) run(p.action.name, p.action.args ?? {});
        closeOverlay(p.overlay);
      })
      .child(p.icon ? image(p.icon).w(18).h(18).flex_none() : div().flex_none().text_color(color).child("►"))
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .gap(4)
          .child(div().truncate().text_color(color).child(p.title ?? ""))
          .when(Boolean(p.body), (el) => el.child(div().truncate().text_color(C.text).child(p.body))),
      )
      .child(div().flex_none().self_end().pb(6).text_color(C.silver).loop("opacity", { from: 0.2, to: 1, period: 1000 }).child("▼"));
  }
}
