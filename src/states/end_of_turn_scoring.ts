import { BabyloniaState } from "./base";

export class EndOfTurnScoringState extends BabyloniaState {
  override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
       this.view.markAllHexesUnplayable();
    }
  }
}
