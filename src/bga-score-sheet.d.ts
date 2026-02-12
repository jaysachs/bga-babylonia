type PlayerScore = {
    [property: string]: number | string;
};
type PlayerScores = {
    [playerId: number]: PlayerScore;
};
/**
 * Represent a player, displayed on a column.
 */
interface Player {
    /**
     * The name to display.
     */
    name: string;
    /**
     * The player color, either a CSS color, or a BGA color (= without the #)
     */
    color: string;
}
/**
 * Represent a score line.
 */
interface Entry {
    /**
     * The code of the property, that will be read on PlayerScore for each player.
     */
    property: string;
    /**
     * The label to display.
     */
    label?: string;
    /**
     * The tooltip to use (for example if the label is a picture in the background).
     */
    title?: string;
    /**
     * Override of the width of the entry (for direction: 'horizontal')
     */
    width?: number;
    /**
     * Override of the height of the entry (for direction: 'vertical')
     */
    height?: number;
    /**
     * The classes to apply to the label cell.
     */
    labelClasses?: string;
    /**
     * The classes to apply to the score cells of this line.
     * For example, to set the total line in bold.
     */
    scoresClasses?: string;
}
/**
 * The properties of the Skip button.
 */
interface SkipButton {
    /**
     * The label to display, for example `>>` or `_('Skip')`.
     */
    label: string;
    /**
     * The classes to apply to the button, for example `bgabutton bgabutton_blue`.
     */
    classes?: string;
}
/**
 * The settings to initiate the score sheet.
 */
interface ScoreSheetSettings {
    /**
     * The players, displayed on each score column.
     * It can be players from gamedatas.players, an automata, or a mix of both.
     */
    players: {
        [playerId: number]: Player;
    };
    /**
     * The lines of the score sheet.
     */
    entries: Entry[];
    /**
     * The scores to display. Fill it only if the game is already ended.
     */
    scores?: PlayerScores;
    /**
     * The classes to apply to the score sheet. You can use it to set an image background, if the game has a score sheet image.
     */
    classes?: string;
    /**
     * The direction: vertical for each player on a column and entries on rows, horizontal for a player on each row and entries on columns. Default vertical.
     */
    direction?: 'vertical' | 'horizontal';
    /**
     * The Skip button to display. If unset, no Skip button will be shown.
     * The button will only be visible during the animation.
     */
    skipButton?: SkipButton;
    /**
     * The callback when a score cell is filled. You can update the player score on the player panel when the total is displayed for a player :
     *
     * onScoreDisplayed: (property, playerId, score) => {
     *     if (property === 'total' && this.scoreCtrl[playerId]) {
     *         this.scoreCtrl[playerId].setValue(score);
     *     }
     * }
     */
    onScoreDisplayed?: (property: string, playerId: number, score: number | string) => any;
    /**
     * The left margin to start the table (usually, only to match a background image).
     */
    left?: number;
    /**
     * The top margin to start the table (usually, only to match a background image).
     */
    top?: number;
    /**
     * The player name cell width.
     */
    playerNameWidth?: number;
    /**
     * The player name cell height.
     */
    playerNameHeight?: number;
    /**
     * The entry label cell width.
     */
    entryLabelWidth?: number;
    /**
     * The entry label cell height.
     */
    entryLabelHeight?: number;
    /**
     * A function returning a boolean, or a boolean, to know if animations are active.
     */
    animationsActive?: (() => boolean) | boolean;
}
/**
 * The animation settings.
 */
interface AnimationSettings {
    /**
     * The duration of each cell reveal (default 800ms). Ignored if animations are not active.
     */
    duration?: number;
    /**
     * The order of reveal :
     *  - per-full-line will display entries one by one, the full line at the same time.
     *  - per-line will display the entries one by one, filling each player one by one for the entry.
     *  - per-player (default) will display the players one by one, filling each entry one by one for the player.
     */
    order?: 'per-full-line' | 'per-line' | 'per-player';
    /**
     * The player to start with (ignored with order: 'per-full-line').
     * It's recommended to set this.player_id here, so each player will see their score first then the other ones, in order of play.
     * Ignored for spectators that will see player's order.
     */
    startBy?: number;
}
/**
 * Create a Score Sheet on an empty element.
 * The Score sheet will not be visible by default, except if there are scores given in the settings.
 */
declare class ScoreSheet {
    protected element: HTMLElement;
    protected settings: ScoreSheetSettings;
    /**
     * The current animation duration.
     */
    protected animationDuration: number;
    /**
     * Creates the score sheet.
     *
     * @param element the element to place the sheet on
     * @param settings the score sheet settings
     */
    constructor(element: HTMLElement, settings: ScoreSheetSettings);
    animationsActive(): boolean;
    protected createCornerCell(): HTMLTableCellElement;
    protected createPlayerCell(player: Player): HTMLTableCellElement;
    protected createLabelCell(entry: Entry): HTMLTableCellElement;
    protected createScoreCell(entry: Entry, playerId: number | string): HTMLTableCellElement;
    protected buildTable(): void;
    /**
     * Triggers the animation of the scores.
     * Makes the score sheet visible.
     *
     * @param playerScores the scores to display, with an entry for each player. The player entry is an associative array (entry property => score for this entry & this player).
     * @param animationSettings the animation settings, or null if you don't want any animation.
     */
    setScores(playerScores: PlayerScores, animationSettings?: AnimationSettings): Promise<void>;
    /**
     * Sets the score on a cell, and trigger the callback if needed.
     */
    setScore(playerId: number, property: string, score: number | string): void;
    /**
     * Return a Promise that resolves at the end of a given number of ms.
     *
     * @param {number} delay the time to wait, in milliseconds
     * @returns a promise when the timer ends
     */
    wait(delay: number): Promise<void>;
    /**
     * Skip the running animations. Can be triggered by a click on the Skip button, or programmatically.
     */
    skipAnimations(): void;
    /**
     * Define the visibility of the score sheet.
     */
    setVisible(visible?: boolean): void;
}

declare const BgaScoreSheet: {
    ScoreSheet: typeof ScoreSheet;
};

export { BgaScoreSheet, ScoreSheet };
