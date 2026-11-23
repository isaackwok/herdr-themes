// Herdr Quest: a 16-bit RPG layout. The whole look is this one mod, in roles
// (props { role } from layouts/herdr-quest.json and from its own popups):
//   quests   the top bar: crest (world menu), tabs as quests, + Quest, Satchel
//   map      spaces as realms on the world map, grouped by machine
//   party    agents as heroes, with gauges; sub-agents as familiars
//   pane     a pane's title (the layout's pane header): a workbench window
//   message  the narrator: realm, party tally, what needs you, a clock
//   command  the command menu: Herdr's main actions
//   satchel  the right panel's title: Inventory (Files) / Chronicle (Changes)
//   field    the overworld: walk the village, speak to heroes (agents)
//   talk     a conversation window's title bar (over a hero's terminal)
//   journal  the quest log: every realm's quests (tabs), as a panel window
//   wintitle a panel window's title bar (over the Files / Changes panels)
//   menu     every popup menu (summon, realm, quest, pane, member, world)
//   toast    notifications (the layout's "toast"; Herdr gives no role, so a
//            copy with a title and an overlay and no role is a toast)

import { View, div } from "gpui-kit";
import { props, shared, setShared, checking } from "herdr";
import Quests from "./quests.js";
import WorldMap from "./map.js";
import Party from "./party.js";
import PaneTitle from "./pane.js";
import Message from "./message.js";
import Command from "./command.js";
import Satchel from "./satchel.js";
import Menu from "./menu.js";
import Toast from "./toast.js";
import Field from "./field.js";
import Talk from "./talk.js";
import WinTitle from "./wintitle.js";
import Journal from "./journal.js";

const ROLES = { quests: Quests, map: WorldMap, party: Party, pane: PaneTitle, message: Message, command: Command, satchel: Satchel, menu: Menu, toast: Toast, field: Field, talk: Talk, wintitle: WinTitle, journal: Journal };

export default class HerdrQuest extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const role = pr.role ?? ("overlay" in pr && "title" in pr ? "toast" : null);
    this.roleName = role;
    const R = ROLES[role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
    // A panel window (kit.js togglePanel) registers itself, so its hotkey closes it again.
    this.panel = pr.panel && pr.overlay ? [pr.panel, pr.overlay] : null;
    if (this.panel && !checking()) setShared("hq.panels", { ...(shared("hq.panels") ?? {}), [this.panel[0]]: this.panel[1] });
  }

  async close(cx) {
    await this.role?.close?.(cx);
    if (this.panel) {
      const open = shared("hq.panels") ?? {};
      if (open[this.panel[0]] === this.panel[1]) {
        const rest = { ...open };
        delete rest[this.panel[0]];
        setShared("hq.panels", rest);
      }
    }
  }

  render(cx) {
    if (!this.role) return div().child(`herdr-quest: no role "${this.roleName}"`);
    return this.role.render(cx);
  }
}
