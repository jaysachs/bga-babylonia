import { BaseGame } from './basegame';
import { BblPlayer, BGamedatas, PieceType } from './bdata';
import { SelectExtraTurnState } from './states/select_extra_turn';
import { EndOfTurnScoringState } from './states/end_of_turn_scoring';
import { SelectZigguratCardState } from './states/select_ziggurat_card';
import { PlayPiecesState } from './states/play_pieces';
import { SelectScoringHexState } from './states/select_scoring_hex';
import { FinishTurnState } from './states/finish_turn';
import { ScoreHexState } from './states/score_hex';
import { HandManager } from './hand';
import { ZCardManager } from './zcards';
import { TooltipManager } from './tooltips';
import { Piece } from './piece';
import { Html } from './html';
import { BoardManager } from './board';
import { PlayerPanelManager } from './player_panel';
import { IDS } from './ids';
import { range } from './utils';
import { Css } from './css';
import { Autosizer } from './autosizer';

/** Game class */
export class Game extends BaseGame<BblPlayer, BGamedatas> {

    constructor(bga: Bga<BblPlayer, BGamedatas>) {
        super(bga);
    }

    async setup(gamedatas: BGamedatas) {
        this.bga.gameArea.getElement().appendChild(this.base_html());
        if (this.bga.players.isCurrentPlayerSpectator()) {
            $(IDS.MAIN).classList.add(Css.IS_SPECTATOR);
        }

        const tooltipManager = new TooltipManager(this.bga);
        const playerPanelManager = new PlayerPanelManager(this.bga);
        const boardManager = new BoardManager(this.bga, tooltipManager);
        const handManager = new HandManager(this.bga, this.animationManager, playerPanelManager, this.bga.players.getPlayerById(gameui.player_id))
        const zcardManager = new ZCardManager(this.bga, playerPanelManager, tooltipManager);

        this.registerLogArgs(zcardManager);

        this.bga.states.register('SelectExtraTurn', new SelectExtraTurnState(this.bga, this.animationManager, boardManager, handManager, zcardManager, playerPanelManager));
        this.bga.states.register('FinishTurn', new FinishTurnState(this.bga, this.animationManager, boardManager, handManager, zcardManager, playerPanelManager));
        this.bga.states.register('EndOfTurnScoring', new EndOfTurnScoringState(this.bga, this.animationManager, boardManager, handManager, zcardManager, playerPanelManager));
        this.bga.states.register('SelectZigguratCard', new SelectZigguratCardState(this.bga, this.animationManager, boardManager, handManager, zcardManager, playerPanelManager));
        this.bga.states.register('PlayPieces', new PlayPiecesState(this.bga, this.animationManager, boardManager, handManager, zcardManager, playerPanelManager));
        this.bga.states.register('SelectScoringHex', new SelectScoringHexState(this.bga, this.animationManager, boardManager, handManager, zcardManager, playerPanelManager));
        this.bga.states.register('ScoreHex', new ScoreHexState(this.bga, this.animationManager, boardManager, handManager, zcardManager, playerPanelManager));

        this.bga.notifications.setupPromiseNotifications({
            // logger: console.log,
            handlers: [this, ...this.bga.states.getStateClasses()],
        });

        new Autosizer(this.bga).initialize().then(() => console.debug('Game setup done'));
    }

    private registerLogArgs(zcardManager: ZCardManager): void {
        this.registerLogArg('piece', (args) => this.renderPieceForLog(args.piece, args.player_id));
        this.registerLogArg('city', (args) => this.renderPieceForLog(args.city));
        this.registerLogArg('zcard', (args) => zcardManager.createSpan(args.zcard));
        this.registerLogArg('original_piece', (args) => this.renderPieceForLog(args.original_piece, args.player_id));
        this.registerLogArg('captured_piece', (args) => this.renderPieceForLog(args.captured_piece));
    }

    private renderPieceForLog(piece: PieceType, player_id: number = 0): HTMLElement {
        const tp = this.bga.gameui.gamedatas.translated_pieces[piece];
        const translated = tp ? _(tp) : '';
        return Html.span({ title: translated, attrs: Piece.attr(piece, this.bga.players.getPlayerById(player_id)) });
    }


    private base_html(): HTMLElement {
        return Html.div({},
            Html.div({ id: IDS.MAIN },
                Html.div({ id: "bbl_hand_container" },
                    Html.div({ id: IDS.HAND })
                ),
                Html.div({ id: 'bbl_board_container' },
                    Html.div({ id: "bbl_available_zcards_container" },
                        Html.div({ id: IDS.AVAILABLE_ZCARDS })
                    ),
                    Html.div({ id: 'bbl_column_headers' },
                        ...range('A'.charCodeAt(0), 'Q'.charCodeAt(0)).map(c => Html.span({ text: String.fromCharCode(c) })),
                    ),
                    Html.div({ id: 'bbl_row_headers' },
                        ...range(1, 23).map(c => Html.span({ text: String(c) })),
                    ),
                    Html.div({ id: IDS.BOARD },
                    )
                )
            ),
            Html.div({ id: IDS.OFF_BOARD })
        );
    }
}
