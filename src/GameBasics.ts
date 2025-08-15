// @ts-ignore
GameGui = /** @class */ (function () {
  function GameGui() { }
  return GameGui;
})();


/** Class that extends default bga core game class with more functionality
 */

class GameBasics<T extends Gamedatas> extends GameGui<T> {
  protected currentState: string | null;
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
  }

  override onEnteringState(stateName: string, args: any) {
    console.log('onEnteringState: ' + stateName, args, this.debugStateInfo());
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
    console.log('onLeavingState: ' + stateName, this.debugStateInfo());
    this.currentPlayerWasActive = false;
  }

  override onUpdateActionButtons(stateName: string, args: any) {
    if (this.currentState != stateName) {
      // delay firing this until onEnteringState is called so they always called in same order
      this.pendingUpdate = true;
      //console.log('   DELAYED onUpdateActionButtons');
      return;
    }
    this.pendingUpdate = false;
    if (gameui.isCurrentPlayerActive() && this.currentPlayerWasActive == false) {
      console.log('onUpdateActionButtons: ' + stateName, args, this.debugStateInfo());
      this.currentPlayerWasActive = true;
      // Call appropriate method
      this.callfn('onUpdateActionButtons_' + stateName, args);
    } else {
      this.currentPlayerWasActive = false;
    }
  }

  // utils
  debugStateInfo(): any {
    var iscurac = gameui.isCurrentPlayerActive();
    var replayMode = false;
    if (typeof g_replayFrom != 'undefined') {
      replayMode = true;
    }
    var instantaneousMode = gameui.instantaneousMode ? true : false;
    var res = {
      isCurrentPlayerActive: iscurac,
      instantaneousMode: instantaneousMode,
      replayMode: replayMode,
    };
    return res;
  }

  // ajaxcallwrapper(action: string, args?: any, handler? : any): void {
  //   if (!args) {
  //     args = {};
  //   }
  //   args.lock = true;
  //   if (gameui.checkAction(action)) {
  //     gameui.ajaxcall(
  //       '/' + gameui.game_name + '/' + gameui.game_name + '/' + action + '.html',
  //       args, //
  //       gameui,
  //       (result) => {},
  //       handler
  //     );
  //   }
  // }

  createHtml(divstr: string, location?: string): HTMLElement {
    const tempHolder = document.createElement('div');
    tempHolder.innerHTML = divstr;
    const div = tempHolder.firstElementChild!;
    if (location) {
      document.getElementById(location)?.appendChild(div);
    }
    return div as HTMLElement;
  }

  createDiv(id?: string | undefined, classes?: string, location?: string): HTMLElement {
    const div = document.createElement('div');
    if (id) div.id = id;
    if (classes) div.classList.add(...classes.split(' '));
    if (location) {
      document.getElementById(location)?.appendChild(div);
    }
    return div;
  }

  updateStatusBar(message: string): void {
    $('gameaction_status').innerHTML = _(message);
    $('pagemaintitletext').innerHTML = _(message);
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
      console.log('Calling ' + methodName, args);
      return anythis[methodName](args);
    }
    return undefined;
  }

  /** @Override onScriptError from gameui */
  onScriptError(msg: string, url: string, linenumber: number): void {
    // if (gameui.page_is_unloading) {
      // // Don't report errors during page unloading
      // return;
    // }
    // In anycase, report these errors in the console
    console.error(msg);
    // cannot call super - dojo still have to used here
    // super.onScriptError(msg, url, linenumber);
    // return this.inherited(arguments);
  }
}
