import { BblPlayer, BGamedatas, HandPiece, PieceType } from "./bdata";
import { AnimationManager } from "./bga-animations";
import { Css } from "./css";
import { Html } from "./html";
import { AnimationList } from "./more-animations";
import { Piece } from "./piece";
import { PlayerPanelManager } from "./player_panel";

export type PieceInfo = {
    pieceType: PieceType;
    logicalPos: number;
    pieceDiv: HTMLElement;
}

export type SelectionHandler = (p : PieceInfo, selected: boolean) => void;

export class HandManager {
    private readonly collator = new Intl.Collator("en");
    private selectionHandlers: SelectionHandler[] = [];
    private player: BblPlayer | undefined;
    private mainDiv: HTMLElement;
    public constructor(private bga: Bga<BblPlayer, BGamedatas>, private animationManager: AnimationManager, private playerPanelManger: PlayerPanelManager) {
        this.mainDiv = Html.div({});
    }

    public setup(): HTMLElement {
        const hand = this.bga.gameui.gamedatas.hand;
        if (!hand) { return this.mainDiv; }

        this.mainDiv = Html.div({id: 'bbl_hand'});

        this.player = this.bga.players.getPlayerById(gameui.player_id);
        
        if (true) {
            let hand = this.sortedHandsEnabled() 
                ? this.orderedHand(this.bga.gameui.gamedatas.hand!)
                : this.bga.gameui.gamedatas.hand!;
            hand.forEach((hp, i) => {
                const hpd = this.spaceForPhysicalPos(i);
                this.setLogicalPos(hpd, hp.position);
                if (!hp.played && Piece.isNonEmpty(hp.piece_type)) {
                    hpd.appendChild(Piece.createDiv(hp.piece_type, this.player));
                }
            });
        } else {
            // FIXME: this fails because it has async animations that
            // don't finish by the time play_pieces state starts.
            // if (hand) {
            //     this.refill(hand!);
            // }
        }
        return this.mainDiv;
    }

    static readonly LOGICAL_POS_ATTR = 'bbl_logicalpos';

    public addSelectionHandler(handler: SelectionHandler): void {
        if (this.selectionHandlers.indexOf(handler) < 0) {
            this.selectionHandlers.push(handler);
        }
    }

    public removeSelectionHandler(handler: SelectionHandler): void {
        const i = this.selectionHandlers.indexOf(handler);
        if (i >= 0) {
            this.selectionHandlers.splice(i, 1);
        }
    }

    private orderedHand(hand: HandPiece[]): HandPiece[] {
        let result = hand.concat([]);
        result.sort((p1, p2) => {
            if (p1.piece_type == 'empty') {
                return p2.piece_type == 'empty' ? 0 : 1;
            } 
            else if (p2.piece_type == 'empty') {
                return -1;
            }
            let i = this.collator.compare(p1.piece_type, p2.piece_type);
            return i == 0 ? p1.position - p2.position : i;
        });
        return result;
    }

   private setLogicalPos(div: Element, lpos: number): void {
        div.setAttribute(HandManager.LOGICAL_POS_ATTR, String(lpos));
        // for debugging
        // div.setAttribute('title', String(lpos));
    }

    public getLogicalPos(div: Element): number {
        let p = div.getAttribute(HandManager.LOGICAL_POS_ATTR);
        return p ? Number(p) : -1;
    }

    public spaceForLogicalPos(li: number): HTMLElement {
        let hpd = this.mainDiv.firstElementChild;
        while (hpd && this.getLogicalPos(hpd) != li) {
            hpd = hpd.nextElementSibling;
        }
        return hpd as HTMLElement;
    }

    private spaceForPhysicalPos(i: number): HTMLElement {
        while (i >= this.mainDiv.childElementCount) {
            this.mainDiv.appendChild(Html.div({ attrs: { bbl_logicalpos: String(i) }}))
                .addEventListener('click', this.onHandClicked.bind(this));
        }
        return this.mainDiv.children.item(i)! as HTMLElement;
    }

