import { BGamedatas, PlayState } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { Attrs, CSS, IDS, Piece, View } from "../view";
import { indexInParent } from "../html";
import { AnimationList } from "../more-animations";
import { BabyloniaState } from "./base";

export class PlayPiecesState extends BabyloniaState {
  private playStateArgs: PlayState| null = null;
  private handHandler: (e: Event) => void;
  private boardHandler: (e: Event) => void;

  constructor(bga: Bga<Player, BGamedatas>, view: View, animationManager: AnimationManager) {
    super(bga, view, animationManager);
    this.handHandler = (e) => this.onHandClicked(e);
    this.boardHandler = (e) => this.onBoardClicked(e);
  }

  private doEnterState(playState: PlayState) {
      this.playStateArgs = playState;
      this.view.markAllHexesUnplayable();
      this.setStatusBarForPlayState();
  }

  override onEnteringState(args: { _private: { playState: PlayState } }, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.doEnterState(args._private.playState);
    }
  }

  async notif_piecePlayed(
    args: {
      player_id: number;
      // points: number;
      piece: string;
      handpos: number;
      rc: number;
      hand_size: number;
      captured_piece: string;
      // field_points: number;
      ziggurat_points: number;
      touched_ziggurats: number[];
      _private: { playState: PlayState } | undefined;
    }
  ) {
    let anims: AnimationList = [];

    const hexDiv =  this.view.hexDiv(args.rc);

    // Check for field capture
    if (args.captured_piece != Piece.EMPTY /* .startsWith('field') */) {
      let field = hexDiv.firstElementChild as HTMLElement;
      if (!field) { // or field is not F567X
        console.error("attempt to capture a field that is not there");
      }
      // slide the captured field to the player board
      anims.push(() => this.animationManager.slideOutAndDestroy(field, $(IDS.handcount(args.player_id)), {}));
    }

    if (this.bga.players.isCurrentPlayerActive()) {
      const handPosDiv =  this.view.handPosDiv(args.handpos);
      const pieceDiv = handPosDiv.firstElementChild as HTMLElement;
      anims.push(() =>
        // slide piece from hand to hex
        this.animationManager.slideAndAttach(pieceDiv, hexDiv)
          // play into river, piece is hidden, so use the value from the args not the hand
          .then(() => Attrs.setPiece(pieceDiv, args.piece, this.bga.players.getPlayerById(args.player_id)))
      );
    } else {
      anims.push(() => {
        // slide piece from hand count to hex
        let div =  this.view.createPieceDiv(args.piece, args.player_id);
        $(IDS.handcount(args.player_id)).appendChild(div);
        return this.animationManager.slideAndAttach(div, hexDiv, { fromPlaceholder: 'off' });
      });
    }
    // animate the ziggurat scoring, if any
    if (args.ziggurat_points > 0) {
      args.touched_ziggurats.forEach(z => this.view.markHexSelected(z));
      // TODO: since it's parallel, just flatten into the anims list?
      anims.push(() => this.animationManager.playParallel(
        args.touched_ziggurats.map((rc: number) =>
          () => this.animationManager.displayScoring(
               this.view.hexDiv(rc),
              1,
              this.bga.gameui.gamedatas.players[args.player_id]!.color,
              { extraClass: 'bbl_city_scoring', duration: 700 })
            .then(() => args.touched_ziggurats.forEach(z => this.view.unmarkHexSelected(z))))
      ));
    }

    await this.animationManager.playParallel(anims);

     this.view.updateHandCount(args);
    // this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
    if (args._private) {
      this.doEnterState(args._private.playState);
    }
  }

  private async notif_undoMove(
    args: {
      player_id: number;
      // points: number;
      rc: number;
      _private: {
        playState: PlayState;
        original_piece: string;
        handpos: number;
      } | undefined;
      captured_piece: string;
      hand_size: number;
      piece: string;
    }
  ) {
    let anims: AnimationList = [];
    let hexDiv = $(IDS.hexDiv(args.rc));
    let isActivePlayer = this.bga.gameui.player_id == args.player_id;

    if (args.captured_piece != Piece.EMPTY) {
      // slide the previously captured field back
      let field = this.view.createPieceDiv(args.captured_piece, 0);
      anims.push(() => {
        $(IDS.handcount(args.player_id)).appendChild(field);
        return this.animationManager.slideAndAttach(field, hexDiv, { fromPlaceholder: 'off' });
      })
    }

    let pieceDiv = hexDiv.firstElementChild as HTMLElement;
    let destDiv = isActivePlayer ? this.view.handPosDiv(args._private!.handpos) : $(IDS.handcount(args.player_id));

    if (args._private?.original_piece) {
        // restore piece value, e.g. if it was originally hidden
        Attrs.setPiece(pieceDiv, args._private.original_piece, this.bga.players.getPlayerById(args.player_id));
    }
    // slide the played piece back to the hand
    anims.push(() => this.animationManager.slideAndAttach(pieceDiv, destDiv));

    await this.animationManager.playParallel(anims).then(() => {
      if (isActivePlayer) {
         destDiv.classList.add(CSS.PLAYABLE);
      }
      this.view.updateHandCount(args);
      // this.bga.playerPanels.getScoreCounter(args.player_id).incValue(-args.points);
    });

    if (args._private) {
      this.doEnterState(args._private.playState);
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

  protected allowedMovesFor(div: Element | null): number[] {
    if (!div) { return []; }
    const piece = div.getAttribute(Attrs.PIECE)!.split('_')[0]!;
    return (this.playStateArgs!.allowedMoves as any)[piece] || [];
  }

  protected unmarkHexesPlayable(hexes: number[]): void {
    hexes.forEach( hex => this.view.unmarkHexPlayable(hex));
  }

  protected markHexesPlayableForPiece(div: Element): void {
     this.view.markHexesPlayable(this.allowedMovesFor(div));
  }

  protected unmarkHexesPlayableForPiece(div: Element): void {
    this.unmarkHexesPlayable(this.allowedMovesFor(div));
  }

  public unselectAllHandPieces(): void {
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

  public setPlayablePieces(): void {
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

  async onBoardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const handDiv = this.selectedHandDiv();
    if (!handDiv) {
      console.error('no piece selected!');
      return;
    }

    const hex = this.selectedHex(event.target!);
    if (hex == null) {
      console.error('no hex selected!');
      return;
    }
    // FIXME: this is fragile; if we await, or put the unselctAllHandPieces in the then, we
    //  end up with the animated moving piece not the eventual piece, and get a JS error
    //  leaving the hand piece selected.
    this.bga.actions.performAction('actPlayPiece', {
      handpos: indexInParent(handDiv),
      rc: hex
    }).then(() => {
         this.view.unmarkHexPlayable(hex);
    })
    this.unselectAllHandPieces();
  }

  onHandClicked(ev: Event): boolean {
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
      if (Object.keys(this.playStateArgs!.allowedMoves).length == 0) {
        this.bga.statusBar.setTitle(_('${you} must end your turn'));
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
        });
    } else {
      this.bga.statusBar.setTitle(_('${you} must select a piece to play'));
      this.attachHandHandler();
      this.setPlayablePieces();
    }
    if (this.playStateArgs!.canUndo) {
      this.bga.statusBar.addActionButton(
        _('Undo'),
        () => this.bga.actions.performAction('actUndoPlay'),
        { color: "alert" }
      );
    }
  }
}
