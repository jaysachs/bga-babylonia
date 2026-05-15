import { BGamedatas } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { Attrs, CSS, IDS, View } from "../view";
import { BabyloniaState } from "./base";

export class SelectZigguratCardState extends BabyloniaState {
  private handler: (e: Event) => void;
  constructor(bga: Bga<Player, BGamedatas>, view: View, animationManager: AnimationManager) {
    super(bga, view, animationManager);
    this.handler = (e) => this.onZcardClicked(e);
  }

  override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      const div = $(IDS.AVAILABLE_ZCARDS) as HTMLElement;
      div.scrollIntoView(false);
      $(IDS.AVAILABLE_ZCARDS).addEventListener('click', this.handler);
    }
  }

  override onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.AVAILABLE_ZCARDS).removeEventListener('click', this.handler);
    }
  }

  private toggleZcardSelected(e: Element) {
    const zt = e.getAttribute(Attrs.ZTYPE)!;
    let promptForConfirmation = () => {
      this.bga.statusBar.setTitle(_('Select ziggurat card ${zcard}?'), { zcard: zt });

      this.bga.statusBar.addActionButton(_('Confirm'),
        () => this.bga.actions.performAction('actSelectZigguratCard', { zctype: zt }),
        { autoclick: true }
      );

      this.bga.statusBar.addActionButton(
        _('Cancel'),
        () => this.toggleZcardSelected(e),
        { color: "secondary"});
    };
    let cancel = () => this.bga.states.restoreServerGameState();

    let alreadySelected = document.querySelector(`#${IDS.AVAILABLE_ZCARDS} > .${CSS.SELECTED}`);
    e.classList.toggle(CSS.SELECTED);
    if (alreadySelected == null) {
      promptForConfirmation();
    } else if (alreadySelected == e) {
      cancel();
    } else {
      alreadySelected.classList.toggle(CSS.SELECTED);
      cancel();
      promptForConfirmation();
    }
  }

  onZcardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    let e = event.target as HTMLElement;
    let z = e.getAttribute(Attrs.ZTYPE);
    if (!z) { return false; }
    if (e.getAttribute(Attrs.ZTYPE)) {
      this.toggleZcardSelected(e);
    }
    return false;
  }
}
