import { BblPlayer, BGamedatas, Hex, PieceType } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { Attrs, CSS, IDS, Piece, View } from "../view";
import { indexInParent } from "../html";
import { AnimationList } from "../more-animations";
import { BabyloniaState } from "./base";

interface PlayStateArgs {
  canEndTurn: boolean;
  allowedMoves: Record<string, number[]>;
  canUndo: boolean;
}

export class PlayPiecesState extends BabyloniaState {
  private playStateArgs: PlayStateArgs| null = null;
  private handHandler: (e: Event) => void;
  private boardHandler: (e: Event) => void;

  constructor(bga: Bga<BblPlayer, BGamedatas>, view: View, animationManager: AnimationManager) {
    super(bga, view, animationManager);
    this.handHandler = (e) => this.onHandClicked(e);
    this.boardHandler = (e) => this.onBoardClicked(e);
  }

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
      this.view.markAllHexesUnplayable();
      this.setStatusBarForPlayState();
  }

  override onEnteringState(args: { playState: PlayStateArgs }, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.doEnterState(args.playState);
    }
  }

  async notif_piecePlayed(
    args: {
      player_id: number;
      points: number;
      piece: PieceType;
      handpos?: number;
      rc: number;
      hand_size: number;
      captured_piece: string;
      field_points: number;
      ziggurat_points: number;
      touched_ziggurats: number[];
      playState: PlayStateArgs | undefined;
    }
  ) {
    let anims: AnimationList = [];
    const hexDiv =  this.view.hexDiv(args.rc);
    const handDiv = (args.handpos === undefined) ? undefined : this.view.handPosDiv(args.handpos);
    let pieceDiv = handDiv?.firstElementChild as HTMLElement;
    // Either not active player, or another window of the active player (so piece still in hand)
    if (args.handpos === undefined  || pieceDiv) {
      // Check for field capture
      if (args.captured_piece != Piece.EMPTY /* .startsWith('field') */) {
        let field = hexDiv.firstElementChild as HTMLElement;
        if (!field) { // or field is not F567X
          console.error("attempt to capture a field that is not there");
        }
        // slide the captured field to the player board
        anims.push(() => this.animationManager.slideOutAndDestroy(field, $(IDS.handcount(args.player_id)), {}))
      }
      anims.push(() => {
        if (!pieceDiv) {
          // slide piece from hand count to hex
          pieceDiv =  this.view.createPieceDiv(args.piece, args.player_id);
          $(IDS.handcount(args.player_id)).appendChild(pieceDiv);
        }
        return this.animationManager.slideAndAttach(pieceDiv, hexDiv, { fromPlaceholder: 'off' })
          .then(() => Attrs.setPiece(pieceDiv, args.piece, this.bga.players.getPlayerById(args.player_id)));
      });
    }

    // animate the ziggurat scoring, if any
    if (args.ziggurat_points > 0) {
      args.touched_ziggurats.forEach(z => this.view.markHexSelected(z));
      anims.push(... args.touched_ziggurats.map((rc: number) =>
        () => this.animationManager.displayScoring(
                this.view.hexDiv(rc),
                1,
                this.bga.gameui.gamedatas.players[args.player_id]!.color,
                { extraClass: 'bbl_city_scoring', duration: 700 })
                .then(() => args.touched_ziggurats.forEach(z => this.view.unmarkHexSelected(z)))
              )
      );
    }

    await this.animationManager.playParallel(anims)
        .then(() => this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points));

    this.view.updateHandCount(args);
    if (args.playState) {
      this.doEnterState(args.playState);
    }
  }

  async notif_undoMove(
    args: {
      points: number;
      player_id: number;
      rc: number;
      playState: PlayStateArgs | undefined;
      original_piece: PieceType | undefined;
      handpos: number | undefined;
      captured_piece: PieceType;
      hand_size: number;
    }
  ) {
    let anims: AnimationList = [];
    let hexDiv = $(IDS.hexDiv(args.rc));

    if (args.captured_piece != Piece.EMPTY) {
      // slide the previously captured field back
      let field = this.view.createPieceDiv(args.captured_piece, 0);
      anims.push(() => {
        $(IDS.handcount(args.player_id)).appendChild(field);
        return this.animationManager.slideAndAttach(field, hexDiv, { fromPlaceholder: 'off' });
      })
    }

    let pieceDiv = hexDiv.firstElementChild as HTMLElement;
    let destDiv = args.handpos !== undefined ? this.view.handPosDiv(args.handpos) : $(IDS.handcount(args.player_id));

    if (args.original_piece) {
        // restore piece value, e.g. if it was originally hidden
        Attrs.setPiece(pieceDiv, args.original_piece, this.bga.players.getPlayerById(args.player_id));
    }
    // slide the played piece back to the hand
    anims.push(() => this.animationManager.slideAndAttach(pieceDiv, destDiv));

    await this.animationManager.playParallel(anims).then(() => {
      if (args.handpos) {
         destDiv.classList.add(CSS.PLAYABLE);
      }
      this.view.updateHandCount(args);
      this.bga.playerPanels.getScoreCounter(args.player_id).incValue(-args.points);
    });

    if (args.playState) {
      this.doEnterState(args.playState);
    };
  }

  override onLeavingState(args: any, isCurrentPlayerActive: boolean): void {
    if (isCurrentPlayerActive) {
      this.removeBoardHandler();
      this.removeHandHandler();
    }
  }

  private attachHandHandler() {
    $(IDS.HAND).addEventListener('click', this.handHandler);
  }

  private removeHandHandler() {
    $(IDS.HAND).removeEventListener('click', this.handHandler);
  }

  private attachBoardHandler() {
    $(IDS.BOARD).addEventListener('click', this.boardHandler);
  }
  private removeBoardHandler() {
    $(IDS.BOARD).removeEventListener('click', this.boardHandler);
  }

  private allowedMovesFor(div: Element | null): number[] {
    if (!div) { return []; }
    const piece = div.getAttribute(Attrs.PIECE)!.split('_')[0]!;
    return (this.playStateArgs!.allowedMoves[""] ?? [])
      .concat(this.playStateArgs!.allowedMoves[piece] ?? []);
    ;
  }

  private unmarkHexesPlayable(hexes: number[]): void {
    hexes.forEach( hex => this.view.unmarkHexPlayable(hex));
  }

  private markHexesPlayableForPiece(div: Element): void {
    this.view.markHexesPlayable(this.allowedMovesFor(div));
  }

  private unmarkHexesPlayableForPiece(div: Element): void {
    this.unmarkHexesPlayable(this.allowedMovesFor(div));
  }

  private unselectAllHandPieces(): void {
    const hand = $(IDS.HAND);
    hand.childNodes.forEach(node => {
      const posDiv = node as HTMLElement;
      const cl = posDiv.classList;
      if (cl.contains(CSS.SELECTED)) {
        this.unmarkHexesPlayableForPiece(posDiv.firstElementChild!);
      }
      cl.remove(CSS.SELECTED);
      cl.remove(CSS.PLAYABLE);
      cl.remove(CSS.UNPLAYABLE);
    });
  }

  private setPlayablePieces(): void {
    const hand = $(IDS.HAND);

    hand.childNodes.forEach((node) => {
      const child = node as HTMLElement;
      const cl = child.classList;
      if (this.allowedMovesFor(child.firstElementChild).length > 0) {
        cl.add(CSS.PLAYABLE);
        cl.remove(CSS.UNPLAYABLE);
      } else {
        cl.remove(CSS.PLAYABLE);
        cl.add(CSS.UNPLAYABLE);
      }
    });
  }

  private selectedHandDiv(): Element | null {
    return document.querySelector(`#${IDS.HAND} > .${CSS.SELECTED}`);
  }

  private async onBoardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const handDiv = this.selectedHandDiv();
    if (!handDiv) {
      console.error('no piece selected!');
      return;
    }

    const hex = this.selectedHex(event.target!);
    if (hex == null) {
      return;
    }


    let anims: AnimationList = [];

    const hexDiv =  this.view.hexDiv(hex);

    // Check for field capture
    if (hexDiv.firstElementChild) /* and is field */ {
      let field = hexDiv.firstElementChild as HTMLElement;
      // slide the captured field to the player board
      anims.push(() => this.animationManager.slideOutAndDestroy(field, $(IDS.handcount(this.bga.players.getCurrentPlayerId())), {}));
    }

    const pieceDiv = handDiv.firstElementChild as HTMLElement;
    anims.push(() =>
      // slide piece from hand to hex
      this.animationManager.slideAndAttach(pieceDiv, hexDiv)
        // FIXME: need to know this is happening? or just let it flip in the notif??
        // play into river, piece is hidden
        .then(() => {
          if (this.hexForRc(hex)?.terrain == 'RIVER') {
            Attrs.setPiece(pieceDiv, 'hidden', this.bga.players.getCurrentPlayer())
          }
        })
    );

    this.unselectAllHandPieces();
    this.removeHandHandler();
    this.removeBoardHandler();
    // FIXME: is it fragile here to do the anim and action in parallel?
    // FIXME: do we need to await?
    await Promise.all([
      this.animationManager.playParallel(anims),
      this.bga.actions.performAction('actPlayPiece', { handpos: indexInParent(handDiv), rc: hex })
    ]);
  }

  private onHandClicked(ev: Event): boolean {
    ev.preventDefault();
    ev.stopPropagation();
    const pieceDiv = ev.target as HTMLElement;
    let p = pieceDiv.getAttribute(Attrs.PIECE);
    if (!p || p == Piece.EMPTY) { return false; }

    let parentDiv = pieceDiv.parentElement!;
    let cl = parentDiv.classList;
    if (cl.contains(CSS.UNPLAYABLE)) { return false; }

    if (this.allowedMovesFor(pieceDiv).length == 0) {
      return false;
    }
    if (!cl.contains(CSS.SELECTED)) {
      this.unselectAllHandPieces();
      this.markHexesPlayableForPiece(pieceDiv);
      this.chooseDestination();
    } else {
      this.unmarkHexesPlayableForPiece(pieceDiv);
      this.setStatusBarForPlayState();
    }
    cl.toggle(CSS.SELECTED);
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
        { color: "secondary"});
  }

  private setStatusBarForPlayState(): void {
    this.bga.statusBar.removeActionButtons();
    if (this.playStateArgs!.canEndTurn) {
      let mustEnd = false;
      if (Object.keys(this.playStateArgs!.allowedMoves).length == 0) {
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
          autoclick: mustEnd,
        });
    } else {
      this.bga.statusBar.setTitle(_('${you} must select a piece to play'));
      this.attachHandHandler();
      this.setPlayablePieces();
    }
    if (this.playStateArgs?.canUndo) {
      this.bga.statusBar.addActionButton(
        _('Undo'),
        () => this.bga.actions.performAction('actUndoPlay'),
        { color: "alert" }
      );
    }
  }
}
