import { BblPlayer, BGamedatas } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { View } from "../view";
import { BabyloniaState } from "./base";

export class ScoreHexState extends BabyloniaState {
  constructor(bga: Bga<BblPlayer, BGamedatas>, view: View, animationManager: AnimationManager) {
    super(bga, view, animationManager);
  }

  override onEnteringState(args: { current_scoring_hex: number }, isCurrentPlayerActive: boolean) {
    this.view.markHexSelected(args.current_scoring_hex);
  }

  override onLeavingState(args: { current_scoring_hex: number }, isCurrentPlayerActive: boolean) {
    this.view.unmarkHexSelected(args.current_scoring_hex);
  }
}
