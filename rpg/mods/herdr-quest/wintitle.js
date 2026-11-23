// A panel window's title bar, over a shipped panel (Files as the Inventory,
// Changes as the Chronicle): ♦ TITLE, its hotkey, and x. Drag it to move the
// window; Esc in the village or x closes it.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { C, root, rune, PANELS } from "./kit.js";

export default class WinTitle {
  init() {}

  render(_cx) {
    const p = props() ?? {};
    const key = PANELS[p.panel]?.key;
    return root(h_flex())
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .border_b(2)
      .border_color(C.silver)
      .child(div().flex_none().text_color(C.gold).child(`♦ ${p.title ?? ""}`))
      .child(div().flex_1())
      .when(Boolean(key), (el) => el.child(div().flex_none().text_color(C.dim).child(`[${key}]`)))
      .child(rune("hq-wintitle-close", "x", () => closeOverlay(p.overlay), "Close (Esc)"));
  }
}
