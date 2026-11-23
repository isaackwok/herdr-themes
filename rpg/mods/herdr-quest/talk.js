// A conversation window's title bar (the field's "speak"): the window holds
// this bar over the hero's live terminal. Drag the bar to move the window;
// To workshop shows the hero's quest among the terminals; x ends the talk (the
// agent keeps running). Esc also closes it while its terminal has the keyboard.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, terminals, props, run, closeOverlay, shared, setShared, checking } from "herdr";
import { C, root, rune, cursor, clean, STATUS, statusGlyph } from "./kit.js";

export default class Talk {
  // Registered so Esc (quests.js) can close the window whose terminal has the keyboard.
  init(p) {
    this.terminal = props()?.terminal ?? p?.terminal;
    this.overlay = props()?.overlay ?? p?.overlay;
    if (this.terminal && this.overlay && !checking()) setShared("hq.talks", { ...(shared("hq.talks") ?? {}), [this.terminal]: this.overlay });
  }

  async close() {
    const talks = shared("hq.talks") ?? {};
    if (this.terminal && talks[this.terminal] === this.overlay) {
      const rest = { ...talks };
      delete rest[this.terminal];
      setShared("hq.talks", rest);
    }
  }

  render(_cx) {
    const p = props() ?? {};
    const a = agents().find((x) => x.address === p.terminal);
    const t = a ?? terminals().find((x) => x.address === p.terminal);
    const name = clean(a?.title) || a?.program?.name || t?.name || p.terminal || "a stranger";
    const st = a ? STATUS[a.status] : null;
    const glyph = a ? statusGlyph(a.status) : null;
    return root(h_flex())
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .border_b(2)
      .border_color(C.silver)
      .child(cursor(true))
      .child(div().flex_none().text_color(C.gold).child("Speaking with"))
      .child(div().flex_1().min_w(0).truncate().text_color(C.text).child(a ? `${name} · ${a.space_name}·${a.tab_index}` : name))
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
      .child(
        rune("hq-talk-workshop", "To workshop", () => {
          closeOverlay(p.overlay);
          run("layout.select", { stack: "stage", child: "main" });
          if (p.terminal) run("agent.focus", { terminal: p.terminal });
        }, "Show this hero's quest among the terminals"),
      )
      .child(rune("hq-talk-close", "x", () => closeOverlay(p.overlay), "End the conversation (the agent keeps running)"));
  }
}
