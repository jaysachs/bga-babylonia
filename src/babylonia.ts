import { BaseGame } from './basegame';
import { BGamedatas } from './bdata';
import { View } from './view';
import { SelectExtraTurnState } from './states/select_extra_turn';
import { EndOfTurnScoringState } from './states/end_of_turn_scoring';
import { SelectZigguratCardState } from './states/select_ziggurate_card';
import { PlayPiecesState } from './states/play_pieces';
import { SelectScoringHexState } from './states/select_scoring_hex';
import { FinishTurnState } from './states/finish_turn';

/** Game class */
export class Game extends BaseGame<Player, BGamedatas> {
  private view: View;

  constructor(bga: Bga<Player, BGamedatas>) {
    super(bga);
    this.view = new View(bga);
  }

  setup(gamedatas: BGamedatas) {
    this.view = new View(this.bga);
    this.view.setup(gamedatas);

    this.registerLogArgs();

    this.registerStateClasses();

    this.bga.notifications.setupPromiseNotifications({
      logger: console.log,
      handlers: [this, ...this.bga.states.getStateClasses()],
    });

    // if a ziggurat card is being chosen
    // FIXME: this should be done in a state class for ScoreHex state
    if (gamedatas.current_scoring_hex) {
       this.view.markHexSelected(gamedatas.current_scoring_hex);
    }
    console.log('Game setup done');
  }

  private registerStateClasses(): void {
    this.bga.states.register('SelectExtraTurn', new SelectExtraTurnState (this.bga, this.view, this.animationManager));
    this.bga.states.register('FinishTurn', new FinishTurnState(this.bga, this.view, this.animationManager));
    this.bga.states.register('EndOfTurnScoring', new EndOfTurnScoringState (this.bga, this.view, this.animationManager));
    this.bga.states.register('SelectZigguratCard', new SelectZigguratCardState(this.bga, this.view, this.animationManager));
    this.bga.states.register('PlayPieces', new PlayPiecesState(this.bga, this.view, this.animationManager));
    this.bga.states.register('SelectScoringHex', new SelectScoringHexState(this.bga, this.view, this.animationManager));
  }

  private registerLogArgs(): void {
    this.registerLogArg('piece', (args) => this.view.renderedPiece(args.piece, args.player_id));
    this.registerLogArg('city', (args) => this.view.renderedPiece(args.city));
    this.registerLogArg('zcard', (args) => this.view.renderedZcard(args.zcard));
    this.registerLogArg('original_piece', (args) => this.view.renderedPiece(args.original_piece, args.player_id));
  }
}
