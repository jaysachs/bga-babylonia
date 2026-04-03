import { BgaAnimations, AnimationManager } from './libs';

/** Class that extends default bga core game class with more functionality
 */

type SpecialLogArgs = Record<string, (any) => HTMLElement>;

export abstract class BaseGame<P extends Player, T extends Gamedatas<P>> {
  protected readonly animationManager: AnimationManager;
  protected gamedatas: T;
  public readonly bga: Bga<P, T>;
  private readonly special_log_args: SpecialLogArgs;

  constructor(bga: Bga<P, T>, special_log_args: SpecialLogArgs) {
    console.log('game constructor');
    this.bga = bga;
    this.special_log_args = special_log_args;
    this.animationManager = new BgaAnimations.Manager({
      animationsActive: () => this.bgaAnimationsActive(),
    });

}

  protected bgaAnimationsActive(): boolean {
    return this.bga.gameui.bgaAnimationsActive();
  }

  setup(gamedatas: T) {
    console.log('Starting game setup', gameui);
    this.gamedatas = gamedatas;
    // create the animation manager, and bind it to the `game.bgaAnimationsActive()` function
  }

  bgaFormatText(log: string, args: any): { log: string, args: any } {
    try {
      const shadowParent = document.createElement('span');
      if (log && args && !args.processed) {
        args.processed = true;
        for (const key in this.special_log_args) {
          if (key in args) {
            const e = this.special_log_args[key](args);
            shadowParent.appendChild(e);
            args[key] = shadowParent.getHTML();
            e.remove();
          }
        }
      }
    } catch (e: any) {
      console.error(log, args, 'Exception thrown', e.stack);
    }
    return { log, args };
  }

  /**
  * Returns the index of the given element among its parent's child elements or -1 if no parent.
  */
  public indexInParent(el: Element): number {
    return Array.from(el.parentElement?.children ?? []).findIndex(e => e == el);
  }

  protected async notif_debug(args: any) {
    console.log("debug", args);
  }

  bgaPerformAction(action: string, args?: any, params?: { lock?: boolean; checkAction?: boolean; checkPossibleActions?: boolean; }): Promise<any> {
    console.debug("action", action, args);
    return this.bga.actions.performAction(action, args, params ).then(() => console.debug("action completed", action, args));
  }
}
