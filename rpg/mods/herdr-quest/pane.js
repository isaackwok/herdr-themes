// A pane's title (the layout's pane header): a workbench window. The focused
// one wears the ► cursor and gold. Runes on the right split it (→ ↓), zoom it
// (■) or flee (x: close). Click focuses, double-click zooms, right-click opens
// its menu. Scrolled back in history, a ▲ chip takes it back to the end.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home } from "herdr";
import { C, root, cursor, rune, programIcon, folder, openMenu, statusGlyph, STATUS } from "./kit.js";

export default class PaneTitle {
  init() {}

  render(_cx) {
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    if (!p) return div();
    const on = p.focused;
    const name = p.mod ? p.title || p.mod : ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const st = p.status && p.status !== "idle" ? STATUS[p.status] : null;
    const glyph = statusGlyph(p.status);
    const back = p.scroll && p.scroll.from_bottom > 0;
    return root(h_flex())
      .id(`hq-pane-${id}`)
      .size_full()
      .min_w(0)
      .px(8)
      .gap(6)
      .items_center()
      .bg(on ? C.win : C.winDeep)
      .border_b(1)
      .border_color(C.rule)
      .on_mouse_down("left", (e) => {
        if (e.click_count === 2) run("pane.zoom", { pane: id });
      })
      .on_click(() => run("pane.focus", { pane: id }))
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openMenu("pane", { pane: id, terminal: p.terminal }, 7, 280);
      })
      .child(cursor(on))
      .child(programIcon(p.program, 14, on ? C.gold : C.muted) ?? div().w(0))
      .child(div().flex_none().max_w(240).truncate().text_color(on ? C.gold : C.text).child(name))
      .when(!p.mod && Boolean(p.cwd), (el) => el.child(div().flex_1().min_w(0).truncate().text_color(C.dim).child(`@ ${folder(p.cwd, home())}`)))
      .when(Boolean(p.mod) || !p.cwd, (el) => el.child(div().flex_1()))
      .when(Boolean(st), (el) =>
        el.child(
          h_flex()
            .flex_none()
            .gap(4)
            .px(4)
            .rounded(3)
            .bg(C.select)
            .text_color(st.color)
            .when(Boolean(glyph), (x) => x.child(glyph))
            .child(st.word),
        ),
      )
      .when(back, (el) =>
        el.child(rune(`hq-end-${id}`, "▲hist", () => run("terminal.scroll", { to: "bottom", terminal: p.terminal }), "Reading old scrolls. Click to return to the present (scroll to bottom)")),
      )
      .child(rune(`hq-sr-${id}`, "→", () => run("pane.split", { direction: "right", pane: id }), "Split right"))
      .child(rune(`hq-sd-${id}`, "↓", () => run("pane.split", { direction: "down", pane: id }), "Split down"))
      .child(rune(`hq-z-${id}`, p.zoomed ? "▬" : "■", () => run("pane.zoom", { pane: id }), p.zoomed ? "Unzoom" : "Zoom"))
      .child(rune(`hq-x-${id}`, "x", () => run("pane.close", { pane: id }), "Close pane"));
  }
}
