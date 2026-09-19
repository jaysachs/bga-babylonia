import { Hex, PieceType } from "../bdata";
import { AnimationList } from "../more-animations";
import { BabyloniaState } from "./base";
import { Html } from "../html";
import { Piece } from "../piece";
import { IDS } from "../ids";
import { Css } from "../css";

interface PlayStateArgs {
    canEndTurn: boolean;
    allowedMoves: Record<string, number[]>;
    canUndo: boolean;
    potentialCityScoring: Record<string, Record<string, number>>;
}

export class PlayPiecesState extends BabyloniaState {
    private playStateArgs: PlayStateArgs = { canEndTurn: false, allowedMoves: {}, canUndo: false, potentialCityScoring: {} };

    private hexForRc(rc: number): Hex | undefined {
        for (let hex of this.bga.gameui.gamedatas.board) {
            if (hex.rc == rc) {
                return hex;
            }
        };
        return undefined;
    }

    private doEnterState(playStateArgs: PlayStateArgs) {
        this.playStateArgs = playStateArgs;
        this.bga.gameui.gamedatas.potential_city_scoring = playStateArgs.potentialCityScoring;
        this.boardManager.markAllHexesUnplayable();
        if (this.bga.players.isCurrentPlayerActive()) {
            this.setStatusBarForPlayState();
        }
    }

    override onEnteringState(args: { playState: PlayStateArgs; must_end_game: number[]; may_end_game: number[]; }, isCurrentPlayerActive: boolean) {
        console.log(args);
        if (isCurrentPlayerActive) {
            if (args.must_end_game.length > 0) {
                this.bga.gameArea.addLastTurnBanner(_("This is your last turn"));
            } else if (args.may_end_game.length > 0) {
                this.bga.gameArea.addLastTurnBanner(_("This may be your last turn"));
            }
        }
        this.doEnterState(args.playState);
    }

