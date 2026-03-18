import { BgaAnimations, AnimationManager } from './libs';

/** Class that extends default bga core game class with more functionality
 */

type SpecialLogArgs = Record<string, (any) => HTMLElement>;

export abstract class BaseGame<P extends Player, T extends Gamedatas<P>> {
  protected currentState: string | null;
  private pendingUpdate: boolean;
  private currentPlayerWasActive: boolean;
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

    this.currentState = null;
    this.pendingUpdate = false;
    this.currentPlayerWasActive = false;
}

  protected bgaAnimationsActive(): boolean {
    return this.bga.gameui.bgaAnimationsActive();
  }

  setup(gamedatas: T) {
    console.log('Starting game setup', gameui);
    this.gamedatas = gamedatas;
    // create the animation manager, and bind it to the `game.bgaAnimationsActive()` function
    this.autowireStateChangeMethods();
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
  protected indexInParent(el: Element): number {
    return Array.from(el.parentElement?.children ?? []).findIndex(e => e == el);
  }

  protected async notif_debug(args: any) {
    console.log("debug", args);
  }

  private autowireStateChangeMethods() {
    console.log("Checking dynamic state change methods");
    const stateNames = Object.entries(this.gamedatas.gamestates).map(([id,gs]) => gs.name);
    const maybeMatch = new RegExp('^on[A-Z][A-Za-z0-9_]*_(' + stateNames.join('|') + ')$');
    let wiredUp: string[] = [];
    let wrong: string[] = [];
    let maybe: string[] = [];
    Object.keys(Object.getPrototypeOf(this)).forEach((meth) => {
        if (meth.startsWith('onEnteringState_')) {
          if (stateNames.indexOf(meth.substring(16)) < 0) {
            wrong.push(meth);
          } else {
            wiredUp.push(meth);
          }
        }
        else if (meth.startsWith('onUpdateActionButtons_')) {
          if (stateNames.indexOf(meth.substring(22)) < 0) {
            wrong.push(meth);
          } else {
            wiredUp.push(meth);
          }
        } else if (maybeMatch.test(meth)) {
          maybe.push(meth);
        }
      }
    );
    if (wrong.length > 0) {
      throw new Error("Found state-change methods that do not correspond to a state: " + wrong);
    }
    if (maybe.length > 0) {
      console.warn("possible misnamed to-be-wired methods:", maybe);
    }
    console.log("Wired up state change methods", wiredUp);
  }

  bgaPerformAction(action: string, args?: any, params?: { lock?: boolean; checkAction?: boolean; checkPossibleActions?: boolean; }): Promise<any> {
    console.debug("action", action, args);
    return this.bga.actions.performAction(action, args, params ).then(() => console.debug("action completed", action, args));
  }

  onEnteringState(stateName: string, args: any) {
    console.debug('onEnteringState: ' + stateName, args, this.debugStateInfo());
    this.currentState = stateName;
    // Call appropriate method
    args = args ? args.args : null; // this method has extra wrapper for args for some reason
    var methodName = 'onEnteringState_' + stateName;
    this.callfn(methodName, args);

    if (this.pendingUpdate) {
      this.onUpdateActionButtons(stateName, args);
      this.pendingUpdate = false;
    }
  }

  onLeavingState(stateName: string) {
    // console.debug('onLeavingState: ' + stateName, this.debugStateInfo());
    this.currentPlayerWasActive = false;
  }

  onUpdateActionButtons(stateName: string, args: any) {
    if (this.currentState != stateName) {
      // delay firing this until onEnteringState is called so they always called in same order
      this.pendingUpdate = true;
      console.debug('   DELAYED onUpdateActionButtons');
      return;
    }
    this.pendingUpdate = false;
    if (gameui.isCurrentPlayerActive() && this.currentPlayerWasActive == false) {
      console.debug('onUpdateActionButtons: ' + stateName, args, this.debugStateInfo());
      this.currentPlayerWasActive = true;
      // Call appropriate method
      this.callfn('onUpdateActionButtons_' + stateName, args);
    } else {
      this.currentPlayerWasActive = false;
    }
  }

  // utils
  debugStateInfo(): any {
    return "";
    // return {
    //   isCurrentPlayerActive: gameui.isCurrentPlayerActive(),
    //   instantaneousMode: gameui.instantaneousMode,
    //   replayMode: typeof g_replayFrom != 'undefined',
    // };
  }

  /**
   *
   * @param {string} methodName
   * @param {object} args
   * @returns
   */
  private callfn(methodName: string, args: any): any {
    const anythis = this as any;
    if (anythis[methodName] !== undefined) {
      return anythis[methodName](args);
    } else {
      // console.debug("no method", methodName);
    }
    return undefined;
  }
}
