
// @ts-ignore
GameGui = /** @class */ (function () {
  function GameGui() { }
  return GameGui;
})();

/** Class that extends default bga core game class with more functionality
 */

class BaseGame<T extends Gamedatas> extends GameGui<T> {
  protected currentState: string | null;
  protected animationManager: AnimationManager;
  private pendingUpdate: boolean;
  private currentPlayerWasActive: boolean;

  constructor() {
    super();
    console.log('game constructor');

    this.currentState = null;
    this.pendingUpdate = false;
    this.currentPlayerWasActive = false;
  }

  override setup(gamedatas: T) {
    console.log('Starting game setup', gameui);
    this.gamedatas = gamedatas;
    // create the animation manager, and bind it to the `game.bgaAnimationsActive()` function
    this.animationManager = new BgaAnimations.Manager({
      animationsActive: () => this.bgaAnimationsActive(),
    });
    this.autowireStateChangeMethods();
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

  override bgaPerformAction(action: string, args?: any, params?: { lock?: boolean; checkAction?: boolean; checkPossibleActions?: boolean; }): Promise<any> {
    console.debug("action", action, args);
    return (this as any).inherited(arguments).then(() => console.debug("action completed", action, args));
  }

  override onEnteringState(stateName: string, args: any) {
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

  override onLeavingState(stateName: string) {
    // console.debug('onLeavingState: ' + stateName, this.debugStateInfo());
    this.currentPlayerWasActive = false;
  }

  override onUpdateActionButtons(stateName: string, args: any) {
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

  // Returns the index of the given element among its parent's child elements
  // Returns 0 if no parent.
  protected indexInParent(el: Element): number {
    const parentEl = el.parentElement;
    if (!parentEl) { return 0; }
    for (let i = 0; i < parentEl.childElementCount; ++i) {
      if (el == parentEl.children[i]) {
        return i;
      }
    }
    throw new Error("element not found among its parent's children: ${el}");
  }

  protected createDiv(settings?: {
    id?: string,
    attrs?: Record<string, string> | null;
    className?: string | null;
  }): HTMLElement {
    const div = document.createElement('div');
    if (settings) {
      if (settings.id) {
        div.id = settings.id;
      }
      if (settings.className) {
        div.className = settings.className;
      }
      if (settings.attrs) {
        for (const name in settings.attrs) {
          div.setAttribute(name, settings.attrs[name]!);
        }
      }
    }
    return div;
  }

  protected async notif_debug(args: any) {
    console.log("debug", args);
  }

}
