import { Game } from "./babylonia";
import { PlayState, RowCol } from "./bdata";
import { Attrs, CSS, IDS, Piece } from "./bhtml";
import { indexInParent } from "./html";



export abstract class BabyloniaState {
  public playStateArgs: PlayState| null = null;

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

  protected markHexPlayable(rc: RowCol): void {
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
    hexes.forEach(this.markHexPlayable.bind(this));
  }

  constructor(protected game: Game) {}

  public onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (args && args.playStateArgs) {
      this.playStateArgs = args.playStateArgs;
    } else if (args && args.allowedMoves) {
      this.playStateArgs = args as PlayState;
    }
    this.doEnterState(args, isCurrentPlayerActive);
  }

  protected doEnterState(args: any, isCurrentPlayerActive: boolean) {}

  protected allowedMovesFor(div: Element | null): RowCol[] {
    if (!div) { return []; }
    const piece = div.getAttribute(Attrs.PIECE)!.split('_')[0]!;
    return (this.playStateArgs!.allowedMoves as any)[piece] || [];
  }

  protected markHexesPlayableForPiece(div: Element): void {
    this.markHexesPlayable(this.allowedMovesFor(div));
  }

  protected unmarkHexesPlayable(hexes: RowCol[]): void {
    hexes.forEach(this.unmarkHexPlayable.bind(this));
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

  public setStatusBarForPlayState(): void {
    const bga = this.game.bga;
    if (!bga.players.isCurrentPlayerActive()) {
      return;
    }
    if (this.playStateArgs == null) {
      console.error('playStateArgs unexpectedly null');
      return;
    }
    if (this.playStateArgs.canEndTurn) {
      if (this.playStateArgs.allowedMoves.length == 0) {
        bga.states.setClientState('client_noPlaysLeft', {
          descriptionmyturn: _('${you} must end your turn'),
          playStateArgs: this.playStateArgs
        });
        this.setPlayablePieces();
      } else {
        bga.states.setClientState('client_selectPieceOrEndTurn', {
          descriptionmyturn: _('${you} may select a piece to play or end your turn'),
          playStateArgs: this.playStateArgs
        });
        this.setPlayablePieces();
      }
      bga.statusBar.addActionButton(
        _('End turn'),
        () => {
          this.unselectAllHandPieces();
          this.game.bgaPerformAction('actDonePlayPieces');
        });
    } else {
      bga.states.setClientState('client_mustSelectPiece', {
        descriptionmyturn: _('${you} must select a piece to play'),
        playStateArgs: this.playStateArgs
      });
      this.setPlayablePieces();
    }
    if (this.playStateArgs.canUndo) {
      bga.statusBar.addActionButton(
        _('Undo'),
        () => { bga.states.setClientState('client_undo', { playStateArgs: this.playStateArgs }); this.game.bgaPerformAction('actUndoPlay'); },
        { color: "alert" }
      );
    }
  }
}

export class SelectExtraTurnState extends BabyloniaState {
  override doEnterState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.game.bga.statusBar.addActionButton(
        _('Take your one-time extra turn'),
        () => this.game.bgaPerformAction('actChooseExtraTurn', { take_extra_turn: true })
      );
      this.game.bga.statusBar.addActionButton(
        _('Just finish your turn'),
        () => this.game.bgaPerformAction('actChooseExtraTurn', { take_extra_turn: false })
      );
    }
  }
}

export class EndOfTurnScoringState extends BabyloniaState {
  override doEnterState(args: any, isCurrentPlayerActive: boolean) {
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
  override doEnterState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      const div = $(IDS.AVAILABLE_ZCARDS) as HTMLElement;
      div.scrollIntoView(false);
      $(IDS.AVAILABLE_ZCARDS).addEventListener('click', this.handler);
    }
  }
  protected onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.AVAILABLE_ZCARDS).removeEventListener('click', this.handler);
    }
  }
  public toggleZcardSelected(e: Element) {
    const zt = e.getAttribute(Attrs.ZTYPE)!;
    let promptForConfirmation = () => {
      this.game.bga.statusBar.setTitle(_('Select ziggurat card ${zcard}?'), { zcard: zt });
      this.game.addTooltipsToLog();

      this.game.bga.statusBar.addActionButton(_('Confirm'),
        () => this.game.bgaPerformAction('actSelectZigguratCard', { zctype: zt }),
        { autoclick: true }
      );

      this.game.bga.statusBar.addActionButton(
        _('Cancel'),
        () => this.toggleZcardSelected(e),
        { color: "secondary"});
    };
    let cancel = () => this.game.bga.states.restoreServerGameState();

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

export class PlayPiecesState extends BabyloniaState {
  override doEnterState(args: PlayState, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.playStateArgs = args;
      this.setStatusBarForPlayState();
      this.markAllHexesUnplayable();
    }
  }
}

