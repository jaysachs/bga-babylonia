import { BGamedatas } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { Attrs, CSS, IDS, View } from "../view";
import { BabyloniaState } from "./base";

export class SelectScoringHexState extends BabyloniaState {
  private handler: (e: Event) => void;
  constructor(bga: Bga<Player, BGamedatas>, view: View, animationManager: AnimationManager) {
    super(bga, view, animationManager);
    this.handler = (e) => this.onBoardClicked(e);
  }
  override onEnteringState(args: { hexes: number[] }, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
       this.view.markHexesPlayable(args.hexes);
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
    let div =  this.view.hexDiv(hex);
    let piece = div.firstElementChild!.getAttribute(Attrs.PIECE);
    div.classList.add(CSS.SELECTED);
    // this.bga.statusBar.setTitle(_('Score ${city} at (${row},${col})?'), {
    //   row: hex.row, col: hex.col, city: piece,
    // });
    this.bga.statusBar.setTitle(_('Score ${city}?'), {
      city: piece,
    });
    this.bga.statusBar.addActionButton(_('Confirm'),
      () => this.bga.actions.performAction('actSelectHexToScore', { rc: hex }).then(() =>  this.view.unmarkHexPlayable(hex)),
      { autoclick: true });
    this.bga.statusBar.addActionButton(_('Cancel'),
      () => {
        div.classList.remove(CSS.SELECTED);
        this.bga.states.restoreServerGameState();
      },
      { color: "secondary" });
  }
}
