var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var AnimationManager = /** @class */ (function () {
    /**
     * @param game the BGA game class, usually it will be `this`
     * @param settings: a `AnimationManagerSettings` object
     */
    function AnimationManager(game, settings) {
        this.game = game;
        this.settings = settings;
        this.zoomManager = settings === null || settings === void 0 ? void 0 : settings.zoomManager;
        if (!game) {
            throw new Error('You must set your game as the first parameter of AnimationManager');
        }
    }
    AnimationManager.prototype.getZoomManager = function () {
        return this.zoomManager;
    };
    /**
     * Set the zoom manager, to get the scale of the current game.
     *
     * @param zoomManager the zoom manager
     */
    AnimationManager.prototype.setZoomManager = function (zoomManager) {
        this.zoomManager = zoomManager;
    };
    AnimationManager.prototype.getSettings = function () {
        return this.settings;
    };
    /**
     * Returns if the animations are active. Animation aren't active when the window is not visible (`document.visibilityState === 'hidden'`), or `game.instantaneousMode` is true.
     *
     * @returns if the animations are active.
     */
    AnimationManager.prototype.animationsActive = function () {
        return document.visibilityState !== 'hidden' && !this.game.instantaneousMode;
    };
    /**
     * Plays an animation if the animations are active. Animation aren't active when the window is not visible (`document.visibilityState === 'hidden'`), or `game.instantaneousMode` is true.
     *
     * @param animation the animation to play
     * @returns the animation promise.
     */
    AnimationManager.prototype.play = function (animation) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, animation.play(this)];
            });
        });
    };
    /**
     * Plays multiple animations in parallel.
     *
     * @param animations the animations to play
     * @returns a promise for all animations.
     */
    AnimationManager.prototype.playParallel = function (animations) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.all(animations.map(function (animation) { return _this.play(animation); }))];
            });
        });
    };
    /**
     * Plays multiple animations in sequence (the second when the first ends, ...).
     *
     * @param animations the animations to play
     * @returns a promise for all animations.
     */
    AnimationManager.prototype.playSequence = function (animations) {
        return __awaiter(this, void 0, void 0, function () {
            var result, _i, animations_1, a, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        result = [];
                        _i = 0, animations_1 = animations;
                        _c.label = 1;
                    case 1:
                        if (!(_i < animations_1.length)) return [3 /*break*/, 4];
                        a = animations_1[_i];
                        _b = (_a = result).push;
                        return [4 /*yield*/, this.play(a)];
                    case 2:
                        _b.apply(_a, [_c.sent()]);
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, Promise.resolve(result)];
                }
            });
        });
    };
    /**
     * Plays multiple animations with a delay between each animation start.
     *
     * @param animations the animations to play
     * @param delay the delay (in ms)
     * @returns a promise for all animations.
     */
    AnimationManager.prototype.playWithDelay = function (animations, delay) {
        return __awaiter(this, void 0, void 0, function () {
            var promise;
            var _this = this;
            return __generator(this, function (_a) {
                promise = new Promise(function (success) {
                    var promises = [];
                    var _loop_1 = function (i) {
                        setTimeout(function () {
                            promises.push(_this.play(animations[i]));
                            if (i == animations.length - 1) {
                                Promise.all(promises).then(function (result) {
                                    success(result);
                                });
                            }
                        }, i * delay);
                    };
                    for (var i = 0; i < animations.length; i++) {
                        _loop_1(i);
                    }
                });
                return [2 /*return*/, promise];
            });
        });
    };
    /**
     * Attach an element to a parent, then play animation from element's origin to its new position.
     *
     * @param animation the animation function
     * @param attachElement the destination parent
     * @returns a promise when animation ends
     */
    AnimationManager.prototype.attachWithAnimation = function (animation, attachElement) {
        var attachWithAnimation = new BgaAttachWithAnimation({
            animation: animation,
            duration: null,
            attachElement: attachElement
        });
        return this.play(attachWithAnimation);
    };
    /**
     * Return the x and y delta, based on the animation settings;
     *
     * @param settings an `AnimationSettings` object
     * @returns a promise when animation ends
     */
    AnimationManager.prototype.getDeltaCoordinates = function (element, settings) {
        var _a;
        if (!settings.fromDelta && !settings.fromRect && !settings.fromElement) {
            throw new Error("[bga-animation] fromDelta, fromRect or fromElement need to be set");
        }
        var x = 0;
        var y = 0;
        if (settings.fromDelta) {
            x = settings.fromDelta.x;
            y = settings.fromDelta.y;
        }
        else {
            var originBR = (_a = settings.fromRect) !== null && _a !== void 0 ? _a : this.game.getBoundingClientRectIgnoreZoom(settings.fromElement);
            // TODO make it an option ?
            var originalTransform = element.style.transform;
            element.style.transform = '';
            var destinationBR = this.game.getBoundingClientRectIgnoreZoom(element);
            element.style.transform = originalTransform;
            x = (destinationBR.left + destinationBR.right) / 2 - (originBR.left + originBR.right) / 2;
            y = (destinationBR.top + destinationBR.bottom) / 2 - (originBR.top + originBR.bottom) / 2;
        }
        if (settings.scale) {
            x /= settings.scale;
            y /= settings.scale;
        }
        return { x: x, y: y };
    };
    return AnimationManager;
}());
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var BgaAnimation = /** @class */ (function () {
    function BgaAnimation(settings) {
        this.settings = settings;
        this.result = null;
        this.playWhenNoAnimation = false;
    }
    BgaAnimation.prototype.preAnimate = function (animationManager) { };
    BgaAnimation.prototype.postAnimate = function (animationManager) { };
    BgaAnimation.prototype.play = function (animationManager) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return __awaiter(this, void 0, void 0, function () {
            var shouldPlay, _l;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0:
                        shouldPlay = this.playWhenNoAnimation || animationManager.animationsActive();
                        if (!shouldPlay) return [3 /*break*/, 2];
                        (_b = (_a = this.settings).animationStart) === null || _b === void 0 ? void 0 : _b.call(_a, this);
                        this.settings = __assign({ duration: (_f = (_d = (_c = this.settings) === null || _c === void 0 ? void 0 : _c.duration) !== null && _d !== void 0 ? _d : (_e = animationManager.getSettings()) === null || _e === void 0 ? void 0 : _e.duration) !== null && _f !== void 0 ? _f : 500 }, this.settings);
                        this.preAnimate(animationManager);
                        _l = this;
                        return [4 /*yield*/, this.doAnimate(animationManager)];
                    case 1:
                        _l.result = _m.sent();
                        this.postAnimate(animationManager);
                        (_h = (_g = this.settings).animationEnd) === null || _h === void 0 ? void 0 : _h.call(_g, this);
                        return [3 /*break*/, 3];
                    case 2:
                        (_k = (_j = this.settings).animationEnd) === null || _k === void 0 ? void 0 : _k.call(_j, this);
                        return [2 /*return*/, Promise.resolve(this)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    BgaAnimation.prototype.wireUp = function (element, duration, success) {
        var _this = this;
        var originalZIndex = element.style.zIndex;
        var originalTransition = element.style.transition;
        var cleanOnTransitionEnd = function () {
            element.style.zIndex = originalZIndex;
            element.style.transition = originalTransition;
            success();
            element.removeEventListener('transitioncancel', cleanOnTransitionEnd);
            element.removeEventListener('transitionend', cleanOnTransitionEnd);
            element.removeEventListener("animationend", cleanOnTransitionEnd);
            document.removeEventListener('visibilitychange', cleanOnTransitionEnd);
            if (_this.timeoutId) {
                clearTimeout(_this.timeoutId);
            }
        };
        var cleanOnTransitionCancel = function () {
            element.style.transition = "";
            element.offsetHeight;
            //            element.style.transform = this.settings?.finalTransform ?? null;
            element.offsetHeight;
            cleanOnTransitionEnd();
        };
        element.addEventListener("animationend", cleanOnTransitionEnd, false);
        element.addEventListener('transitioncancel', cleanOnTransitionEnd);
        element.addEventListener('transitionend', cleanOnTransitionEnd);
        document.addEventListener('visibilitychange', cleanOnTransitionCancel);
        // safety in case transitionend and transitioncancel are not called
        this.timeoutId = setTimeout(cleanOnTransitionEnd, duration + 100);
    };
    return BgaAnimation;
}());
var BgaElementAnimation = /** @class */ (function (_super) {
    __extends(BgaElementAnimation, _super);
    function BgaElementAnimation(settings) {
        return _super.call(this, settings) || this;
    }
    BgaElementAnimation.prototype.preAnimate = function (animationManager) {
        var _a, _b, _c, _d, _e;
        this.settings = __assign({ scale: (_d = (_b = (_a = this.settings) === null || _a === void 0 ? void 0 : _a.scale) !== null && _b !== void 0 ? _b : (_c = animationManager.getZoomManager()) === null || _c === void 0 ? void 0 : _c.zoom) !== null && _d !== void 0 ? _d : undefined }, this.settings);
        this.settings.element.classList.add((_e = this.settings.animationClass) !== null && _e !== void 0 ? _e : 'bga-animations_animated');
    };
    BgaElementAnimation.prototype.postAnimate = function (animationManager) {
        var _a;
        this.settings.element.classList.remove((_a = this.settings.animationClass) !== null && _a !== void 0 ? _a : 'bga-animations_animated');
    };
    return BgaElementAnimation;
}(BgaAnimation));
/**
 * Just use playSequence from animationManager
 */
var BgaAttachWithAnimation = /** @class */ (function (_super) {
    __extends(BgaAttachWithAnimation, _super);
    function BgaAttachWithAnimation(settings) {
        var _this = _super.call(this, settings) || this;
        _this.playWhenNoAnimation = true;
        return _this;
    }
    BgaAttachWithAnimation.prototype.doAnimate = function (animationManager) {
        var _a;
        var settings = this.settings;
        var element = settings.animation.settings.element;
        element.offsetHeight;
        var fromRect = animationManager.game.getBoundingClientRectIgnoreZoom(element);
        settings.animation.settings.fromRect = fromRect;
        settings.attachElement.appendChild(element);
        (_a = settings.afterAttach) === null || _a === void 0 ? void 0 : _a.call(settings, element, settings.attachElement);
        return animationManager.play(settings.animation);
    };
    return BgaAttachWithAnimation;
}(BgaAnimation));
/**
 * Just use playSequence from animationManager
 */
var BgaCompoundAnimation = /** @class */ (function (_super) {
    __extends(BgaCompoundAnimation, _super);
    function BgaCompoundAnimation(settings) {
        var _this = _super.call(this, settings) || this;
        _this.playWhenNoAnimation = true;
        return _this;
    }
    BgaCompoundAnimation.prototype.doAnimate = function (animationManager) {
        if (this.settings.mode == "parallel") {
            return animationManager.playParallel(this.settings.animations);
        }
        else {
            return animationManager.playSequence(this.settings.animations);
        }
    };
    return BgaCompoundAnimation;
}(BgaAnimation));
/**
 * Fade the element.
 */
var BgaFadeAnimation = /** @class */ (function (_super) {
    __extends(BgaFadeAnimation, _super);
    function BgaFadeAnimation(settings) {
        return _super.call(this, settings) || this;
    }
    BgaFadeAnimation.prototype.doAnimate = function (animationManager) {
        var _this = this;
        return new Promise(function (success) {
            var _a, _b, _c, _d;
            var element = _this.settings.element;
            var duration = (_b = (_a = _this.settings) === null || _a === void 0 ? void 0 : _a.duration) !== null && _b !== void 0 ? _b : 500;
            _this.wireUp(element, duration, success);
            // this gets saved/restored in wireUp
            // element.style.zIndex = `${this.settings?.zIndex ?? 10}`;
            var frames = [];
            switch (_this.settings.kind) {
                case "in":
                    frames.push({ opacity: 0 }, { opacity: 1 });
                    break;
                case "out":
                    frames.push({ opacity: 1 }, { opacity: 0 });
                    break;
                case "outin":
                    frames.push({ opacity: 1 }, { opacity: 0 }, { opacity: 1 });
                    break;
            }
            var a = new Animation(new KeyframeEffect(element, frames, {
                duration: duration,
                easing: (_c = _this.settings.transitionTimingFunction) !== null && _c !== void 0 ? _c : 'linear',
                fill: "forwards",
                iterations: (_d = _this.settings.iterations) !== null && _d !== void 0 ? _d : 1,
            }));
            a.onfinish = function (e) {
                a.commitStyles();
                // element.style.transform = this.settings?.finalTransform ?? null;
            };
            a.play();
        });
    };
    return BgaFadeAnimation;
}(BgaElementAnimation));
/**
 * Just does nothing for the duration
 */
var BgaPauseAnimation = /** @class */ (function (_super) {
    __extends(BgaPauseAnimation, _super);
    function BgaPauseAnimation(settings) {
        return _super.call(this, settings) || this;
    }
    BgaPauseAnimation.prototype.doAnimate = function (animationManager) {
        var _this = this;
        return new Promise(function (success) {
            var _a, _b;
            var duration = (_b = (_a = _this.settings) === null || _a === void 0 ? void 0 : _a.duration) !== null && _b !== void 0 ? _b : 500;
            setTimeout(function () { return success(); }, duration);
        });
    };
    return BgaPauseAnimation;
}(BgaAnimation));
/**
 * Show the element at the center of the screen
 */
var BgaShowScreenCenterAnimation = /** @class */ (function (_super) {
    __extends(BgaShowScreenCenterAnimation, _super);
    function BgaShowScreenCenterAnimation(settings) {
        return _super.call(this, settings) || this;
    }
    BgaShowScreenCenterAnimation.prototype.doAnimate = function (animationManager) {
        var _this = this;
        return new Promise(function (success) {
            var _a, _b, _c, _d, _e;
            var element = _this.settings.element;
            var elementBR = animationManager.game.getBoundingClientRectIgnoreZoom(element);
            var xCenter = (elementBR.left + elementBR.right) / 2;
            var yCenter = (elementBR.top + elementBR.bottom) / 2;
            var x = xCenter - (window.innerWidth / 2);
            var y = yCenter - (window.innerHeight / 2);
            var transitionTimingFunction = (_a = _this.settings.transitionTimingFunction) !== null && _a !== void 0 ? _a : 'linear';
            var duration = (_c = (_b = _this.settings) === null || _b === void 0 ? void 0 : _b.duration) !== null && _c !== void 0 ? _c : 500;
            _this.wireUp(element, duration, success);
            element.style.zIndex = "".concat((_e = (_d = _this.settings) === null || _d === void 0 ? void 0 : _d.zIndex) !== null && _e !== void 0 ? _e : 10);
            // element.offsetHeight;
            var a = new Animation(new KeyframeEffect(element, [
                { transform: "translate3D(0, 0, 0)" },
                { transform: "translate3D(".concat(-x, "px, ").concat(-y, "px, 0)") }
                // { transform: `translate3D(0, 0, 0)` }
            ], {
                duration: duration,
                fill: "forwards",
                easing: transitionTimingFunction
            }));
            // element.offsetHeight;
            a.onfinish = function (e) {
                a.commitStyles();
                // element.style.transform = this.settings?.finalTransform ?? null;
            };
            a.play();
        });
    };
    return BgaShowScreenCenterAnimation;
}(BgaElementAnimation));
/**
 * Slide of the element from origin to destination.
 */
var BgaSlideAnimation = /** @class */ (function (_super) {
    __extends(BgaSlideAnimation, _super);
    function BgaSlideAnimation(settings) {
        return _super.call(this, settings) || this;
    }
    BgaSlideAnimation.prototype.doAnimate = function (animationManager) {
        var _this = this;
        return new Promise(function (success) {
            var _a, _b, _c, _d, _e;
            var element = _this.settings.element;
            var transitionTimingFunction = (_a = _this.settings.transitionTimingFunction) !== null && _a !== void 0 ? _a : 'linear';
            var duration = (_c = (_b = _this.settings) === null || _b === void 0 ? void 0 : _b.duration) !== null && _c !== void 0 ? _c : 500;
            var _f = animationManager.getDeltaCoordinates(element, _this.settings), x = _f.x, y = _f.y;
            _this.wireUp(element, duration, success);
            // this gets saved/restored in wireUp
            element.style.zIndex = "".concat((_e = (_d = _this.settings) === null || _d === void 0 ? void 0 : _d.zIndex) !== null && _e !== void 0 ? _e : 10);
            var a = new Animation(new KeyframeEffect(element, [
                { transform: "translate3D(0, 0, 0)" },
                { transform: "translate3D(".concat(-x, "px, ").concat(-y, "px, 0)") }
            ], {
                iterations: _this.settings.iterations,
                direction: _this.settings.direction,
                duration: duration,
                easing: transitionTimingFunction,
                fill: "forwards"
            }));
            a.onfinish = function (e) {
                a.commitStyles();
                //    element.style.transform = this.settings?.finalTransform ?? null;
            };
            a.play();
        });
    };
    return BgaSlideAnimation;
}(BgaElementAnimation));
/**
 * Slide of the element from origin to destination.
 */
var BgaSlideTempAnimation = /** @class */ (function (_super) {
    __extends(BgaSlideTempAnimation, _super);
    function BgaSlideTempAnimation(settings) {
        return _super.call(this, settings) || this;
    }
    BgaSlideTempAnimation.prototype.doAnimate = function (animationManager) {
        var _this = this;
        var delta = { x: 0, y: 0 };
        var div;
        return new Promise(function (success) {
            var _a, _b;
            var parent = document.getElementById(_this.settings.parentId);
            var parentRect = parent.getBoundingClientRect();
            var toRect = document.getElementById(_this.settings.toId).getBoundingClientRect();
            var fromRect = document.getElementById(_this.settings.fromId).getBoundingClientRect();
            var top = fromRect.top - parentRect.top;
            var left = fromRect.left - parentRect.left;
            div = document.createElement('div');
            div.id = "bbl_tmp_slideTmpDiv".concat(BgaSlideTempAnimation.lastId++);
            div.className = _this.settings.className;
            // Unclear why setting `style` attribute directly doesn't work.
            div.style.position = 'absolute';
            div.style.top = "".concat(top, "px");
            div.style.left = "".concat(left, "px");
            div.style.zIndex = '100';
            parent.appendChild(div);
            var duration = (_b = (_a = _this.settings) === null || _a === void 0 ? void 0 : _a.duration) !== null && _b !== void 0 ? _b : 500;
            _this.wireUp(div, duration, success);
            var divRect = div.getBoundingClientRect();
            var toTop = toRect.top - parentRect.top + (toRect.height - divRect.height) / 2;
            var toLeft = toRect.left - parentRect.left + (toRect.width - divRect.width) / 2;
            delta = {
                x: left - toLeft,
                y: top - toTop
            };
            return new BgaSlideAnimation({ duration: duration, element: div, fromDelta: delta }).play(animationManager).then(function () { return div.remove(); });
        });
    };
    BgaSlideTempAnimation.lastId = 0;
    return BgaSlideTempAnimation;
}(BgaAnimation));
/**
 * spin/grow temp text.
 */
var BgaSpinGrowAnimation = /** @class */ (function (_super) {
    __extends(BgaSpinGrowAnimation, _super);
    function BgaSpinGrowAnimation(settings) {
        return _super.call(this, settings) || this;
    }
    BgaSpinGrowAnimation.prototype.doAnimate = function (animationManager) {
        var _this = this;
        var delta = { x: 0, y: 0 };
        var div;
        return new Promise(function (success) {
            var _a, _b;
            var parent = document.getElementById(_this.settings.parentId);
            var id = "bbl_tmp_spinGrowFx-".concat(BgaSpinGrowAnimation.lastId++);
            var outer = document.createElement('span');
            outer.id = id;
            outer.append(_this.settings.text);
            parent.appendChild(outer);
            outer.style.color = "blue";
            outer.style.color = "transparent";
            outer.style.position = "absolute";
            outer.style.fontSize = (_this.settings.fontSize || 128) + "pt";
            outer.style.display = "inline-block";
            outer.style.justifyContent = "center";
            outer.style.alignItems = "center";
            outer.style.display = "flex";
            // probably should allow a class to be passed in and used for these two
            outer.style.fontFamily = "Helvetica";
            outer.style.fontStyle = "bold";
            // get the ultimate dimensions of the container span
            var nrect = outer.getBoundingClientRect();
            outer.style.width = "".concat(nrect.width);
            outer.style.height = "".concat(nrect.height);
            // center the container on the center of the appropriate node
            var centerNode = document.getElementById(_this.settings.centeredOnId || _this.settings.parentId);
            var prect = parent.getBoundingClientRect();
            var crect = centerNode.getBoundingClientRect();
            var left = (crect.left + crect.width / 2 - nrect.width / 2 - prect.left);
            var top = (crect.top + crect.height / 2 - nrect.height / 2 - prect.top);
            outer.style.left = left + "px";
            outer.style.top = top + "px";
            // now create the node we're animating
            var node = document.createElement('span');
            node.append(_this.settings.text);
            outer.append(node);
            node.style.position = "absolute";
            node.style.display = "inline-block";
            node.style.justifyContent = "center";
            node.style.alignItems = "center";
            node.style.display = "flex";
            node.style.color = _this.settings.color || 'black';
            // this maybe ought to be a parameter, or part of the incoming class.
            // it also causes multiples of the text to show up!?!?
            // node.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000";
            node.style['-webkit-text-stroke'] = 'thin black';
            var fontSize = _this.settings.fontSize || 190;
            node.style.fontSize = "".concat(fontSize, "pt");
            node.style.opacity = '0';
            var duration = (_b = (_a = _this.settings) === null || _a === void 0 ? void 0 : _a.duration) !== null && _b !== void 0 ? _b : 1000;
            var degrees = (_this.settings.spinCount || 2) * 360;
            _this.wireUp(node, duration, success);
            var a = new Animation(new KeyframeEffect(node, [
                { opacity: 1, transform: "rotate(0deg) scale(0.01)" },
                { opacity: 1, transform: "rotate(".concat(degrees, "deg) scale(1)") },
                { opacity: 0, transform: "rotate(".concat(degrees, "deg) scale(1)") },
            ], { duration: duration }));
            a.onfinish = function (e) {
                //    element.style.transform = this.settings?.finalTransform ?? null;
                outer.remove();
            };
            a.play();
        });
    };
    BgaSpinGrowAnimation.lastId = 0;
    return BgaSpinGrowAnimation;
}(BgaAnimation));
// @ts-ignore
GameGui = /** @class */ (function () {
    function GameGui() { }
    return GameGui;
})();
/** Class that extends default bga core game class with more functionality
 */
var GameBasics = /** @class */ (function (_super) {
    __extends(GameBasics, _super);
    function GameBasics() {
        var _this = _super.call(this) || this;
        console.log("game constructor");
        _this.currentState = null;
        _this.pendingUpdate = false;
        _this.currentPlayerWasActive = false;
        return _this;
    }
    // state hooks
    GameBasics.prototype.setup = function (gamedatas) {
        console.log("Starting game setup", gameui);
        this.gamedatas = gamedatas;
    };
    GameBasics.prototype.onEnteringState = function (stateName, args) {
        console.log("onEnteringState: " + stateName, args, this.debugStateInfo());
        this.currentState = stateName;
        // Call appropriate method
        args = args ? args.args : null; // this method has extra wrapper for args for some reason
        this.stateArgs = args;
        var methodName = "onEnteringState_" + stateName;
        this.callfn(methodName, args);
        if (this.pendingUpdate) {
            this.onUpdateActionButtons(stateName, args);
            this.pendingUpdate = false;
        }
    };
    GameBasics.prototype.onLeavingState = function (stateName) {
        console.log("onLeavingState: " + stateName, this.debugStateInfo());
        this.currentPlayerWasActive = false;
    };
    GameBasics.prototype.onUpdateActionButtons = function (stateName, args) {
        if (this.currentState != stateName) {
            // delay firing this until onEnteringState is called so they always called in same order
            this.pendingUpdate = true;
            //console.log('   DELAYED onUpdateActionButtons');
            return;
        }
        this.pendingUpdate = false;
        if (gameui.isCurrentPlayerActive() && this.currentPlayerWasActive == false) {
            console.log("onUpdateActionButtons: " + stateName, args, this.debugStateInfo());
            this.currentPlayerWasActive = true;
            // Call appropriate method
            this.callfn("onUpdateActionButtons_" + stateName, args);
        }
        else {
            this.currentPlayerWasActive = false;
        }
    };
    GameBasics.prototype.updateStatusBar = function (message) {
        $('gameaction_status').innerHTML = _(message);
        $('pagemaintitletext').innerHTML = _(message);
    };
    // utils
    GameBasics.prototype.debugStateInfo = function () {
        var iscurac = gameui.isCurrentPlayerActive();
        var replayMode = false;
        if (typeof g_replayFrom != "undefined") {
            replayMode = true;
        }
        var instantaneousMode = gameui.instantaneousMode ? true : false;
        var res = {
            isCurrentPlayerActive: iscurac,
            instantaneousMode: instantaneousMode,
            replayMode: replayMode,
        };
        return res;
    };
    /*
    ajaxcallwrapper(action: string, args?: any, handler?) {
      if (!args) {
        args = {};
      }
      args.lock = true;
      if (gameui.checkAction(action)) {
        gameui.ajaxcall(
          "/" + gameui.game_name + "/" + gameui.game_name + "/" + action + ".html",
          args, //
          gameui,
          (result) => {},
          handler
        );
      }
    }
  */
    GameBasics.prototype.createHtml = function (divstr, location) {
        var tempHolder = document.createElement("div");
        tempHolder.innerHTML = divstr;
        var div = tempHolder.firstElementChild;
        var parentNode = document.getElementById(location);
        if (parentNode)
            parentNode.appendChild(div);
        return div;
    };
    GameBasics.prototype.createDiv = function (id, classes, location) {
        var _a;
        var div = document.createElement("div");
        if (id)
            div.id = id;
        if (classes)
            (_a = div.classList).add.apply(_a, classes.split(" "));
        var parentNode = document.getElementById(location);
        if (parentNode)
            parentNode.appendChild(div);
        return div;
    };
    /**
     *
     * @param {string} methodName
     * @param {object} args
     * @returns
     */
    GameBasics.prototype.callfn = function (methodName, args) {
        if (this[methodName] !== undefined) {
            console.log("Calling " + methodName, args);
            return this[methodName](args);
        }
        return undefined;
    };
    /** @Override onScriptError from gameui */
    GameBasics.prototype.onScriptError = function (msg, url, linenumber) {
        if (gameui.page_is_unloading) {
            // Don't report errors during page unloading
            return;
        }
        // In anycase, report these errors in the console
        console.error(msg);
        // cannot call super - dojo still have to used here
        //super.onScriptError(msg, url, linenumber);
        return this.inherited(arguments);
    };
    return GameBasics;
}(GameGui));
;
;
var IDS = /** @class */ (function () {
    function IDS() {
    }
    IDS.handPos = function (pos) {
        return "bbl_hand_".concat(pos);
    };
    IDS.handcount = function (playerId) {
        return 'bbl_handcount_' + playerId;
    };
    IDS.poolcount = function (playerId) {
        return 'bbl_poolcount_' + playerId;
    };
    IDS.citycount = function (playerId) {
        return 'bbl_citycount_' + playerId;
    };
    IDS.hexDiv = function (rc) {
        return "bbl_hex_".concat(rc.row, "_").concat(rc.col);
    };
    IDS.playerBoardZcards = function (playerId) {
        return "bbl_zcards_".concat(playerId);
    };
    IDS.ownedZcard = function (z) {
        return "bbl_ozig_".concat(z);
    };
    IDS.availableZcard = function (z) {
        return "bbl_zig_".concat(z);
    };
    IDS.AVAILABLE_ZCARDS = 'bbl_available_zcards';
    IDS.BOARD = 'bbl_board';
    IDS.BOARD_CONTAINER = 'bbl_board_container';
    IDS.HAND = 'bbl_hand';
    return IDS;
}());
var CSS = /** @class */ (function () {
    function CSS() {
    }
    CSS.piece = function (piece, playerNumber) {
        if (playerNumber === void 0) { playerNumber = null; }
        if (playerNumber == null) {
            return 'bbl_' + piece;
        }
        else {
            return 'bbl_' + piece + '_' + playerNumber;
        }
    };
    CSS.handPiece = function (piece, playerNumber) {
        if (piece == null || piece == "empty") {
            return CSS.EMPTY;
        }
        return CSS.piece(piece, playerNumber);
    };
    CSS.zcard = function (card, used) {
        if (used === void 0) { used = false; }
        return used ? 'bbl_zc_used' : ('bbl_' + card);
    };
    CSS.SELECTING = 'bbl_selecting';
    CSS.SELECTED = 'bbl_selected';
    CSS.PLAYABLE = 'bbl_playable';
    CSS.UNPLAYABLE = 'bbl_unplayable';
    CSS.EMPTY = 'bbl_empty';
    return CSS;
}());
var jstpl_log_piece = '<span class="log-element bbl_${piece}_${player_number}"></span>';
var jstpl_log_city = '<span class="log-element bbl_${city}"></span>';
var jstpl_log_zcard = '<span class="log-element bbl_${zcard}"></span>';
var jstpl_hex = '<div id="bbl_hex_${row}_${col}" style="top:${top}px; left:${left}px;"></div>';
var jstpl_player_board_ext = '<div>\
   <span class="bbl_pb_hand_label_${player_number}"></span>\
   <span id="bbl_handcount_${player_id}">5</span>\
 </div>\
 <div>\
   <span class="bbl_pb_pool_label_${player_number}"></span>\
   <span id="bbl_poolcount_${player_id}">19</span>\
 </div>\
 <div>\
   <span class="bbl_pb_citycount_label"></span>\
   <span id="bbl_citycount_${player_id}">1</span>\
 </div>\
 <div id="bbl_zcards_${player_id}" class="bbl_pb_zcards">\
   <span class="bbl_pb_zcard_label"></span>\
 </div>';
var special_log_args = {
    zcard: {
        tmpl: 'jstpl_log_zcard',
        tmplargs: function (a) { return a; }
    },
    city: {
        tmpl: 'jstpl_log_city',
        tmplargs: function (a) { return a; }
    },
    piece: {
        tmpl: 'jstpl_log_piece',
        tmplargs: function (a) { return a; }
    },
    original_piece: {
        tmpl: 'jstpl_log_piece',
        tmplargs: function (args) { return Object.assign(Object.assign({}, args), {
            piece: args['original_piece'],
            player_number: args['player_number']
        }); }
    }
};
/** Game class */
var GameBody = /** @class */ (function (_super) {
    __extends(GameBody, _super);
    function GameBody() {
        var _this = _super.call(this) || this;
        _this.hand = [];
        _this.handCounters = [];
        _this.poolCounters = [];
        _this.cityCounters = [];
        _this.zcards = [];
        _this.pieceClasses = ['priest', 'servant', 'farmer', 'merchant'];
        _this.handlers = [];
        _this.animating = false;
        _this.animationManager = new AnimationManager(_this);
        return _this;
    }
    GameBody.prototype.play = function (anim) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.animating = true;
                return [2 /*return*/, this.animationManager.play(anim)
                        .then(function () { _this.animating = false; })];
            });
        });
    };
    GameBody.prototype.pausable = function (f) {
        var _this = this;
        return function (e) {
            if (!_this.animating) {
                f(e);
            }
        };
    };
    GameBody.prototype.addPausableHandler = function (e, type, handler) {
        e.addEventListener(type, this.pausable(handler));
    };
    GameBody.prototype.setupHandlers = function () {
        this.addPausableHandler($(IDS.HAND), 'click', this.onHandClicked.bind(this));
        this.addPausableHandler($(IDS.BOARD), 'click', this.onBoardClicked.bind(this));
        this.addPausableHandler($(IDS.AVAILABLE_ZCARDS), 'click', this.onZcardClicked.bind(this));
    };
    GameBody.prototype.setup = function (gamedatas) {
        _super.prototype.setup.call(this, gamedatas);
        this.playerNumber = gamedatas.players[this.player_id].player_number;
        this.setupGameHtml();
        console.log('setting the the game board');
        this.setupGameBoard(gamedatas.board, gamedatas.players);
        console.log('setting up player boards');
        for (var playerId in gamedatas.players) {
            this.setupPlayerBoard(gamedatas.players[playerId]);
        }
        console.log('setting up player hand');
        this.hand = gamedatas.hand;
        this.renderHand();
        this.setupAvailableZcards(gamedatas.ziggurat_cards);
        console.log("setting up handlers");
        this.setupHandlers();
        this.bgaSetupPromiseNotifications();
        console.log('Game setup done');
    };
    GameBody.prototype.hexLocation = function (hex) {
        var hstart = 38.0; // this is related to board width but not sure how
        var vstart = 9.0; // depends on board size too
        var height = 768 / 12.59;
        var width = height * 1.155;
        var hdelta = 0.75 * width + 2.0;
        var vdelta = 1.0 * height + 2.0;
        return {
            top: vstart + hex.row * vdelta / 2,
            left: hstart + hex.col * hdelta,
        };
    };
    GameBody.prototype.setupGameBoard = function (boardData, playersData) {
        var boardDiv = $(IDS.BOARD);
        // console.log(gamedatas.board);
        for (var _i = 0, boardData_1 = boardData; _i < boardData_1.length; _i++) {
            var hex = boardData_1[_i];
            var tl = this.hexLocation(hex);
            this.appendHtml(this.format_block('jstpl_hex', {
                row: hex.row,
                col: hex.col,
                // or ... row / 2 * 63 + 6;
                top: tl.top,
                left: tl.left,
            }), boardDiv);
            if (hex.piece != null) {
                var n = (hex.board_player == 0)
                    ? null
                    : playersData[hex.board_player].player_number;
                this.renderPlayedPiece(hex, hex.piece, n);
            }
        }
    };
    GameBody.prototype.setupAvailableZcards = function (zcards) {
        console.log('Setting up available ziggurat cards', zcards);
        this.zcards = zcards;
        for (var z = 0; z < zcards.length; ++z) {
            var id = IDS.availableZcard(z);
            if (zcards[z].owning_player_id != 0) {
                this.addZcardDivInPlayerBoard(z);
                // also "shell" in available cards
                this.appendHtml("<div id='".concat(id, "'></div>"), document.getElementById(IDS.AVAILABLE_ZCARDS));
            }
            else {
                // just in available cards
                this.addZigguratCardDiv(id, document.getElementById(IDS.AVAILABLE_ZCARDS), z);
            }
        }
    };
    GameBody.prototype.addZcardDivInPlayerBoard = function (z) {
        this.addZigguratCardDiv(IDS.ownedZcard(z), IDS.playerBoardZcards(this.zcards[z].owning_player_id), z);
    };
    GameBody.prototype.indexOfZcard = function (cardType) {
        for (var z = 0; z < this.zcards.length; ++z) {
            if (this.zcards[z].type == cardType) {
                return z;
            }
        }
        return -1;
    };
    GameBody.prototype.addZigguratCardDiv = function (id, parentElem, z) {
        var cls = CSS.zcard(this.zcards[z].type, this.zcards[z].used);
        var div = this.appendHtml("<div id='".concat(id, "' class='").concat(cls, "'></div>"), parentElem);
        this.addTooltip(id, this.zcards[z].tooltip, '');
        // div.title = this.zcards[z].tooltip;
    };
    GameBody.prototype.setupGameHtml = function () {
        document.getElementById('game_play_area').insertAdjacentHTML('beforeend', "\n      <div id=\"bbl_main\">\n        <div id=\"bbl_hand_container\">\n          <div id=\"".concat(IDS.HAND, "\"></div>\n        </div>\n        <div id=\"").concat(IDS.BOARD_CONTAINER, "\">\n          <div id=\"").concat(IDS.BOARD, "\"></div>\n          <span id=\"bbl_vars\"></span>\n        </div>\n        <div id=\"").concat(IDS.AVAILABLE_ZCARDS, "\"></div>\n     </div>\n"));
    };
    GameBody.prototype.updateCounter = function (counter, value, animate) {
        if (animate) {
            counter.toValue(value);
        }
        else {
            counter.setValue(value);
        }
    };
    GameBody.prototype.updateHandCount = function (player, animate) {
        if (animate === void 0) { animate = true; }
        this.updateCounter(this.handCounters[player.player_id], player.hand_size, animate);
    };
    GameBody.prototype.updatePoolCount = function (player, animate) {
        if (animate === void 0) { animate = true; }
        this.updateCounter(this.poolCounters[player.player_id], player.pool_size, animate);
    };
    GameBody.prototype.updateCapturedCityCount = function (player, animate) {
        if (animate === void 0) { animate = true; }
        this.updateCounter(this.cityCounters[player.player_id], player.captured_city_count, animate);
    };
    GameBody.prototype.hexDiv = function (rc) {
        return $(IDS.hexDiv(rc));
    };
    GameBody.prototype.handPosDiv = function (i) {
        var id = IDS.handPos(i);
        var div = $(id);
        if (div != null) {
            return div;
        }
        // dynamically extend hand as needed.
        var hand = $(IDS.HAND);
        for (var j = 0; j <= i; ++j) {
            var id_1 = IDS.handPos(j);
            if ($(id_1) == null) {
                this.appendHtml("<div id='".concat(id_1, "' class='").concat(CSS.EMPTY, "'/>"), hand);
            }
        }
        return $(id);
    };
    GameBody.prototype.renderPlayedPiece = function (rc, piece, playerNumber) {
        this.hexDiv(rc).className = CSS.piece(piece, playerNumber);
    };
    GameBody.prototype.renderHand = function () {
        for (var i = 0; i < this.hand.length; ++i) {
            this.handPosDiv(i).className = CSS.handPiece(this.hand[i], this.playerNumber);
        }
    };
    // Returns the hex (row,col) clicked on, or null if not a playable hex
    GameBody.prototype.selectedHex = function (target) {
        var e = target;
        while (e.parentElement != null && e.parentElement.id != IDS.BOARD) {
            e = e.parentElement;
        }
        if (e.parentElement == null) {
            console.warn('no hex');
            return null;
        }
        // now check if it's allowed
        var ae = e;
        if (!ae.classList.contains(CSS.PLAYABLE)) {
            // console.log('not playable');
            return null;
        }
        var id = e.id.split('_');
        return {
            row: Number(id[2]),
            col: Number(id[3]),
        };
    };
    GameBody.prototype.selectHexToScore = function (event) {
        var hex = this.selectedHex(event.target);
        if (hex == null) {
            return;
        }
        // console.log('selected hex ' + hex.row + ',' + hex.col);
        var rc = {
            row: hex.row,
            col: hex.col
        };
        this.bgaPerformAction('actSelectHexToScore', rc).then(function () {
        });
        this.unmarkHexPlayable(rc);
    };
    GameBody.prototype.playSelectedPiece = function (event) {
        var _this = this;
        if (this.selectedHandPos == null) {
            console.error('no piece selected!');
        }
        var hex = this.selectedHex(event.target);
        if (hex == null) {
            return;
        }
        // console.log('selected hex ' + hex.row + ',' + hex.col);
        this.bgaPerformAction('actPlayPiece', {
            handpos: this.selectedHandPos,
            row: hex.row,
            col: hex.col
        }).then(function () {
            _this.unmarkHexPlayable({
                row: hex.row,
                col: hex.col
            });
        });
        this.unselectAllHandPieces();
    };
    GameBody.prototype.onBoardClicked = function (event) {
        console.log('onBoardClicked:' + event.target.id);
        event.preventDefault();
        event.stopPropagation();
        if (!this.isCurrentPlayerActive()) {
            return false;
        }
        switch (this.currentState) {
            case 'client_pickHexToPlay':
                this.playSelectedPiece(event);
                break;
            case 'selectHexToScore':
                // this.selectHexToScore(event);
                break;
        }
        return false;
    };
    GameBody.prototype.onZcardClicked = function (event) {
        console.log('onZcardClicked', event);
        event.preventDefault();
        event.stopPropagation();
        if (!this.isCurrentPlayerActive()) {
            return false;
        }
        if (this.currentState != 'selectZigguratCard') {
            return false;
        }
        var tid = event.target.id;
        var z = -1;
        for (var i = 0; i < this.zcards.length; ++i) {
            if (tid == IDS.availableZcard(i)) {
                z = i;
                break;
            }
        }
        if (z < 0) {
            console.error("couldn't determine zcard from ", tid);
            return false;
        }
        this.bgaPerformAction('actSelectZigguratCard', { zctype: this.zcards[z].type });
        var div = $(IDS.AVAILABLE_ZCARDS);
        div.classList.remove(CSS.SELECTING);
        return false;
    };
    GameBody.prototype.allowedMovesFor = function (pos) {
        var piece = this.hand[pos];
        if (piece == null) {
            return [];
        }
        return this.stateArgs.allowedMoves[piece] || [];
    };
    GameBody.prototype.markHexPlayable = function (rc) {
        this.hexDiv(rc).classList.add(CSS.PLAYABLE);
    };
    GameBody.prototype.unmarkHexPlayable = function (rc) {
        this.hexDiv(rc).classList.remove(CSS.PLAYABLE);
    };
    GameBody.prototype.markScoreableHexesPlayable = function (hexes) {
        var _this = this;
        hexes.forEach(function (rc) { return _this.markHexPlayable(rc); });
    };
    GameBody.prototype.markHexesPlayableForPiece = function (pos) {
        var _this = this;
        this.allowedMovesFor(pos).forEach(function (rc) { return _this.markHexPlayable(rc); });
    };
    GameBody.prototype.unmarkHexesPlayableForPiece = function (pos) {
        var _this = this;
        this.allowedMovesFor(pos).forEach(function (rc) { return _this.unmarkHexPlayable(rc); });
    };
    GameBody.prototype.unselectAllHandPieces = function () {
        for (var p = 0; p < this.hand.length; ++p) {
            var cl = $(IDS.handPos(p)).classList;
            if (cl.contains(CSS.SELECTED)) {
                this.unmarkHexesPlayableForPiece(p);
            }
            cl.remove(CSS.SELECTED);
            cl.remove(CSS.PLAYABLE);
            cl.remove(CSS.UNPLAYABLE);
        }
        this.selectedHandPos = null;
    };
    GameBody.prototype.setPlayablePieces = function () {
        for (var p = 0; p < this.hand.length; ++p) {
            var cl = $(IDS.handPos(p)).classList;
            if (this.allowedMovesFor(p).length > 0) {
                cl.add(CSS.PLAYABLE);
                cl.remove(CSS.UNPLAYABLE);
            }
            else {
                cl.remove(CSS.PLAYABLE);
                cl.add(CSS.UNPLAYABLE);
            }
        }
    };
    GameBody.prototype.setStatusBarForPlayState = function () {
        var _this = this;
        if (!this.isCurrentPlayerActive()) {
            return;
        }
        this.selectedHandPos = null;
        if (this.stateArgs.canEndTurn) {
            if (this.stateArgs.allowedMoves.length == 0) {
                this.setClientState('client_noPlaysLeft', {
                    descriptionmyturn: _('${you} must end your turn'),
                });
            }
            else {
                this.setClientState('client_selectPieceOrEndTurn', {
                    descriptionmyturn: _('${you} may select a piece to play or end your turn'),
                });
                this.setPlayablePieces();
            }
            this.addActionButton('end-btn', 'End turn', function () {
                _this.unselectAllHandPieces();
                _this.bgaPerformAction('actDonePlayPieces');
            });
        }
        else {
            this.setClientState('client_mustSelectPiece', {
                descriptionmyturn: _('${you} must select a piece to play'),
            });
            this.setPlayablePieces();
        }
        if (this.stateArgs.canUndo) {
            this.addActionButton('undo-btn', 'Undo', function () { return _this.bgaPerformAction('actUndoPlay'); });
        }
    };
    GameBody.prototype.onHandClicked = function (ev) {
        var _this = this;
        console.log('onHandClicked', ev);
        ev.preventDefault();
        ev.stopPropagation();
        if (this.inFlight > 0) {
            return false;
        }
        if (!this.isCurrentPlayerActive()) {
            return false;
        }
        if (this.currentState != 'client_selectPieceOrEndTurn'
            && this.currentState != 'client_pickHexToPlay'
            && this.currentState != 'client_mustSelectPiece') {
            return false;
        }
        var selectedDiv = ev.target;
        if (selectedDiv.parentElement.id != IDS.HAND) {
            return false;
        }
        var handpos = Number(selectedDiv.id.split('_')[2]);
        if (this.allowedMovesFor(handpos).length == 0) {
            return false;
        }
        var playable = false;
        if (!selectedDiv.classList.contains(CSS.SELECTED)) {
            this.unselectAllHandPieces();
            this.markHexesPlayableForPiece(handpos);
            playable = true;
        }
        else {
            this.unmarkHexesPlayableForPiece(handpos);
        }
        selectedDiv.classList.toggle(CSS.SELECTED);
        if (playable) {
            this.selectedHandPos = handpos;
            if (this.currentState != 'client_pickHexToPlay') {
                this.setClientState('client_pickHexToPlay', {
                    descriptionmyturn: _('${you} must select a hex to play to'),
                });
                this.addActionButton('cancel-btn', 'Cancel', function () {
                    _this.unselectAllHandPieces();
                    _this.setStatusBarForPlayState();
                });
            }
        }
        else {
            this.setStatusBarForPlayState();
        }
        return false;
    };
    GameBody.prototype.appendHtml = function (html, parent) {
        dojo.place(html, parent);
        // const div = document.createElement('div');
        // div.innerHTML = html;
        // const frag = document.createDocumentFragment();
        // var fc: Node;
        // while ((fc = div.firstChild)) { // intentional assignment
        //   parent.append(fc);
        // }
    };
    GameBody.prototype.setupPlayerBoard = function (player) {
        var playerId = player.player_id;
        console.log('Setting up board for player ' + playerId);
        this.appendHtml(this.format_block('jstpl_player_board_ext', {
            player_id: playerId,
            player_number: player.player_number
        }), this.getPlayerPanelElement(playerId));
        //    create counters per player
        this.handCounters[playerId] = new ebg.counter();
        this.handCounters[playerId].create(IDS.handcount(playerId));
        this.poolCounters[playerId] = new ebg.counter();
        this.poolCounters[playerId].create(IDS.poolcount(playerId));
        this.cityCounters[playerId] = new ebg.counter();
        this.cityCounters[playerId].create(IDS.citycount(playerId));
        this.updateHandCount(player, false);
        this.updatePoolCount(player, false);
        this.updateCapturedCityCount(player, false);
    };
    GameBody.prototype.onUpdateActionButtons_chooseExtraTurn = function (args) {
        var _this = this;
        this.addActionButton('extra-turn-btn', 'Take your one-time extra turn', function () { return _this.bgaPerformAction('actChooseExtraTurn', {
            take_extra_turn: true
        }); });
        this.addActionButton('noextra-turn-btn', 'Just finish your turn', function () { return _this.bgaPerformAction('actChooseExtraTurn', {
            take_extra_turn: false
        }); });
    };
    GameBody.prototype.onUpdateActionButtons_endOfTurnScoring = function (args) {
        this.markAllHexesUnplayable();
    };
    GameBody.prototype.onUpdateActionButtons_selectZigguratCard = function (args) {
        var div = $(IDS.AVAILABLE_ZCARDS);
        div.scrollIntoView(false);
        div.classList.add(CSS.SELECTING);
        this.updateStatusBar(_('You must select a ziggurat card'));
    };
    GameBody.prototype.onUpdateActionButtons_playPieces = function (args) {
        this.setStatusBarForPlayState();
        this.markAllHexesUnplayable();
    };
    GameBody.prototype.onUpdateActionButtons_selectHexToScore = function (args) {
        this.markScoreableHexesPlayable(args.hexes);
    };
    GameBody.prototype.markAllHexesUnplayable = function () {
        $(IDS.BOARD).querySelectorAll('.' + CSS.PLAYABLE)
            .forEach(function (div) { return div.classList.remove(CSS.PLAYABLE); });
    };
    GameBody.prototype.setupNotifications = function () {
        for (var m in this) {
            if (typeof this[m] == "function" && m.startsWith("notif_")) {
                dojo.subscribe(m.substring(6), this, m);
            }
        }
    };
    GameBody.prototype.notif_turnFinished = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log('notif_turnFinished', args);
                this.updateHandCount(args);
                this.updatePoolCount(args);
                return [2 /*return*/, Promise.resolve()];
            });
        });
    };
    GameBody.prototype.notif_undoMove = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var isActive, targetDivId, handPosDiv, onDone;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('notif_undoMove', args);
                        isActive = this.playerNumber == args.player_number;
                        targetDivId = IDS.handcount(args.player_id);
                        handPosDiv = null;
                        if (isActive) {
                            this.hand[args.handpos] = args.original_piece;
                            handPosDiv = this.handPosDiv(args.handpos);
                            targetDivId = handPosDiv.id;
                        }
                        // Put any piece (field) captured in the move back on the board
                        // TODO: animate this? (and animate the capture too?)
                        this.renderPlayedPiece(args, args.captured_piece, null);
                        onDone = function () {
                            if (isActive) {
                                var cl = handPosDiv.classList;
                                cl.remove(CSS.EMPTY);
                                cl.add(CSS.PLAYABLE);
                                cl.add(CSS.handPiece(args.original_piece, _this.playerNumber));
                            }
                            _this.handCounters[args.player_id].incValue(1);
                            _this.scoreCtrl[args.player_id].incValue(-args.points);
                        };
                        return [4 /*yield*/, this.play(new BgaSlideTempAnimation({
                                className: CSS.handPiece(args.piece, args.player_number),
                                fromId: IDS.hexDiv(args),
                                toId: targetDivId,
                                parentId: IDS.BOARD
                            })).then(onDone)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    GameBody.prototype.notif_piecePlayed = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var isActive, sourceDivId, hpc, handPosDiv, cl, onDone;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('notif_piecePlayed', args);
                        isActive = this.playerNumber == args.player_number;
                        sourceDivId = IDS.handcount(args.player_id);
                        hpc = CSS.handPiece(args.piece, args.player_number);
                        if (isActive) {
                            this.hand[args.handpos] = null;
                            handPosDiv = this.handPosDiv(args.handpos);
                            sourceDivId = handPosDiv.id;
                            cl = handPosDiv.classList;
                            cl.remove(hpc);
                            cl.add(CSS.EMPTY);
                        }
                        onDone = function () {
                            _this.renderPlayedPiece(args, args.piece, args.player_number);
                            _this.updateHandCount(args);
                            _this.scoreCtrl[args.player_id].incValue(args.points);
                        };
                        return [4 /*yield*/, this.play(new BgaSlideTempAnimation({
                                className: hpc,
                                fromId: sourceDivId,
                                toId: this.hexDiv(args).id,
                                parentId: IDS.BOARD
                            })).then(onDone)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    GameBody.prototype.notif_handRefilled = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var anim, pid, _loop_2, this_1, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('notif_handRefilled', args);
                        anim = [];
                        pid = this.player_id;
                        _loop_2 = function () {
                            if (this_1.hand[i] == null) {
                                this_1.hand[i] = args.hand[i];
                            }
                            var div = this_1.handPosDiv(i);
                            var hc = CSS.handPiece(this_1.hand[i], this_1.playerNumber);
                            if (hc != CSS.EMPTY && div.classList.contains(CSS.EMPTY)) {
                                var a = new BgaSlideTempAnimation({
                                    className: hc,
                                    fromId: IDS.handcount(pid),
                                    toId: div.id,
                                    parentId: IDS.BOARD,
                                    animationEnd: function () { div.className = hc; },
                                });
                                anim.push(a);
                            }
                        };
                        this_1 = this;
                        for (i = 0; i < args.hand.length; ++i) {
                            _loop_2();
                        }
                        return [4 /*yield*/, this.play(new BgaCompoundAnimation({
                                animations: anim,
                                mode: 'sequential',
                            }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    GameBody.prototype.notif_extraTurnUsed = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var z, carddiv;
            return __generator(this, function (_a) {
                console.log('notif_extraTurnUsed', args);
                z = this.indexOfZcard(args.card);
                if (z < 0) {
                    console.error("Couldn't find ${args.card} zcard");
                }
                else {
                    this.zcards[z].used = args.used;
                    carddiv = $(IDS.ownedZcard(z));
                    if (carddiv == undefined) {
                        console.error("Could not find div for owned ".concat(args.card, " card"), z, this.zcards[z]);
                    }
                    else {
                        carddiv.className = CSS.zcard(null, true);
                    }
                }
                return [2 /*return*/, Promise.resolve()];
            });
        });
    };
    GameBody.prototype.notif_zigguratCardSelection = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var z, id;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('notif_zigguratCardSelection', args);
                        z = this.indexOfZcard(args.card);
                        if (!(z < 0)) return [3 /*break*/, 1];
                        console.error("Couldn't find ${args.card} zcard");
                        return [2 /*return*/, Promise.resolve()];
                    case 1:
                        this.zcards[z].owning_player_id = args.player_id;
                        this.zcards[z].used = args.cardused;
                        this.scoreCtrl[args.player_id].toValue(args.score);
                        id = IDS.availableZcard(z);
                        // mark the available zig card spot as 'taken'
                        $(id).className = "";
                        this.removeTooltip(id);
                        return [4 /*yield*/, this.play(new BgaSlideTempAnimation({
                                className: CSS.zcard(this.zcards[z].type, false),
                                fromId: id,
                                toId: IDS.playerBoardZcards(args.player_id),
                                parentId: IDS.AVAILABLE_ZCARDS,
                            })).then(function () { return _this.addZcardDivInPlayerBoard(z); })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    GameBody.prototype.notif_cityScored = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var anim, _loop_3, this_2, playerId;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('notif_cityScored', args);
                        anim = [];
                        _loop_3 = function (playerId) {
                            var details = args.details[playerId];
                            var nonscoringLocations = [];
                            var _loop_4 = function (nh) {
                                if (!details.scored_locations.some(function (sh) { return (nh.row == sh.row && nh.col == sh.col); })) {
                                    nonscoringLocations.push(nh);
                                }
                            };
                            for (var _i = 0, _b = details.network_locations; _i < _b.length; _i++) {
                                var nh = _b[_i];
                                _loop_4(nh);
                            }
                            anim.push(new BgaCompoundAnimation({
                                mode: 'parallel',
                                animationStart: function () {
                                    for (var _i = 0, _a = details.scored_locations; _i < _a.length; _i++) {
                                        var rc = _a[_i];
                                        _this.hexDiv(rc).classList.add(CSS.SELECTED);
                                    }
                                },
                                animations: details.network_locations.map(function (rc) { return new BgaFadeAnimation({
                                    element: _this.hexDiv(rc),
                                    duration: 1400,
                                    kind: 'outin',
                                    iterations: 2,
                                }); }),
                            }));
                            anim.push(new BgaCompoundAnimation({
                                mode: 'parallel',
                                animations: nonscoringLocations.map(function (rc) { return new BgaFadeAnimation({
                                    element: _this.hexDiv(rc),
                                    duration: 500,
                                    kind: 'out',
                                }); }),
                            }));
                            // TODO: should be spin/grow with score
                            anim.push(new BgaSpinGrowAnimation({
                                className: '',
                                text: "+".concat(details.network_points),
                                centeredOnId: IDS.hexDiv(args),
                                parentId: IDS.BOARD,
                                color: '#' + this_2.gamedatas.players[playerId].player_color,
                                duration: 2500,
                            }));
                            anim.push(new BgaCompoundAnimation({
                                mode: 'parallel',
                                animations: nonscoringLocations.map(function (rc) { return new BgaFadeAnimation({
                                    element: _this.hexDiv(rc),
                                    duration: 500,
                                    kind: 'in',
                                }); }),
                                animationEnd: function () {
                                    details.scored_locations.forEach(function (rc) { return _this.hexDiv(rc).classList.remove(CSS.SELECTED); });
                                    _this.scoreCtrl[playerId].incValue(details.network_points);
                                },
                            }));
                        };
                        this_2 = this;
                        for (playerId in args.details) {
                            _loop_3(playerId);
                        }
                        anim.push(new BgaSlideTempAnimation({
                            animationStart: function () {
                                _this.renderPlayedPiece(args, null, null);
                            },
                            animationEnd: function () {
                                _this.renderPlayedPiece(args, null, null);
                                for (var playerId in args.details) {
                                    var details = args.details[playerId];
                                    _this.scoreCtrl[playerId].incValue(details.capture_points);
                                    _this.updateCapturedCityCount(details);
                                }
                            },
                            className: CSS.piece(args.city),
                            fromId: IDS.hexDiv(args),
                            toId: (args.captured_by != 0)
                                ? IDS.citycount(args.captured_by)
                                // TODO: find a better location for 'off the board'
                                : IDS.AVAILABLE_ZCARDS,
                            parentId: IDS.BOARD,
                        }));
                        return [4 /*yield*/, this.play(new BgaCompoundAnimation({
                                mode: 'sequential',
                                animations: anim,
                            }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ///////
    /* @Override */
    GameBody.prototype.format_string_recursive = function (log, args) {
        var defargs = function (key) {
            var _a;
            return _a = {}, _a[key] = args[key], _a;
        };
        var saved = {};
        var defModify = function (x) { return x; };
        try {
            if (log && args && !args.processed) {
                args.processed = true;
                for (var _i = 0, _a = Object.keys(special_log_args); _i < _a.length; _i++) {
                    var key = _a[_i];
                    if (key in args) {
                        saved[key] = args[key];
                        var s = special_log_args[key];
                        args[key] = this.format_block(s.tmpl, s.tmplargs(args));
                    }
                }
            }
        }
        catch (e) {
            console.error(log, args, 'Exception thrown', e.stack);
        }
        try {
            return this.inherited(arguments);
            //                return super.format_string_recursive(log, args);
        }
        finally {
            for (var i in saved) {
                args[i] = saved[i];
            }
        }
    };
    return GameBody;
}(GameBasics));
define([
    "dojo",
    "dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter"
], function (dojo, declare) {
    declare("bgagame.babylonia", ebg.core.gamegui, new GameBody());
});
