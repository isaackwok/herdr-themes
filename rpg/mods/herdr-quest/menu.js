// The RPG menu popup: every list of actions in Herdr Quest. Opened with
// props { role: "menu", kind, target } (kit.js openMenu). The ► cursor follows
// the pointer and the arrow keys; Enter chooses, Esc closes, 1-9 summon.
//
// kinds:
//   summon  the + menu: a terminal, an agent, a new space or worktree
//   realm   a space's menu (target {id})
//   quest   a tab's menu (target {id, space})
//   pane    a pane's menu (target {pane, terminal})
//   member  an agent's menu (target {terminal})
//   world   the crest's menu: other layouts, machines, settings, help

import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import {
  props, run, closeOverlay, openOverlay, spaces, panes, terminals, agents, layouts, shared, setShared,
  knownAgents, exec, checking,
} from "herdr";
import { C, root, cursor, shortcut, programIcon, toBattle } from "./kit.js";

const KNOWN = "new-menu.agents"; // the shipped + menu's cache, shared so both open fast

// Where a space is now: its first terminal's live folder, else where it was made.
function place(s) {
  const tabs = new Set((s?.tabs ?? []).map((c) => c.id));
  return panes().find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s?.folder;
}

// A space's checkout: "main" (a repo's own), "linked" (a worktree), or null.
async function checkout(dir, on) {
  const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd: dir, on });
  const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: dir, on });
  if (top.code !== 0 || common.code !== 0) return null;
  return common.stdout.trim() === `${top.stdout.trim()}/.git` ? "main" : "linked";
}

const worktree = (space, action) => ({
  overlay: {
    mod: "worktree",
    kind: "dialog",
    ...(action === "open" ? { width: 560, height: 480 } : { width: 460, height: 280 }),
    props: { space, folder: panes().find((p) => p.focused)?.cwd, action },
  },
});

const item = (label, command, args = {}, o = {}) => ({ label, act: { run: [command, args] }, hint: o.hint ?? shortcut(command, args), ...o });

export default class Menu {
  init(p, cx) {
    this.at = -1;
    this.git = null;
    this.agents = [];
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.overlay = props()?.overlay ?? p?.overlay;
    if (this.overlay && !checking()) setShared("hq.menu", this.overlay);
    const kind = p?.kind;
    const target = p?.target ?? {};
    if (checking()) return;
    if (kind === "summon") {
      const machine = spaces().find((s) => s.active)?.machine ?? null;
      const where = machine ?? "";
      this.agents = shared(KNOWN)?.[where] ?? [];
      cx.spawn(async (cx) => {
        try {
          this.agents = await knownAgents({ on: machine });
          setShared(KNOWN, { ...(shared(KNOWN) ?? {}), [where]: this.agents });
        } catch {
          this.failed = true;
        }
        cx.notify();
      });
    }
    if (kind === "realm") {
      const space = spaces().find((s) => s.id === target.id);
      const dir = place(space);
      if (dir)
        cx.spawn(async (cx) => {
          this.git = await checkout(dir, space.machine).catch(() => null);
          cx.notify();
        });
    }
  }

