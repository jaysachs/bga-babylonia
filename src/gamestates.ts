import { Game } from "./babylonia";
import { PlayState, RowCol } from "./bdata";
import { Attrs, CSS, IDS, Piece } from "./bhtml";
import { indexInParent } from "./html";



export abstract class BabyloniaState {
  // Returns the hex (row,col) clicked on, or null if not a playable hex
  protected selectedHex(target: EventTarget): RowCol | null {
    let hexDiv = target as Element;
    while (hexDiv.parentElement != null && hexDiv.parentElement.id != IDS.BOARD) {
      hexDiv = hexDiv.parentElement;
    }
    if (hexDiv.parentElement == null) {
      console.warn('no hex');
      return null;
    }
    // now check if it's allowed
    if (!hexDiv.classList.contains(CSS.PLAYABLE)) {
      return null;
    }
    const id = hexDiv.id.split('_');
    return {
      row: Number(id[2]),
      col: Number(id[3]),
    };
  }

  private markHexPlayable(rc: RowCol): void {
    this.game.hexDiv(rc).classList.add(CSS.PLAYABLE);
  }

  protected unmarkHexPlayable(rc: RowCol): void {
    this.game.hexDiv(rc).classList.remove(CSS.PLAYABLE);
  }

  protected markAllHexesUnplayable(): void {
    $(IDS.BOARD).querySelectorAll('.' + CSS.PLAYABLE)
      .forEach(div => div.classList.remove(CSS.PLAYABLE));
  }

  protected markHexesPlayable(hexes: RowCol[]): void {
    hexes.forEach((hex) => this.markHexPlayable(hex));
  }

  protected bga: Bga;
  constructor(protected game: Game) { this.bga = game.bga; }

  public onEnteringState(args: any, isCurrentPlayerActive: boolean) {}

  public onLeavingState(args: any, isCurrentPlayerActive: boolean) {}
}

export class SelectExtraTurnState extends BabyloniaState {
  override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.bga.statusBar.addActionButton(
        _('Take your one-time extra turn'),
        () => this.bga.actions.performAction('actChooseExtraTurn', { take_extra_turn: true })
      );
      this.bga.statusBar.addActionButton(
        _('Just finish your turn'),
        () => this.bga.actions.performAction('actChooseExtraTurn', { take_extra_turn: false })
      );
    }
  }
}

export class EndOfTurnScoringState extends BabyloniaState {
  override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.markAllHexesUnplayable();
    }
  }
}

export class SelectZigguratCardState extends BabyloniaState {
  private handler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.handler = (e) => this.onZcardClicked(e);
  }

  override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      const div = $(IDS.AVAILABLE_ZCARDS) as HTMLElement;
      div.scrollIntoView(false);
      $(IDS.AVAILABLE_ZCARDS).addEventListener('click', this.handler);
    }
  }

  override onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.AVAILABLE_ZCARDS).removeEventListener('click', this.handler);
    }
  }

  private toggleZcardSelected(e: Element) {
    const zt = e.getAttribute(Attrs.ZTYPE)!;
    let promptForConfirmation = () => {
      this.bga.statusBar.setTitle(_('Select ziggurat card ${zcard}?'), { zcard: zt });
      this.game.addTooltipsToLog();

      this.bga.statusBar.addActionButton(_('Confirm'),
        () => this.bga.actions.performAction('actSelectZigguratCard', { zctype: zt }),
        { autoclick: true }
      );

      this.bga.statusBar.addActionButton(
        _('Cancel'),
        () => this.toggleZcardSelected(e),
        { color: "secondary"});
    };
    let cancel = () => this.bga.states.restoreServerGameState();

    let alreadySelected = document.querySelector(`#${IDS.AVAILABLE_ZCARDS} > .${CSS.SELECTED}`);
    e.classList.toggle(CSS.SELECTED);
    if (alreadySelected == null) {
      promptForConfirmation();
    } else if (alreadySelected == e) {
      cancel();
    } else {
      alreadySelected.classList.toggle(CSS.SELECTED);
      cancel();
      promptForConfirmation();
    }
  }

  onZcardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    let e = event.target as HTMLElement;
    let z = e.getAttribute(Attrs.ZTYPE);
    if (!z) { return false; }
    if (e.getAttribute(Attrs.ZTYPE)) {
      this.toggleZcardSelected(e);
    }
    return false;
  }
}

export class SelectScoringHexState extends BabyloniaState {
  private handler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.handler = (e) => this.onBoardClicked(e);
  }
  override onEnteringState(args: { hexes: RowCol[] }, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.markHexesPlayable(args.hexes);
      $(IDS.BOARD).addEventListener('click', this.handler);
    }
  }
  override onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.BOARD).removeEventListener('click', this.handler);
    }
  }

  onBoardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const hex = this.selectedHex(event.target!);
    if (hex == null) {
      return;
    }
    let div = this.game.hexDiv(hex);
    let piece = div.firstElementChild!.getAttribute(Attrs.PIECE);
    div.classList.add(CSS.SELECTED);
    this.bga.statusBar.setTitle(_('Score ${city} at (${row},${col})?'), {
      row: hex.row, col: hex.col, city: piece,
    });
    this.bga.statusBar.addActionButton(_('Confirm'),
      () => this.bga.actions.performAction('actSelectHexToScore', hex).then(() => this.unmarkHexPlayable(hex)),
      { autoclick: true });
    this.bga.statusBar.addActionButton(_('Cancel'),
      () => {
        div.classList.remove(CSS.SELECTED);
        this.bga.states.restoreServerGameState();
      },
      { color: "secondary" });
  }
}

export class PlayPiecesState extends BabyloniaState {
  private playStateArgs: PlayState| null = null;
  private handHandler: (e: Event) => void;
  private boardHandler: (e: Event) => void;

  constructor(game: Game) {
    super(game);
    this.handHandler = (e) => this.onHandClicked(e);
    this.boardHandler = (e) => this.onBoardClicked(e);
  }

  override onEnteringState(args: PlayState, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.playStateArgs = args;
      this.markAllHexesUnplayable();
      this.setStatusBarForPlayState();
    }
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

  protected allowedMovesFor(div: Element | null): RowCol[] {
    if (!div) { return []; }
    const piece = div.getAttribute(Attrs.PIECE)!.split('_')[0]!;
    return (this.playStateArgs.allowedMoves as any)[piece] || [];
  }

  protected unmarkHexesPlayable(hexes: RowCol[]): void {
    hexes.forEach(this.unmarkHexPlayable.bind(this));
  }

  protected markHexesPlayableForPiece(div: Element): void {
    this.markHexesPlayable(this.allowedMovesFor(div));
  }

  protected unmarkHexesPlayableForPiece(div: Element): void {
    this.unmarkHexesPlayable(this.allowedMovesFor(div));
  }

  public unselectAllHandPieces(): void {
    const hand = $(IDS.HAND);
    hand.childNodes.forEach((posDiv : HTMLElement) => {
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
    hand.childNodes.forEach((child : HTMLElement) => {
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
    await this.bga.actions.performAction('actPlayPiece', {
      handpos: indexInParent(handDiv),
      row: hex.row,
      col: hex.col
    });
    this.unmarkHexPlayable(hex);
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
    if (this.playStateArgs.canEndTurn) {
      if (this.playStateArgs.allowedMoves.length == 0) {
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
    if (this.playStateArgs.canUndo) {
      this.bga.statusBar.addActionButton(
        _('Undo'),
        () => this.bga.actions.performAction('actUndoPlay'),
        { color: "alert" }
      );
    }
  }
}
