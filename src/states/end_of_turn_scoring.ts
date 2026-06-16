import { CSS, IDS } from "../view";
import { BabyloniaState } from "./base";

export class EndOfTurnScoringState extends BabyloniaState {
  override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
       this.view.markAllHexesUnplayable();
    }
  }

    private async indicateNeighbors(
    winnerHexes: number[],
    otherHexes: number[]) {
    if (this.animationManager.animationsActive()) {
      for (const rc of otherHexes) {
         this.view.hexDiv(rc).classList.add(CSS.IN_NETWORK);
         this.view.hexDiv(rc).classList.add(CSS.UNIMPORTANT);
      }
      for (let i = 0; i < 3; i++) {
        for (const rc of winnerHexes) {
           this.view.hexDiv(rc).classList.add(CSS.IN_NETWORK);
        }
        await this.bga.gameui.wait(250);
        for (const rc of winnerHexes) {
           this.view.hexDiv(rc).classList.remove(CSS.IN_NETWORK);
        }
        await this.bga.gameui.wait(250);
      }
      for (const rc of otherHexes) {
         this.view.hexDiv(rc).classList.remove(CSS.IN_NETWORK);
         this.view.hexDiv(rc).classList.remove(CSS.UNIMPORTANT);
      }
    }
  }

  async notif_zigguratScored(
    args: {
      rc: number;
      player_name: string;
      player_id: number;
      winner_hexes: number[];
      other_hexes: number[];
    }) {
      // slight subtlety here; if there is a winner, leave the hex selected until after the cards is selected
      await this.indicateNeighbors(args.winner_hexes, args.other_hexes).then(() => { if (!args.player_id) this.view.unmarkHexSelected(args.rc) });
    // TODO: consider better visual treatments
  }

  async notif_cityScored(
    args: {
      rc: number;
      city: string;
      player_id: number;
      winner_hexes: number[];
      other_hexes: number[];
      details: {
        player_id: number;
        captured_city_count: number;
        network_locations: number[];
        scored_locations: number[];
        network_points: number;
        capture_points: number;
      }[];
    }
  ) {
    const hex = $(IDS.hexDiv(args.rc));

    let aa = this.animationManager.animationsActive();
    for (const playerId in args.details) {
      const details = args.details[playerId]!;
      if (aa) {
        for (const nh of details.network_locations) {
          let cl =  this.view.hexDiv(nh).classList;
          cl.add(CSS.IN_NETWORK);
          if (!details.scored_locations.some(sh => (nh == sh))) {
            cl.add(CSS.UNIMPORTANT);
          }
        }
        await this.animationManager.displayScoring(
          hex,
          details.network_points,
          this.bga.gameui.gamedatas.players[playerId]!.color,
          { extraClass: 'bbl_city_scoring' });
        details.network_locations.forEach(
          (rc: number) => {
            let cl =  this.view.hexDiv(rc).classList;
            cl.remove(CSS.IN_NETWORK);
            cl.remove(CSS.UNIMPORTANT);
          });
      }
      this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.network_points);
    }

    await this.indicateNeighbors(args.winner_hexes, args.other_hexes);

    let dest = (args.player_id != 0)
      ? $(IDS.citycount(args.player_id))
      // TODO: find a better location for 'off the board' but not to any player?
      : this.bga.gameArea.getElement();

    await this.animationManager.slideOutAndDestroy(
      hex.firstElementChild as HTMLElement, dest, {}).then(() => {
        this.view.unmarkHexSelected(args.rc);
        for (const playerId in args.details) {
          const details = args.details[playerId]!;
          this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.capture_points);
          this.view.updateCapturedCityCount(details);
        }
      }).then(() => this.view.unmarkHexSelected(args.rc));
  }

}
