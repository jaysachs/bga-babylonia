import { Attrs, IDS } from "../view";
import { BabyloniaState } from "./base";

export class SelectExtraTurnState extends BabyloniaState {
  override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.bga.statusBar.addActionButton(
        _('Take your one-time extra turn'),
        () => this.bga.actions.performAction('actChooseExtraTurn', { take_extra_turn: true })
      );
      this.bga.statusBar.addActionButton(
        _('Just finish your turn'),
        () => this.bga.actions.performAction('actChooseExtraTurn', { take_extra_turn: false })
      );
    }
  }

  async notif_extraTurnUsed(args: { card: string; used: boolean; }) {
      const carddiv = $(IDS.zcard(args.card));
      if (carddiv == undefined) {
        console.error(`Could not find div for owned ${args.card} card`, args.card);
      } else {
        carddiv.setAttribute(Attrs.ZUSED, '');
      }
    }

}
