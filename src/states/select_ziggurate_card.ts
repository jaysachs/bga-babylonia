import { BblPlayer, BGamedatas } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { Attrs, CSS, IDS, View } from "../view";
import { BabyloniaState } from "./base";

type StateArgs = {
  hex: number;
  available_cards: string[];
}

export class SelectZigguratCardState extends BabyloniaState {
  private controller = new AbortController();
  constructor(bga: Bga<BblPlayer, BGamedatas>, view: View, animationManager: AnimationManager) {
    super(bga, view, animationManager);
  }

  override onEnteringState(args: StateArgs, isCurrentPlayerActive: boolean) {
    this.view.markHexSelected(args.hex);
    if (isCurrentPlayerActive) {
      const div = $(IDS.AVAILABLE_ZCARDS) as HTMLElement;
      div.scrollIntoView(false);
      this.attachHandler();
    }
  }

  override onLeavingState(args: StateArgs, isCurrentPlayerActive: boolean) {
    this.view.unmarkHexSelected(args.hex);
    if (isCurrentPlayerActive) {
      this.controller.abort();
    }
  }

  private attachHandler() {
      this.controller.abort();
      this.controller = new AbortController();
      $(IDS.AVAILABLE_ZCARDS).addEventListener('click', e => this.onZcardClicked(e), { signal: this.controller.signal });
  }

  private confirmSelection(e: Element) {
    e.classList.toggle(CSS.SELECTED);
    this.controller.abort();
    const zt = e.getAttribute(Attrs.ZTYPE)!;
    this.bga.statusBar.removeActionButtons();
    this.bga.statusBar.setTitle(_('Select ziggurat card ${zcard}?'), { zcard: zt });

    this.bga.statusBar.addActionButton(_('Confirm'),
      () => this.bga.actions.performAction('actSelectZigguratCard', { zctype: zt }),
      { autoclick: true }
    );

    this.bga.statusBar.addActionButton(
      _('Cancel'),
      () => {
        e.classList.toggle(CSS.SELECTED);
        this.bga.states.restoreServerGameState();
      },
      { color: "secondary"});
  }

  private onZcardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    let e = event.target as HTMLElement;
    let z = e.getAttribute(Attrs.ZTYPE);
    if (!z) { return false; }
    if (e.getAttribute(Attrs.ZTYPE)) {
      this.confirmSelection(e);
    }
    return false;
  }

  async notif_zigguratCardSelection(
    args: {
      zcard: string;
      player_id: number;
      cardused: boolean;
      // points: number;
    }
  ) {
    const dest = $(IDS.playerBoardZcards(args.player_id));
    const zelem = $(IDS.zcard(args.zcard));

    zelem.classList.remove(CSS.SELECTED);
    await this.animationManager.slideAndAttach(zelem, dest, { toPlaceholder: 'off' })
    // this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
    if (args.cardused) {
      zelem.setAttribute(Attrs.ZUSED, "");
    }
  }
}