export class SelectScoringHexState extends BabyloniaState {
  private handler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.handler = (e) => this.onBoardClicked(e);
  }
  override doEnterState(args: { hexes: RowCol[] }, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.markHexesPlayable(args.hexes);
      $(IDS.BOARD).addEventListener('click', this.handler);
    }
  }
  protected onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.BOARD).removeEventListener('click', this.handler);
    }
  }
  public selectHexToScore(event: Event) {
    const hex = this.selectedHex(event.target!);
    if (hex == null) {
      return;
    }
    let div = this.game.hexDiv(hex);
    let piece = div.firstElementChild!.getAttribute(Attrs.PIECE);
    div.classList.add(CSS.SELECTED);
    this.game.bga.states.setClientState('client_hexpicked', {});
    this.game.bga.statusBar.setTitle(_('Score ${city} at (${row},${col})?'), {
      row: hex.row, col: hex.col, city: piece,
    });
    this.game.bga.statusBar.addActionButton(_('Confirm'),
      () => this.game.bgaPerformAction('actSelectHexToScore', hex).then(() => this.unmarkHexPlayable(hex)),
      { autoclick: true });
    this.game.bga.statusBar.addActionButton(_('Cancel'),
      () => {
        div.classList.remove(CSS.SELECTED);
        this.game.bga.states.restoreServerGameState();
      },
      { color: "secondary" });
  }
  onBoardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.selectHexToScore(event);
  }
}

abstract class HandClickableState extends BabyloniaState {
  protected handler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.handler = (e) => this.onHandClicked(e);
  }
  override doEnterState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.HAND).addEventListener('click', this.handler);
    }
  }
  protected onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.HAND).removeEventListener('click', this.handler);
    }
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
      this.handleHandPieceClicked();
    } else {
      this.unmarkHexesPlayableForPiece(pieceDiv);
      this.setStatusBarForPlayState();
    }
    cl.toggle(CSS.SELECTED);
    return false;
  }

  protected handleHandPieceClicked(): void {
    this.game.bga.states.setClientState('client_pickHexToPlay', {
        descriptionmyturn: _('${you} must select a hex to play to'),
        playStateArgs: this.playStateArgs,
    });
    this.game.bga.statusBar.addActionButton(
        _('Cancel'),
        () => {
            this.unselectAllHandPieces();
            this.setStatusBarForPlayState();
        },
        { color: "secondary"});
    }
}

export class ClientPickHexToPlayState extends HandClickableState {
  private boardHandler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.boardHandler = (e) => this.onBoardClicked(e);
  }

  override handleHandPieceClicked(): void {}

  override doEnterState(args: any, isCurrentPlayerActive: boolean) {
    super.doEnterState(args, isCurrentPlayerActive);
    if (isCurrentPlayerActive) {
      $(IDS.BOARD).addEventListener('click', this.boardHandler);
    }
  }
  protected onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    super.onLeavingState(args, isCurrentPlayerActive);
    if (isCurrentPlayerActive) {
      $(IDS.BOARD).removeEventListener('click', this.boardHandler);
    }
  }

  private selectedHandDiv(): Element | null {
    return document.querySelector(`#${IDS.HAND} > .${CSS.SELECTED}`);
  }


  onBoardClicked(event: Event) {
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
    this.game.bga.states.setClientState('client_hexpicked', {});
    this.game.bgaPerformAction('actPlayPiece', {
      handpos: indexInParent(handDiv),
      row: hex.row,
      col: hex.col
    }).then(() => {
      this.unmarkHexPlayable(hex);
    });
    this.unselectAllHandPieces();
  }}

export class ClientSelectPieceOrEndTurnState extends HandClickableState {}
export class ClientMustSelectPieceState extends HandClickableState {}

export class ClientNoPlaysLeftState extends BabyloniaState {}
export class ClientUndoState extends BabyloniaState {}
export class ClientHexPickedState extends BabyloniaState {}