  items() {
    const p = props() ?? {};
    const tg = p.target ?? {};
    const active = spaces().find((s) => s.active);
    switch (p.kind) {
      case "summon": {
        const installed = this.agents.filter((a) => a.installed);
        const missing = this.failed ? [] : this.agents.filter((a) => !a.installed).slice(0, 2);
        return [
          { heading: "NEW QUEST" },
          item("Lone adventurer", "tab.new", { space: active?.id }, { note: "a terminal" }),
          { heading: "SUMMON A HERO" },
          ...installed.map((a, i) =>
            item(a.name, "tab.new", { name: a.name, space: active?.id, argv: a.run }, { hint: i < 9 ? String(i + 1) : "", icon: a, summon: i }),
          ),
          ...missing.map((a) => ({ label: a.name, hint: "not found", icon: a, disabled: true })),
          ...(this.agents.length === 0 ? [{ label: this.failed ? "Could not scout heroes" : "Scouting heroes…", disabled: true }] : []),
          { sep: true },
          item("Discover new realm", "space.new", {}, { note: "a space" }),
          { label: "Forge worktree…", act: worktree(active?.id, "new"), disabled: !active },
          { label: "Enter worktree…", act: worktree(active?.id, "open"), disabled: !active },
        ];
      }
      case "realm": {
        const all = spaces();
        const s = all.find((x) => x.id === tg.id);
        const i = all.findIndex((x) => x.id === tg.id);
        return [
          { heading: (s?.name ?? "REALM").toUpperCase() },
          item("Travel here", "space.select", { id: tg.id }, { hint: "", disabled: s?.active }),
          item("New quest here", "tab.new", { space: tg.id }, { hint: "" }),
          item("Rename realm", "space.rename", { id: tg.id }),
          ...(this.git ? [{ label: "Forge worktree…", act: worktree(tg.id, "new") }, { label: "Enter worktree…", act: worktree(tg.id, "open") }] : []),
          ...(this.git === "linked" ? [{ label: "Unmake worktree…", act: worktree(tg.id, "remove"), danger: true }] : []),
          item("Move up", "space.move", { id: tg.id, index: i }, { hint: "", disabled: i <= 0 }),
          item("Move down", "space.move", { id: tg.id, index: i + 2 }, { hint: "", disabled: i < 0 || i >= all.length - 1 }),
          { sep: true },
          item("Abandon realm", "space.close", { id: tg.id }, { danger: true, hint: "" }),
        ];
      }
      case "quest": {
        const s = spaces().find((x) => x.id === tg.space);
        const tab = s?.tabs.find((x) => x.id === tg.id);
        return [
          { heading: `QUEST ${tab?.index ?? ""}`.trim() },
          item("Rename quest", "tab.rename", { id: tg.id }),
          item("New quest", "tab.new", { space: tg.space }),
          item("Move left", "tab.move", { id: tg.id, by: -1 }, { hint: "" }),
          item("Move right", "tab.move", { id: tg.id, by: 1 }, { hint: "" }),
          tab?.settled
            ? item("Wake from the inn", "tab.unsettle", { id: tg.id }, { hint: "" })
            : item("Rest at the inn", "tab.settle", { id: tg.id }, { hint: "", note: "settle" }),
          { sep: true },
          item("Abandon quest", "tab.close", { id: tg.id }, { danger: true }),
        ];
      }
      case "pane": {
        const pane = panes().find((x) => x.pane === tg.pane);
        const all = terminals();
        const term = all.find((t) => t.address === tg.terminal);
        const parent = term?.parent && all.find((t) => t.address === term.parent);
        return [
          { heading: "WORKBENCH" },
          item("Split right", "pane.split", { direction: "right", pane: tg.pane }),
          item("Split down", "pane.split", { direction: "down", pane: tg.pane }),
          item(pane?.zoomed ? "Unzoom" : "Zoom", "pane.zoom", { pane: tg.pane }),
          ...(parent ? [item(`Return to ${parent.name || parent.address}`, "terminal.park", { terminal: term.address }, { hint: "" })] : []),
          { sep: true },
          item("Close pane", "pane.close", { pane: tg.pane }, { danger: true }),
        ];
      }
      case "member": {
        const a = agents().find((x) => x.address === tg.terminal);
        return [
          { heading: (a?.program?.name ?? "HERO").toUpperCase() },
          item("Give orders", "agent.focus", { terminal: tg.terminal }, { hint: "", note: "focus" }),
          item("Scry", "terminal.peek", { terminal: tg.terminal }, { hint: "", note: "peek" }),
          item(a?.pinned ? "Leave the vanguard" : "Lead the vanguard", "terminal.pin", { terminal: tg.terminal, pinned: !a?.pinned }, { hint: "", note: a?.pinned ? "unpin" : "pin" }),
        ];
      }
      case "world":
      default: {
        const here = shared("layout");
        return [
          { heading: "HERDR QUEST" },
          ...layouts()
            .filter((n) => n !== here)
            .map((n) => item(`Warp to ${n}`, "layout.switch", { name: n }, { hint: "" })),
          { sep: true },
          { label: "Chart new land", note: "add machine", act: { run: ["mod.open", { name: "machine-add" }] } },
          item("Camp", "app.settings", {}, { note: "settings" }),
          item("Lore", "app.help", {}, { note: "keys" }),
          item("Tales of new", "app.whats_new", {}, { note: "what's new" }),
        ];
      }
    }
  }

  async close() {
    if (this.overlay && shared("hq.menu") === this.overlay) setShared("hq.menu", null);
  }

  choose(it) {
    if (!it || it.disabled || !it.act) return;
    closeOverlay(props()?.overlay);
    if (it.act.overlay) openOverlay(it.act.overlay);
    else if (it.act.run) {
      if (it.act.run[0] === "agent.focus" || it.act.run[0] === "tab.select") toBattle();
      run(it.act.run[0], it.act.run[1]);
    }
  }

  render(_cx) {
    const list = this.items();
    const pickable = list.map((it, i) => (!it.heading && !it.sep && !it.disabled && it.act ? i : -1)).filter((i) => i >= 0);
    if (!pickable.includes(this.at)) this.at = pickable[0] ?? -1;
    const move = (d) => {
      if (!pickable.length) return;
      const k = pickable.indexOf(this.at);
      this.at = pickable[(k + d + pickable.length) % pickable.length];
    };
    return root(v_flex())
      .id("hq-menu")
      .track_focus(this.handle)
      .w_full()
      .p(8)
      .bg(C.win)
      .rounded(8)
      .border(2)
      .border_color(C.silver)
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === "down" || k === "tab") move(1);
        else if (k === "up") move(-1);
        else if (k === "enter" || k === "space") this.choose(list[this.at]);
        else if (k === "escape") closeOverlay(props()?.overlay);
        else if (/^[1-9]$/.test(k) && !e.modifiers.control && !e.modifiers.platform) {
          this.choose(list.find((it) => it.summon === Number(k) - 1 && !it.disabled));
        } else return;
        cx.notify();
      })
      .children(
        list.map((it, i) => {
          if (it.heading) return div().flex_none().h(20).pt(2).text_color(C.gold).truncate().child(`♦ ${it.heading}`);
          if (it.sep) return div().flex_none().h(2).my(4).bg(C.rule);
          const on = i === this.at;
          const color = it.disabled ? C.dim : it.danger ? (on ? C.red : C.rose) : on ? C.gold : C.text;
          return h_flex()
            .id(`hq-mi-${i}`)
            .flex_none()
            .h(24)
            .px(4)
            .gap(6)
            .items_center()
            .rounded(4)
            .text_color(color)
            .when(on, (el) => el.bg(C.hover))
            .when(!it.disabled, (el) => el.cursor_pointer())
            .on_hover((hovered, cx) => {
              if (hovered && !it.disabled && it.act) {
                this.at = i;
                cx.notify();
              }
            })
            .on_click(() => this.choose(it))
            .child(cursor(on, false))
            .when(Boolean(it.icon?.icon), (el) => el.child(programIcon(it.icon, 14, color)))
            .child(div().flex_1().min_w(0).truncate().child(it.label))
            .when(Boolean(it.note) && !it.hint, (el) => el.child(div().flex_none().text_color(C.dim).child(it.note)))
            .when(Boolean(it.hint), (el) => el.child(div().flex_none().text_color(C.dim).child(it.hint)));
        }),
      );
  }
}