    private sortedHandsEnabled(): boolean {
        return this.bga.userPreferences.get(130) > 0;
    }

    public refill(hand: HandPiece[]): Promise<any> {
        if (!this.player) {
            console.error("Spectator should not refill hand");
            return Promise.resolve();
        }
        if (this.sortedHandsEnabled()) {
            return this.refillSorted(hand);
        } else {
            return this.refillStandard(hand);
        }
    }

    private refillSorted(hand: HandPiece[]): Promise<any> {
        const anims: AnimationList = [];
        console.debug("Refilling hand", hand);
        console.debug("Current state: ", Array.from($('bbl_hand').children).map(d => "" + this.getLogicalPos(d) + " " + d.firstElementChild?.getAttribute('bbl_piece')));
        this.bga.gameui.gamedatas.hand = hand;
        hand = this.orderedHand(hand);
        console.debug("Sorted hand", hand);
        // first add spaces for expanded hand
        const handSpaceDivs = hand.map((hp, i) => this.spaceForPhysicalPos(i));

        // hand has the desired ordering.
        // 
        // Iterate through the hand spaces in the DOM representation.
        // If the corresponding piece in hand doesn't belong in that space, 
        //   move it there from the right place (other hand space or the pool).
        handSpaceDivs.forEach((hsd, i) => {
            let lp = this.getLogicalPos(hsd);
            if (hand[i]!.piece_type != 'empty') {
                console.debug("physical pos", i, "logical pos", lp, "hand position", hand[i]?.position);
                const newPos = hand[i]!.position;
                // either wrong logical pos, or no piece there.
                if (lp != newPos || !hsd.firstElementChild) {
                    // Ok we need to move this one from somewhere.
                    let srcSpace = this.spaceForLogicalPos(newPos);
                    if (srcSpace.firstElementChild) {
                        console.debug("will move from ", i, srcSpace)
                        anims.push(() => {
                            this.setLogicalPos(hsd, newPos);
                            return this.animationManager.slideAndAttach(
                                srcSpace.firstElementChild as HTMLElement, 
                                hsd, 
                                { fromPlaceholder: 'off', toPlaceholder: 'off' })
                        });
                    } else {
                        console.debug("will move new from pool", i, hand[i])
                        anims.push(() => {
                            const pieceDiv = Piece.createDiv(hand[i]!.piece_type, this.player);
                            this.playerPanelManger.poolcountElement(this.bga.players.getCurrentPlayerId()).appendChild(pieceDiv);
                            this.setLogicalPos(hsd, newPos)
                            return this.animationManager.slideAndAttach(
                                pieceDiv, 
                                hsd, 
                                { fromPlaceholder: 'off', toPlaceholder: 'off' })
                        });
                    }
                }
                else {
                    console.debug("already there")
                }
            }
        });
        return this.animationManager.playParallel(anims).then(() => { 
            console.debug("Final state: ", 
                Array.from($('bbl_hand').children).map(d => "" + this.getLogicalPos(d) + " " + d.firstElementChild?.getAttribute('bbl_piece')));
             return Promise.resolve(); } );
    }

    private refillStandard(hand: HandPiece[]): Promise<any> {
        const anims: AnimationList = [];
        hand.forEach((hp, i) => {
            const handSpaceDiv = this.spaceForPhysicalPos(i);
            let pieceDiv = handSpaceDiv.firstElementChild as HTMLElement;
            if (!pieceDiv) {
                if (!hp.played && Piece.isNonEmpty(hp.piece_type)) {
                    anims.push(() => {
                        pieceDiv = Piece.createDiv(hp.piece_type, this.player);
                        this.playerPanelManger.poolcountElement(this.bga.players.getCurrentPlayerId()).appendChild(pieceDiv);
                        return this.animationManager.slideAndAttach(pieceDiv, handSpaceDiv, { fromPlaceholder: 'off', toPlaceholder: 'off' })
                    });
                }
            } else {
                let pt = Piece.get(pieceDiv);
                if (!pt) {
                    console.error("hand had piece div but no attribute");
                } else if (pt != Piece.pieceVal(hp.piece_type!, this.player)) {
                    console.error("piece from args", hp.piece_type, "not matches hand", pieceDiv);
                }
            }
        })
        return this.animationManager.playParallel(anims);
    }