    async notif_piecePlayed(
        args: {
            player_id: number;
            points: number;
            piece: PieceType;
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
        const handDiv = (args.handpos === undefined) ? undefined : this.handManager.handPosDiv(args.handpos);
        let pieceDiv = handDiv?.firstElementChild as HTMLElement;
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
        let destDiv = args.handpos !== undefined ? this.handManager.handPosDiv(args.handpos) : this.playerPanelManager.handcountElement(args.player_id);

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

    private handController: AbortController = new AbortController();
    private attachHandHandler() {
        this.handController.abort();
        this.handController = new AbortController();
        $(IDS.HAND).childNodes.forEach(e =>
            e.firstChild?.addEventListener('click', p => this.onHandClicked(p), { signal: this.handController.signal })
        );
    }

    private removeHandHandler() {
        this.handController.abort();
    }

    private boardController: AbortController = new AbortController();
    private attachBoardHandler() {
        this.boardController.abort();
        this.boardController = new AbortController();
        $(IDS.BOARD).addEventListener('click', e => this.onBoardClicked(e), { signal: this.boardController.signal });
    }

    private removeBoardHandler() {
        this.boardController.abort();
    }

    private allowedMovesFor(div: Element | null): number[] {
        if (!div) { return []; }
        const piece = Piece.get(div)!.split('_')[0]!;
        return (this.playStateArgs.allowedMoves[""] ?? [])
            .concat(this.playStateArgs.allowedMoves[piece] ?? []);
        ;
    }

    private unmarkHexesPlayable(hexes: number[]): void {
        hexes.forEach(hex => this.boardManager.unmarkHexPlayable(hex));
    }

    private markHexesPlayableForPiece(div: Element): void {
        this.boardManager.markHexesPlayable(this.allowedMovesFor(div));
    }

    private unmarkHexesPlayableForPiece(div: Element): void {
        this.unmarkHexesPlayable(this.allowedMovesFor(div));
    }

    private unselectAllHandPieces(): void {
        const hand = $(IDS.HAND);
        hand.childNodes.forEach(node => {
            const posDiv = node as HTMLElement;
            const cl = posDiv.classList;
            if (cl.contains(Css.SELECTED)) {
                this.unmarkHexesPlayableForPiece(posDiv.firstElementChild!);
            }
            cl.remove(Css.SELECTED);
            cl.remove(Css.PLAYABLE);
            cl.remove(Css.UNPLAYABLE);
        });
    }

    private setPlayablePieces(): void {
        const hand = $(IDS.HAND);

        hand.childNodes.forEach((node) => {
            const child = node as HTMLElement;
            const cl = child.classList;
            if (this.allowedMovesFor(child.firstElementChild).length > 0) {
                cl.add(Css.PLAYABLE);
                cl.remove(Css.UNPLAYABLE);
            } else {
                cl.remove(Css.PLAYABLE);
                cl.add(Css.UNPLAYABLE);
            }
        });
    }

    private selectedHandDiv(): Element | null {
        return document.querySelector(`#${IDS.HAND} > .${Css.SELECTED}`);
    }

    private async onBoardClicked(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        const handDiv = this.selectedHandDiv();
        if (!handDiv) {
            console.error('no piece selected!');
            return;
        }

        const hex = this.boardManager.selectedHexIfPlayable(event.target!);
        if (hex == null) {
            return;
        }


        let anims: AnimationList = [];

        const hexDiv = this.boardManager.hexDiv(hex);

        // Check for field capture
        if (hexDiv.firstElementChild) /* and is field */ {
            let field = hexDiv.firstElementChild as HTMLElement;
            // slide the captured field to the player board
            anims.push(() => this.animationManager.slideOutAndDestroy(field, this.playerPanelManager.handcountElement(this.bga.players.getCurrentPlayerId()), {}));
        }

        const pieceDiv = handDiv.firstElementChild as HTMLElement;
        anims.push(() =>
            // slide piece from hand to hex
            this.animationManager.slideAndAttach(pieceDiv, hexDiv)
                // FIXME: need to know this is happening? or just let it flip in the notif??
                // play into river, piece is hidden
                .then(() => {
                    if (this.hexForRc(hex)?.terrain == 'RIVER') {
                        Piece.set(pieceDiv, 'hidden', this.bga.players.getCurrentPlayer())
                    }
                })
        );

        this.unselectAllHandPieces();
        this.removeHandHandler();
        this.removeBoardHandler();

        await this.animationManager.playParallel(anims);
        this.bga.actions.performAction('actPlayPiece', { handpos: Html.indexInParent(handDiv), rc: hex })
    }

    private onHandClicked(ev: Event): boolean {
        ev.preventDefault();
        ev.stopPropagation();
        const pieceDiv = ev.target as HTMLElement;
        let p = Piece.get(pieceDiv)!;
        if (!Piece.isNonEmpty(p)) { return false; }

        let parentDiv = pieceDiv.parentElement!;
        let cl = parentDiv.classList;
        if (cl.contains(Css.UNPLAYABLE)) { return false; }

        if (this.allowedMovesFor(pieceDiv).length == 0) {
            return false;
        }
        if (!cl.contains(Css.SELECTED)) {
            this.unselectAllHandPieces();
            this.markHexesPlayableForPiece(pieceDiv);
            this.chooseDestination();
        } else {
            this.removeBoardHandler();
            this.unmarkHexesPlayableForPiece(pieceDiv);
            this.setStatusBarForPlayState();
        }
        cl.toggle(Css.SELECTED);
        return false;
    }

    private chooseDestination(): void {
        // this.removeHandHandler();
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
                this.attachHandHandler();
                this.setPlayablePieces();
            }
            this.bga.statusBar.addActionButton(
                _('End turn'),
                () => {
                    this.removeHandHandler();
                    this.unselectAllHandPieces();
                    this.bga.actions.performAction('actDonePlayPieces');
                }, {
                autoclick: mustEnd && this.autoConfirmEnabled(),
            });
        } else {
            this.bga.statusBar.setTitle(_('${you} must select a piece to play'));
            this.attachHandHandler();
            this.setPlayablePieces();
        }
        if (this.playStateArgs.canUndo) {
            this.bga.statusBar.addActionButton(
                _('Undo'),
                () => this.bga.actions.performAction('actUndoPlay'),
                { color: "alert" }
            );
        }
    }
}
