// The command menu (Tab in the village, or ≡ Menu among the terminals): a
// command menu of Herdr's main actions, in a panel window. The ► cursor follows
// the pointer; each command's tooltip names the real action and its key. The
// panels (Quests, Party, Map, Inventory, Chronicle) are toggles, gold while open.

import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run } from "herdr";
import { C, root, heading, cursor, shortcut, openMenu, toField, toBattle, togglePanel, panelOpen, closeRune, stop } from "./kit.js";

function commands() {
  const r = (command, args = {}) => () => run(command, args);
  const k = (command, args) => {
    const s = shortcut(command, args);
    return s ? ` (${s})` : "";
  };
  const panel = (label, name, tip) => ({ label, tip: `${tip} [${({ journal: "Q", party: "P", map: "M", files: "I", changes: "C" })[name]}]`, act: () => togglePanel(name), open: panelOpen(name) });
  return [
    { label: "Village", tip: "Walk the village (Cmd-E)", act: () => toField() },
    { label: "Workshop", tip: "To the terminals [B] (Cmd-E)", act: () => toBattle() },
    { label: "Forge", tip: `New terminal tab${k("tab.new")}`, act: r("tab.new") },
    { label: "Summon", tip: "Start an agent in a new tab [N]", act: () => openMenu("summon", {}, 16, 300) },
    { label: "Split →", tip: `Split the pane right${k("pane.split", { direction: "right" })}`, act: r("pane.split", { direction: "right" }) },
    { label: "Split ↓", tip: `Split the pane down${k("pane.split", { direction: "down" })}`, act: r("pane.split", { direction: "down" }) },
    panel("Quests", "journal", "Quest log: every tab"),
    panel("Party", "party", "Your agents"),
    panel("Map", "map", "World map: every space"),
    panel("Inventory", "files", "Files of this realm"),
    panel("Chronicle", "changes", "Git changes of this realm"),
    { label: "Scout", tip: `Find any realm, quest or hero [F]${k("mod.open", { name: "picker" })}`, act: r("mod.open", { name: "picker" }) },
    { label: "Spellbook", tip: `Every command [G]${k("app.palette")}`, act: r("app.palette") },
    { label: "Lore", tip: `Keys and help [?]${k("app.help")}`, act: r("app.help") },
    { label: "Camp", tip: `Settings [O]${k("app.settings")}`, act: r("app.settings") },
    { label: "Warp", tip: `Leave for another layout${k("layout.switch")}`, act: () => openMenu("world", {}, 10, 280) },
  ];
}

const COLS = 5;

export default class Command {
  init() {
    this.at = -1;
  }

  render(_cx) {
    const list = commands();
    const rows = [];
    for (let i = 0; i < list.length; i += COLS) rows.push(list.slice(i, i + COLS));
    return root(v_flex())
      .size_full()
      .min_w(0)
      .px(10)
      .py(10)
      .gap(4)
      .child(heading("COMMAND", [closeRune()].filter(Boolean)))
      .children(
        rows.map((row, r) =>
          h_flex()
            .flex_none()
            .h(22)
            .children(
              row.map((c, j) => {
                const i = r * COLS + j;
                const on = i === this.at;
                const color = on ? (c.danger ? C.red : C.gold) : c.open ? C.gold : C.text;
                return h_flex()
                  .id(`hq-cmd-${i}`)
                  .flex_1()
                  .min_w(0)
                  .h_full()
                  .gap(2)
                  .items_center()
                  .rounded(3)
                  .text_color(color)
                  .cursor_pointer()
                  .when(on, (el) => el.bg(C.hover))
                  .on_hover((hovered, cx) => {
                    if (hovered) this.at = i;
                    else if (this.at === i) this.at = -1;
                    cx.notify();
                  })
                  .on_mouse_down("left", stop)
                  .on_click(() => c.act())
                  .tooltip(c.tip)
                  .child(cursor(on, false))
                  .child(div().min_w(0).truncate().child(c.label))
                  .when(Boolean(c.open) && !on, (el) => el.child(div().flex_none().text_color(C.gold).child("•")));
              }),
            ),
        ),
      );
  }
}
