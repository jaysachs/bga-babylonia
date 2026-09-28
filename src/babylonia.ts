import { BaseGame } from './libs/basegame';
import { BblPlayer, BGamedatas, PieceType } from './model/data';
import { SelectExtraTurnState } from './states/select_extra_turn';
import { EndOfTurnScoringState } from './states/end_of_turn_scoring';
import { SelectZigguratCardState } from './states/select_ziggurat_card';
import { PlayPiecesState } from './states/play_pieces';
import { SelectScoringHexState } from './states/select_scoring_hex';
import { FinishTurnState } from './states/finish_turn';
import { ScoreHexState } from './states/score_hex';
import { HandManager } from './components/hand';
import { ZCardManager } from './components/zcards';
import { TooltipManager } from './libs/tooltips';
import { Piece } from './components/piece';
import { Html } from './libs/html';
import { BoardManager } from './components/board';
import { PlayerPanelManager } from './components/player_panel';
import { range } from './libs/utils';
import { Autosizer } from './components/autosizer';

/** Game class */
export class Game extends BaseGame<BblPlayer, BGamedatas> {

    private playerPanelManager: PlayerPanelManager;
    private boardManager: BoardManager;
    private handManager: HandManager;
    private zcardManager: ZCardManager;

    constructor(bga: Bga<BblPlayer, BGamedatas>) {
        super(bga);

        this.playerPanelManager = new PlayerPanelManager(bga, this.tooltipManager);
        this.boardManager = new BoardManager(bga, this.textFormatter, this.tooltipManager);
        this.handManager = new HandManager(bga, this.animationManager, this.playerPanelManager)
        this.zcardManager = new ZCardManager(bga, this.textFormatter, this.playerPanelManager, this.tooltipManager);
    }

    async setup(gamedatas: BGamedatas) {
        this.tooltipManager.setup();
        this.playerPanelManager.setup();

        // FIXME: make Piece a PieceManager / PieceComponent instance
        /* this. */ Piece.setup(this.bga, this.textFormatter);
        const mainElem = this.makeHtml(
                this.boardManager.setup(),
                this.handManager.setup(),
                this.zcardManager.setup());
        this.bga.gameArea.getElement().appendChild(mainElem);

        this.registerStates();

        this.bga.notifications.setupPromiseNotifications({
            // logger: console.log,
            handlers: [this, ...this.bga.states.getStateClasses()],
            onEnd: () => this.boardManager.addHexHovers(),
        });
        new Autosizer(this.bga).setup(mainElem)
            // FIXME: see if can make this not needed
            .then(() => this.boardManager.addHexHovers())
            .then(() => console.debug('Game setup done'));
    }

    private registerStates(): void {
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
