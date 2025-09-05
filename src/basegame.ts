
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

  // state hooks
  override setup(gamedatas: T) {
    console.log('Starting game setup', gameui);
    this.gamedatas = gamedatas;
    // create the animation manager, and bind it to the `game.bgaAnimationsActive()` function
    this.animationManager = new BgaAnimations.Manager({
      animationsActive: () => this.bgaAnimationsActive(),
    });
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

  createHtml(divstr: string, location?: string): HTMLElement {
    const tempHolder = document.createElement('div');
    tempHolder.innerHTML = divstr;
    const div = tempHolder.firstElementChild!;
    if (location) {
      $(location).appendChild(div);
    }
    return div as HTMLElement;
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

  protected playParallel(anims: Promise<any>[]): Promise<any> {
    return this.animationManager.playParallel([(i: number) => anims[i]!]);
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
      // $(IDS.BOARD).appendChild(div);
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

  private savedActionBarTitles: string[] = [];

  // Saves the current title text on the stack, sets the title text and returns the original.
  protected pushActionBarTitle(titleHTML: string): string {
    const titleEl = $('pagemaintitletext');
    const orig = titleEl.innerHTML;
    this.savedActionBarTitles.push(orig);
    titleEl.innerHTML = titleHTML;
    return orig;
  }

  // Sets title text to top of saved stack, returns current title text
  protected popActionBarTitle(): string {
    const titleEl = $('pagemaintitletext');
    const orig = titleEl.innerHTML;
    titleEl.innerHTML = this.savedActionBarTitles.pop()!;
    return orig;
  }
}
