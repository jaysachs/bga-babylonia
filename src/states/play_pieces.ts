import { Hex, PieceType } from "../bdata";
import { AnimationList } from "../more-animations";
import { BabyloniaState } from "./base";
import { Piece } from "../piece";
import { IDS } from "../ids";
import { Css } from "../css";
import { PieceInfo } from "../hand";

interface PlayStateArgs {
    canEndTurn: boolean;
    allowedMoves: Record<string, number[]>;
    canUndo: boolean;
    potential_city_scoring: Record<string, Record<string, number>>;
}

export class PlayPiecesState extends BabyloniaState {
    private playStateArgs: PlayStateArgs = { canEndTurn: false, allowedMoves: {}, canUndo: false, potential_city_scoring: {} };

    private doEnterState(playStateArgs: PlayStateArgs) {
        this.playStateArgs = playStateArgs;
        this.bga.gameui.gamedatas.potential_city_scoring = playStateArgs.potential_city_scoring;
        this.boardManager.markAllHexesUnplayable();
        if (this.bga.players.isCurrentPlayerActive()) {
            this.setStatusBarForPlayState();
        }
    }

    override onEnteringState(args: { playState: PlayStateArgs; must_end_game: number[]; may_end_game: number[]; }, isCurrentPlayerActive: boolean) {
        console.log(args);
        if (isCurrentPlayerActive) {
            this.handManager.addSelectionHandler(this.handSelectionHandler);
            if (args.must_end_game.length > 0) {
                this.bga.gameArea.addLastTurnBanner(_("This is your last turn"));
            } else if (args.may_end_game.length > 0) {
                this.bga.gameArea.addLastTurnBanner(_("This may be your last turn"));
            }
        }
        this.doEnterState(args.playState);
    }

    override onLeavingState(args: any, isCurrentPlayerActive: boolean): void {
        this.handManager.removeSelectionHandler(this.handSelectionHandler);
    }

    async notif_piecePlayed(
        args: {
            player_id: number;
            points: number;
            piece: PieceType;
            original_piece?: PieceType;
            handpos?: number;
            rc: number;
            hand_size: number;
            captured_piece: PieceType | null;
            field_points: number;
            ziggurat_points: number;
            touched_ziggurats: number[];
            playState: PlayStateArgs;
        }
    ) {
        let anims: AnimationList = [];
        const hexDiv = this.boardManager.hexDiv(args.rc);
        const logicalHandDiv = (args.handpos === undefined) ? undefined : this.handManager.spaceForLogicalPos(args.handpos);
        let pieceDiv = logicalHandDiv?.firstElementChild as HTMLElement;
        // Either not active player, or another window of the active player (so piece still in hand)
        if (args.handpos === undefined || pieceDiv) {
            // Check for field capture
            if (Piece.isNonEmpty(args.captured_piece) /* .startsWith('field') */) {
                let field = hexDiv.firstElementChild as HTMLElement;
                if (!field) { // or field is not F567X
                    console.error("attempt to capture a field that is not there");
                }
                // slide the captured field to the player board
                anims.push(() => this.animationManager.slideOutAndDestroy(field, this.playerPanelManager.handcountElement(args.player_id), {}))
            }
            anims.push(() => {
                if (!pieceDiv) {
                    // slide piece from hand count to hex
                    pieceDiv = Piece.createDiv(args.piece, this.bga.players.getPlayerById(args.player_id));
                    this.playerPanelManager.handcountElement(args.player_id).appendChild(pieceDiv);
                }
                return this.animationManager.slideAndAttach(pieceDiv, hexDiv, { fromPlaceholder: 'off' })
                    .then(() => Piece.set(pieceDiv, args.piece, this.bga.players.getPlayerById(args.player_id)));
            });
        }

        await this.animationManager.playParallel(anims)

        // animate the ziggurat scoring, if any
        anims = [];
        if (args.ziggurat_points > 0) {
            args.touched_ziggurats.forEach(z => this.boardManager.markHexSelected(z));
            anims.push(...args.touched_ziggurats.map((rc: number) =>
                () => this.animationManager.displayScoring(
                    this.boardManager.hexDiv(rc),
                    1,
                    this.bga.players.getPlayerById(args.player_id)!.color,
                    { extraClass: 'bbl_city_scoring', duration: 700 })
            )
            );
        }
        await this.animationManager.playParallel(anims)
        args.touched_ziggurats.forEach(z => this.boardManager.unmarkHexSelected(z))
        this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);