    public setPlayablePieces(isPlayable: (h: PieceType | null) => boolean): void {
        Array.from(this.mainDiv.children).forEach((spaceDiv) => {
            const cl = spaceDiv.classList;
            if (isPlayable(Piece.get(spaceDiv.firstElementChild))) {
                cl.add(Css.PLAYABLE);
                cl.remove(Css.UNPLAYABLE);
            } else {
                cl.remove(Css.PLAYABLE);
                cl.add(Css.UNPLAYABLE);
            }
        });
    }

    private async setSpaceSelected(spaceDiv: Element, selected: boolean) {
        const cl = spaceDiv.classList;
        if (selected == cl.contains(Css.SELECTED)) {
            return;
        }
        const pieceDiv = spaceDiv.firstElementChild as HTMLElement;
        const pi: PieceInfo = {
            pieceDiv: pieceDiv,
            pieceType: Piece.get(pieceDiv)!,
            logicalPos: this.getLogicalPos(spaceDiv)
        };
        cl.toggle(Css.SELECTED);
        await Promise.all(this.selectionHandlers.map(async h => h(pi, selected)));
    }

    public getSelectedPiece(deselect: boolean = false): PieceInfo | null {
        const spaceDiv = document.querySelector(`#${this.mainDiv.id} > .${Css.SELECTED}`);
        if (!spaceDiv) { 
            return null; 
        }
        const pieceDiv = spaceDiv.firstElementChild as HTMLElement;
        if (!pieceDiv) {
            console.error("no piece div in selected space", spaceDiv);
            return null;
        }
        const pieceType = Piece.get(pieceDiv);
        if (!pieceType) {
            console.error("no piece in selected space", spaceDiv, pieceDiv);
            return null;
        }
        if (deselect) { this.setSpaceSelected(spaceDiv, false); }
        return {
            pieceType: pieceType,
            logicalPos: this.getLogicalPos(spaceDiv),
            pieceDiv: pieceDiv
        }
    }

    /** returns the already selected   */
    public async unselectAllPieces() {
        for(let spaceDiv of Array.from(this.mainDiv.children)) {
            await this.setSpaceSelected(spaceDiv, false);
            spaceDiv.classList.remove(Css.PLAYABLE);
            spaceDiv.classList.remove(Css.UNPLAYABLE);
        };
    }

    private userInteractionEnabled = false;
    public enableUserInteraction() {
        this.userInteractionEnabled = true;
    }

    public disableUserInteraction() {
        this.userInteractionEnabled = false;
    }

    private async onHandClicked(ev: Event): Promise<boolean> {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this.userInteractionEnabled) { return false; }
        if (!this.bga.players.isCurrentPlayerActive()) { return false; }

        const pieceDiv = ev.target as HTMLElement;
        const spaceDiv = pieceDiv.parentElement!;

        let p = Piece.get(pieceDiv)!;
        if (!Piece.isNonEmpty(p)) { return false; }

        let cl = spaceDiv.classList;
        if (cl.contains(Css.UNPLAYABLE)) { return false; }

        const currentSelected = this.getSelectedPiece();
        if (currentSelected) {
            await this.setSpaceSelected(currentSelected.pieceDiv.parentElement!, false);
            if (currentSelected.pieceDiv == pieceDiv) {
                return false;
            }
        }

        this.disableUserInteraction();
        await this.setSpaceSelected(spaceDiv, true)
            .then(() => this.enableUserInteraction());
        return false;
    }
}
