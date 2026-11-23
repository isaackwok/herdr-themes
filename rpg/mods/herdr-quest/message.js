// The message window (bottom left): the narrator. Where you are (realm,
// branch, land), how the party fares, and the one thing worth saying now:
// a hero awaiting orders, a victory, an update waiting, else a hint with the
// real keys. The blinking ▼ opens the spellbook (command palette).

import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, updates, run, checking } from "herdr";
import { C, root, cursor, shortcut, clean, toBattle } from "./kit.js";

const clock = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default class Message {
  init(_p, cx) {
    this.now = clock();
    if (checking()) return;
    cx.timer.every(10000, (cx) => {
      const now = clock();
      if (now !== this.now) {
        this.now = now;
        cx.notify();
      }
    });
  }

  render(_cx) {
    const space = spaces().find((s) => s.active);
    const party = agents();
    const count = (st) => party.filter((a) => a.status === st).length;
    const blocked = party.filter((a) => a.status === "blocked");
    const done = party.filter((a) => a.status === "done");
    const ready = updates()?.app?.ready;
    const hero = (a) => clean(a.title) || a.program?.name || "A hero";

    let say = null;
    if (blocked.length)
      say = { color: C.red, text: `‼ ${hero(blocked[0])} awaits your orders in ${blocked[0].space_name}!`, act: "► Answer", run: ["agent.focus", { terminal: blocked[0].address }] };
    else if (done.length)
      say = { color: C.amber, text: `☼ ${done[0].program?.name ?? "A hero"} is victorious in ${done[0].space_name}!`, act: "► Behold", run: ["agent.focus", { terminal: done[0].address }] };
    else if (ready) say = { color: C.cyan, text: `A new age dawns: Herdr ${ready} awaits.`, act: "► Camp", run: ["app.settings", { section: "updates" }] };
    else {
      const k = (name, label) => {
        const s = shortcut(name);
        return s ? `${label} ${s}` : null;
      };
      const hints = [k("app.palette", "Spellbook"), k("mod.open:picker", "Scout"), k("app.help", "Lore"), k("layout.switch", "Warp")].filter(Boolean);
      say = { color: C.muted, text: hints.length ? hints.join(" · ") : "Choose a command, hero." };
    }

    const tally = [
      ["‼", count("blocked"), C.red, "awaiting"],
      ["░", count("working"), C.green, "at work"],
      ["☼", count("done"), C.gold, "victorious"],
      ["z", count("idle"), C.dim, "resting"],
    ].filter(([, n]) => n > 0);

    return root(v_flex())
      .size_full()
      .min_w(0)
      .px(12)
      .py(10)
      .gap(6)
      .child(
        h_flex()
          .gap(10)
          .items_center()
          .child(cursor(true))
          .child(div().flex_none().text_color(C.gold).max_w(260).truncate().child(space ? space.name : "No realm"))
          .when(Boolean(space?.branch), (el) => el.child(div().flex_none().max_w(220).truncate().text_color(C.cyan).child(`§ ${space.branch}`)))
          .child(div().flex_1().min_w(0).truncate().text_color(C.dim).child(space?.machine ? `≡ ${space.machine}` : "≡ Home land"))
          .child(div().flex_none().text_color(C.silver).child(`☼ ${this.now}`)),
      )
      .child(
        h_flex()
          .pl(18)
          .gap(10)
          .items_center()
          .child(div().flex_none().text_color(C.text).child(party.length ? `Party ${party.length}:` : "No heroes in your party."))
          .children(
            tally.map(([g, n, color, word]) => div().flex_none().text_color(color).child(`${g}${n} ${word}`)),
          ),
      )
      .child(
        h_flex()
          .pl(18)
          .gap(10)
          .items_center()
          .child(div().flex_1().min_w(0).truncate().text_color(say.color).child(say.text))
          .when(Boolean(say.run), (el) =>
            el.child(
              div()
                .id("hq-say-act")
                .flex_none()
                .px(4)
                .rounded(3)
                .text_color(C.gold)
                .cursor_pointer()
                .hover((s) => s.bg(C.hover))
                .on_click(() => {
                  if (say.run[0] === "agent.focus") toBattle();
                  run(say.run[0], say.run[1]);
                })
                .child(say.act),
            ),
          )
          .child(
            div()
              .id("hq-more")
              .flex_none()
              .text_color(C.silver)
              .cursor_pointer()
              .loop("opacity", { from: 0.2, to: 1, period: 1000 })
              .tooltip("Open the spellbook (command palette)")
              .on_click(() => run("app.palette"))
              .child("▼"),
          ),
      );
  }
}