        this.playerPanelManager.updateHandCount(args);
        this.doEnterState(args.playState);
    }

    async notif_undoMove(
        args: {
            points: number;
            player_id: number;
            rc: number;
            playState: PlayStateArgs;
            original_piece?: PieceType;
            handpos?: number;
            captured_piece: PieceType;
            hand_size: number;
        }
    ) {
        let anims: AnimationList = [];
        let hexDiv = this.boardManager.hexDiv(args.rc);

        if (Piece.isNonEmpty(args.captured_piece)) {
            // slide the previously captured field back
            let field = Piece.createDiv(args.captured_piece);
            anims.push(() => {
                this.playerPanelManager.handcountElement(args.player_id).appendChild(field);
                return this.animationManager.slideAndAttach(field, hexDiv, { fromPlaceholder: 'off' });
            })
        }

        let pieceDiv = hexDiv.firstElementChild as HTMLElement;
        // Note that handpos is private data, only set for the active player
        //  so its existence is equivalent to "isCurrentPlayerActive()"
        let destDiv = args.handpos !== undefined 
            ? this.handManager.spaceForLogicalPos(args.handpos) 
            : this.playerPanelManager.handcountElement(args.player_id);

        if (args.original_piece) {
            // restore piece value, e.g. if it was originally hidden
            Piece.set(pieceDiv, args.original_piece, this.bga.players.getPlayerById(args.player_id));
        }
        // slide the played piece back to the hand
        anims.push(() => this.animationManager.slideAndAttach(pieceDiv, destDiv, { fromPlaceholder: 'off' }));

        await this.animationManager.playParallel(anims);
        if (args.handpos !== undefined) {
            destDiv.classList.add(Css.PLAYABLE);
        }
        this.playerPanelManager.updateHandCount(args);
        this.bga.playerPanels.getScoreCounter(args.player_id).incValue(-args.points);

        this.doEnterState(args.playState);
    }

    private attachBoardHandler() {
        this.boardManager.addHandler(this.boardSelectionHandler);
    }

    private removeBoardHandler() {
        this.boardManager.removeHandler(this.boardSelectionHandler);
    }

    private allowedMovesFor(pieceType: PieceType | null): number[] {
        if (!pieceType) { return []; }
        const piece = pieceType.split('_')[0]!;
        return (this.playStateArgs.allowedMoves[""] ?? [])
            .concat(this.playStateArgs.allowedMoves[piece] ?? []);
    }

    private markHexesPlayableForPiece(pieceType: PieceType): void {
        this.boardManager.markHexesPlayable(this.allowedMovesFor(pieceType));
    }

    private unmarkHexesPlayableForPiece(pieceType: PieceType): void {
        this.boardManager.unmarkHexesPlayable(this.allowedMovesFor(pieceType));
    }

    private async unselectAllHandPieces() {
        await this.handManager.unselectAllPieces();
    }

    private setPlayablePieces(): void {
        this.handManager.setPlayablePieces(e => this.allowedMovesFor(e).length > 0);
    }

    private async handleBoardSelections(hex: number, hexDiv: HTMLElement, piece: PieceType | null, capturedPieceDiv: HTMLElement | null | undefined, terrain: string) {
        const selectedPiece = this.handManager.getSelectedPiece(true);
        if (!selectedPiece) {
            console.error('no piece selected!');
            return;
        }
        this.handManager.disableUserInteraction();
        await this.handManager.unselectAllPieces();
        let anims: AnimationList = [];

        // Check for field capture
        if (capturedPieceDiv) /* and is field */ {
            anims.push(() => this.animationManager.slideOutAndDestroy(capturedPieceDiv, this.playerPanelManager.handcountElement(this.bga.players.getCurrentPlayerId()), {}));
        }

        anims.push(() =>
            // slide piece from hand to hex
            this.animationManager.slideAndAttach(selectedPiece.pieceDiv, hexDiv)
                // FIXME: need to know this is happening? or just let it flip in the notif??
                // play into river, piece is hidden
                .then(() => {
                    if (terrain == 'RIVER') {
                        Piece.set(selectedPiece.pieceDiv, 'hidden', this.bga.players.getCurrentPlayer())
                    }
                })
        );

        await this.animationManager.playParallel(anims);
        await this.bga.actions.performAction('actPlayPiece', { handpos: selectedPiece.logicalPos, rc: hex })
    };

    private boardSelectionHandler = this.handleBoardSelections.bind(this);

    private async handlePieceSelection(pieceInfo: PieceInfo, selected: boolean) {
        if (this.allowedMovesFor(pieceInfo.pieceType).length == 0) {
            console.log("no allowed moves");
            return;
        }
        if (selected) {
            this.markHexesPlayableForPiece(pieceInfo.pieceType);
            this.chooseDestination();
        } else {
            this.removeBoardHandler();
            this.unmarkHexesPlayableForPiece(pieceInfo.pieceType);
            this.setStatusBarForPlayState();
        }
    }
    private handSelectionHandler = this.handlePieceSelection.bind(this);

    private chooseDestination(): void {
        this.attachBoardHandler();
        this.bga.statusBar.setTitle(_('${you} must select a hex to play to'));
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.addActionButton(
            _('Cancel'),
            () => {
                this.unselectAllHandPieces();
                this.setStatusBarForPlayState();
            },
            { color: "secondary" });
    }

    private setStatusBarForPlayState(): void {
        this.bga.statusBar.removeActionButtons();
        if (this.playStateArgs.canEndTurn) {
            let mustEnd = false;
            if (Object.keys(this.playStateArgs.allowedMoves).length == 0) {
                this.bga.statusBar.setTitle(_('${you} must end your turn'));
                mustEnd = true;
                this.setPlayablePieces();
            } else {
                this.bga.statusBar.setTitle(_('${you} may select a piece to play or end your turn'))
                this.handManager.enableUserInteraction();
                this.setPlayablePieces();
            }
            this.bga.statusBar.addActionButton(
                _('End turn'),
                () => {
                    this.handManager.disableUserInteraction();
                    this.bga.actions.performAction('actDonePlayPieces').then(() => this.unselectAllHandPieces());
                }, {
                autoclick: mustEnd && this.autoConfirmEnabled(),
            });
        } else {
            this.bga.statusBar.setTitle(_('${you} must select a piece to play'));
            this.handManager.enableUserInteraction();
            this.setPlayablePieces();
        }
        if (this.playStateArgs.canUndo) {
            this.bga.statusBar.addActionButton(
                _('Undo'),
                () => this.bga.actions.performAction('actUndoPlay').then(() => this.unselectAllHandPieces() ),
                { color: "alert" }
            );
        }
    }
}
