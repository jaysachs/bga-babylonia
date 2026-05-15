import { BGamedatas } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { CSS, IDS, View } from "../view";

export abstract class BabyloniaState {
  // Returns the hex (row,col) clicked on, or null if not a playable hex
  protected selectedHex(target: EventTarget): number | null {
    let hexDiv = target as Element;
    while (hexDiv.parentElement != null && hexDiv.parentElement.id != IDS.BOARD) {
      hexDiv = hexDiv.parentElement;
    }
    if (hexDiv.parentElement == null) {
      console.warn('no hex');
      return null;
    }
    // now check if it's allowed
    if (!hexDiv.classList.contains(CSS.PLAYABLE)) {
      return null;
    }
    const id = hexDiv.id.split('_');
    return Number(id[2]);
  }


  constructor(protected bga: Bga<Player, BGamedatas>, protected view: View, protected animationManager: AnimationManager) {}

  public onEnteringState(args: any, isCurrentPlayerActive: boolean) {}

  public onLeavingState(args: any, isCurrentPlayerActive: boolean) {}
}
