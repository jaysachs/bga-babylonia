import { BaseGame } from './basegame';
import { Html } from './html';
import { EndOfTurnScoringState, PlayPiecesState, SelectExtraTurnState, SelectScoringHexState, SelectZigguratCardState } from './gamestates';
import { BGamedatas } from './bdata';
import { Attrs, CSS, View, IDS, Piece } from './view';
import { AnimationList } from './more-animations';

/** Game class */
export class Game extends BaseGame<Player, BGamedatas> {
  private view: View;

  constructor(bga: Bga<Player, BGamedatas>) {
    super(bga);
    this.view = new View(bga);
  }

  setup(gamedatas: BGamedatas) {
    this.registerLogArgs();
    this.view = new View(this.bga);
    this.view.setup(gamedatas);

    // Register states
    this.bga.states.register('SelectExtraTurn', new SelectExtraTurnState(this.bga, this.view, this.animationManager));
    this.bga.states.register('EndOfTurnScoring', new EndOfTurnScoringState(this.bga, this.view, this.animationManager));
    this.bga.states.register('SelectZigguratCard', new SelectZigguratCardState(this.bga, this.view, this.animationManager));
    this.bga.states.register('PlayPieces', new PlayPiecesState(this.bga, this.view, this.animationManager));
    this.bga.states.register('SelectScoringHex', new SelectScoringHexState(this.bga, this.view, this.animationManager));

    this.bga.notifications.setupPromiseNotifications({
      logger: console.log,
      handlers: [this, this.bga.states.getStateClass('PlayPieces')],
    });

    // if a ziggurat card is being chosen
    // FIXME: should this be done in the state watcher?
    if (gamedatas.current_scoring_hex) {
       this.view.markHexSelected(gamedatas.current_scoring_hex);
    }
    console.log('Game setup done');
  }

  private async notif_turnFinished(
    args: {
      player_id: number;
      hand_size: number;
      pool_size: number;
    }
  ) {
    this.view.updateHandCount(args);
    this.view.updatePoolCount(args);
  }

  private async notif_handRefilled(args: { hand: string[] }) {
    const anims: AnimationList = [];
    const pid = this.bga.gameui.player_id;
    const hand = $(IDS.HAND);
    let handPosDiv = hand.firstElementChild;
    for (let newPiece of args.hand) {
      if (!handPosDiv) {
        // dynamically expand hand if 7 size hand is chosen
        handPosDiv = Html.div({});
        hand.appendChild(handPosDiv);
      }
      let pieceDiv = handPosDiv!.firstElementChild as HTMLElement;
      if (!pieceDiv) {
        if (newPiece && newPiece != Piece.EMPTY) {
          let destDiv = handPosDiv! as HTMLElement;
          anims.push(() => {
            pieceDiv = this.view.createPieceDiv(newPiece, pid);
            $(IDS.poolcount(pid)).appendChild(pieceDiv);
            return this.animationManager.slideAndAttach(pieceDiv, destDiv, { fromPlaceholder: 'off' })
          });
        }
      } else {
         let pt = pieceDiv.getAttribute(Attrs.PIECE);
         if (!pt) {
           console.error("hand had piece div but no attribute");
         } else if (pt != Attrs.pieceVal(newPiece!, this.bga.players.getPlayerById(pid))) {
           console.error("piece from args", newPiece, "not matches hand", pieceDiv);
         }
      }
      handPosDiv = handPosDiv!.nextElementSibling as (HTMLElement | null);
    }
    await this.animationManager.playParallel(anims);
  }

  private async notif_extraTurnUsed(args: { card: string; used: boolean; }) {
    const carddiv = $(IDS.zcard(args.card));
    if (carddiv == undefined) {
      console.error(`Could not find div for owned ${args.card} card`, args.card);
    } else {
      carddiv.setAttribute(Attrs.ZUSED, '');
    }
  }

  private async indicateNeighbors(
    winnerHexes: number[],
    otherHexes: number[]) {
    if (this.bgaAnimationsActive()) {
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

  private async notif_zigguratScored(
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

  private async notif_scoringSelection(
    args: {
      player_id: number;
      player_name: string;
      rc: number;
      city: string;
    }) {
     this.view.markHexSelected(args.rc);
  }

  private async notif_zigguratCardSelection(
    args: {
      zcard: string;
      player_id: number;
      cardused: boolean;
      // points: number;
      hex: number;
    }
  ) {
    this.view.unmarkHexSelected(args.hex);
    const dest = $(IDS.playerBoardZcards(args.player_id));
    const zelem = $(IDS.zcard(args.zcard));
    zelem.classList.remove(CSS.SELECTED);
    await this.animationManager.slideAndAttach(zelem, dest, { toPlaceholder: 'off' })
        .then(() => {
          // this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
          if (args.cardused) {
            zelem.setAttribute(Attrs.ZUSED, "true");
          }
        });
  }

  private async notif_cityScored(
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

    let aa = this.bgaAnimationsActive();
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
      // this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.network_points);
    }

    await this.indicateNeighbors(args.winner_hexes, args.other_hexes);

    let dest = (args.player_id != 0)
      ? $(IDS.citycount(args.player_id))
      // TODO: find a better location for 'off the board' but not to any player?
      : this.bga.gameui.getGameAreaElement();

    await this.animationManager.slideOutAndDestroy(
      hex.firstElementChild as HTMLElement, dest, {}).then(() => {
        this.view.unmarkHexSelected(args.rc);
        for (const playerId in args.details) {
          const details = args.details[playerId]!;
          // this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.capture_points);
          this.view.updateCapturedCityCount(details);
        }
      }).then(() => this.view.unmarkHexSelected(args.rc));
  }

  ///////
  private registerLogArgs(): void {
    this.registerLogArg('piece', (args) => this.view.renderedPiece(args.piece, args.player_id));
    this.registerLogArg('city', (args) => this.view.renderedPiece(args.city));
    this.registerLogArg('zcard', (args) => this.view.renderedZcard(args.zcard));
    this.registerLogArg('original_piece', (args) => this.view.renderedPiece(args.original_piece, args.player_id));
  }
}
