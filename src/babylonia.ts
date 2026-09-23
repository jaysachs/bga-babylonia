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
import { range } from './utils';
import { Autosizer } from './autosizer';

/** Game class */
export class Game extends BaseGame<BblPlayer, BGamedatas> {

    private tooltipManager: TooltipManager;
    private playerPanelManager: PlayerPanelManager;
    private boardManager: BoardManager;
    private handManager: HandManager;
    private zcardManager: ZCardManager;

    constructor(bga: Bga<BblPlayer, BGamedatas>) {
        super(bga);

        this.tooltipManager = new TooltipManager(bga);
        this.playerPanelManager = new PlayerPanelManager(bga, this.tooltipManager);
        this.boardManager = new BoardManager(bga, this.tooltipManager);
        this.handManager = new HandManager(bga, this.animationManager, this.playerPanelManager)
        this.zcardManager = new ZCardManager(bga, this.playerPanelManager, this.tooltipManager);
    }

    async setup(gamedatas: BGamedatas) {
        this.tooltipManager.setup();
        this.playerPanelManager.setup();

        const mainElem = this.makeHtml(
                this.boardManager.setup(),
                this.handManager.setup(),
                this.zcardManager.setup());
        this.bga.gameArea.getElement().appendChild(mainElem);
        
        this.registerLogArgs();

        this.bga.states.register('SelectExtraTurn', 
            new SelectExtraTurnState(this.bga, this.animationManager, this.boardManager, this.handManager, this.zcardManager, this.playerPanelManager));
        this.bga.states.register('FinishTurn', 
            new FinishTurnState(this.bga, this.animationManager, this.boardManager, this.handManager, this.zcardManager, this.playerPanelManager));
        this.bga.states.register('EndOfTurnScoring', 
            new EndOfTurnScoringState(this.bga, this.animationManager, this.boardManager, this.handManager, this.zcardManager, this.playerPanelManager));
        this.bga.states.register('SelectZigguratCard', 
            new SelectZigguratCardState(this.bga, this.animationManager, this.boardManager, this.handManager, this.zcardManager, this.playerPanelManager));
        this.bga.states.register('PlayPieces', 
            new PlayPiecesState(this.bga, this.animationManager, this.boardManager, this.handManager, this.zcardManager, this.playerPanelManager));
        this.bga.states.register('SelectScoringHex', 
            new SelectScoringHexState(this.bga, this.animationManager, this.boardManager, this.handManager, this.zcardManager, this.playerPanelManager));
        this.bga.states.register('ScoreHex', 
            new ScoreHexState(this.bga, this.animationManager, this.boardManager, this.handManager, this.zcardManager, this.playerPanelManager));

        this.bga.notifications.setupPromiseNotifications({
            // logger: console.log,
            handlers: [this, ...this.bga.states.getStateClasses()],
        });

        new Autosizer(this.bga).setup(mainElem).then(() => console.debug('Game setup done'));
    }

    private registerLogArgs(): void {
        this.registerLogArg('piece', (args) => this.renderPieceForLog(args.piece, args.player_id));
        this.registerLogArg('city', (args) => this.renderPieceForLog(args.city));
        this.registerLogArg('zcard', (args) => this.zcardManager.createSpan(args.zcard));
        this.registerLogArg('original_piece', (args) => this.renderPieceForLog(args.original_piece, args.player_id));
        this.registerLogArg('captured_piece', (args) => this.renderPieceForLog(args.captured_piece));
    }

    private renderPieceForLog(piece: PieceType, player_id: number = 0): HTMLElement {
        const tp = this.bga.gameui.gamedatas.translated_pieces[piece];
        const translated = tp ? _(tp) : '';
        return Html.span({ title: translated, attrs: Piece.attr(piece, this.bga.players.getPlayerById(player_id)) });
    }

    private makeHtml(boardElem: HTMLElement, handElem: HTMLElement | undefined, zcardsElem: HTMLElement): HTMLElement {
        return Html.div({ id: 'bbl_main', classes: this.bga.players.isCurrentPlayerSpectator() ? ['bbl_is_spectator'] : []},
            Html.div({ id: 'bbl_hand_container' }, handElem),
            Html.div({ id: 'bbl_board_container' },
                Html.div({ id: 'bbl_available_zcards_container' }, zcardsElem),
                Html.div({ id: 'bbl_column_headers' },
                    ...range('A'.charCodeAt(0), 'Q'.charCodeAt(0)).map(c => Html.span({ text: String.fromCharCode(c) })),
                ),
                Html.div({ id: 'bbl_row_headers' },
                    ...range(1, 23).map(c => Html.span({ text: String(c) })),
                ),
                boardElem
            )
        );
    }
}
