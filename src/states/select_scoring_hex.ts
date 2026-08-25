import { BblPlayer, BGamedatas } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { Attrs, CSS, IDS, View } from "../view";
import { BabyloniaState } from "./base";

export class SelectScoringHexState extends BabyloniaState {
  private handler: (e: Event) => void;
  constructor(bga: Bga<BblPlayer, BGamedatas>, view: View, animationManager: AnimationManager) {
    super(bga, view, animationManager);
    this.handler = (e) => this.onBoardClicked(e);
  }
  override onEnteringState(args: { hexes: number[] }, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.view.markHexesSelectable(args.hexes);
      $(IDS.BOARD).addEventListener('click', this.handler);
    }
  }
  override onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.BOARD).removeEventListener('click', this.handler);
    }
  }

  private onBoardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const hex = this.selectedHex(event.target!);
    if (hex == null) {
      return;
    }
    let piece = this.view.hexDiv(hex).firstElementChild!.getAttribute(Attrs.PIECE);
    this.view.unmarkHexSelectable(hex);
    this.view.markHexSelected(hex);
    // this.bga.statusBar.setTitle(_('Score ${city} at (${row},${col})?'), {
    //   row: hex.row, col: hex.col, city: piece,
    // });
    // TODO: add tooltip
    this.bga.statusBar.setTitle(_('Score ${city}?'), {
      city: piece,
    });
    this.bga.statusBar.addActionButton(_('Confirm'),
      () => this.bga.actions.performAction('actSelectHexToScore', { rc: hex }).then(() => this.view.unmarkHexPlayable(hex)),
      { autoclick: this.autoConfirmEnabled() });
    this.bga.statusBar.addActionButton(_('Cancel'),
      () => {
        this.view.unmarkHexSelected(hex);
        this.view.markHexSelectable(hex);
        this.bga.states.restoreServerGameState();
      },
      { color: "secondary" });
  }

  async notif_scoringSelection(
    args: {
      player_id: number;
      player_name: string;
      rc: number;
      city: string;
    }) {
    this.view.unmarkHexSelectable(args.rc);
    this.view.markHexSelected(args.rc);
  }

}
