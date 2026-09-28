import { BgaAnimations, AnimationManager } from '../bgalibs/libs';
import { MoreAnimations } from './more-animations';
import { TextFormatter } from './textformatter';
import { TooltipManager } from './tooltips';

/**
 * Class that extends default bga core game class with more functionality
 */

export abstract class BaseGame<P extends Player, T extends Gamedatas<P>> {
    public readonly animationManager: AnimationManager;
    public readonly moreAnimations: MoreAnimations;
    public readonly bga: Bga<P, T>;
    protected readonly textFormatter: TextFormatter = new TextFormatter();
    protected readonly tooltipManager: TooltipManager;

    constructor(bga: Bga<P, T>) {
        this.bga = bga;
        this.animationManager = new BgaAnimations.Manager({
            animationsActive: () => this.bgaAnimationsActive(),
            // duration: 750, // default is 500
        });
        this.moreAnimations = new MoreAnimations(this.animationManager);
        this.tooltipManager = new TooltipManager(bga);
    }

    protected bgaAnimationsActive(): boolean {
        return this.bga.gameui.bgaAnimationsActive();
    }

    bgaFormatText(log: string, args: any): { log: string, args: any } {
        if (log && args && !args.processed) {
            args.processed = true;
            args = this.textFormatter.formatArgs(args);
            args.processed = true;
        }
        return { log, args };
    }
}
