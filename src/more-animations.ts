import { BgaAnimations } from './libs';

export type AnimationList = (() => Promise<any>)[];

type AnimationManager = InstanceType<typeof BgaAnimations.Manager>;

export class MoreAnimations {

    private animationManager: AnimationManager;
    constructor(animationManager: AnimationManager) {
        this.animationManager = animationManager;
    }

    async wait(millis: number): Promise<any> {
        return this.animationManager.base.wait(millis);
    }

    async slideAndAttach(elem: HTMLElement, newParent: HTMLElement,
        settings?: { bump?: number,
                     duration?: number,
                     toPlaceholder?: 'on' | 'grow' |  'off',
                     fromPlaceholder?: 'on' | 'shrink' | 'off' }): Promise<any> {
        if (elem.parentElement == newParent) {
            return Promise.resolve();
        }
        return this.animationManager.slideAndAttach(elem, newParent, settings);
    }

    async slideOutAndDestroy(elem?: HTMLElement | undefined,
        toElement?: HTMLElement | undefined): Promise<any> {
        if (!elem) {
            return Promise.resolve();
        }
        return this.animationManager.slideOutAndDestroy(elem, toElement, {});
    }

    async flash(css: string, elems: (HTMLElement | undefined)[], iterations: number = 2): Promise<any> {
        const on = () => {
            elems.forEach(e => e?.classList.add(css));
            return this.wait(400);
        }
        const off =  () => {
            elems.forEach(e => e?.classList.remove(css));
            return this.wait(400);
        }
        const anims: AnimationList = [];
        for (let i = 0; i < iterations; ++i) {
            anims.push(on, off);
        }
        return this.animationManager.playSequentially(anims);
    }

    private async animateAndCommit(anim: Animation): Promise<any> {
        return anim.finished.then(() => anim.commitStyles());
    }

    async rotateTo(el: HTMLElement, degrees: number): Promise<any> {
        if (!this.animationManager.animationsActive()) {
            el.style.transform = el.style.transform + ` rotate(${degrees}deg)`;
            return Promise.resolve(null);
        }
        return this.animateAndCommit(
            el.animate({ transform: [ `rotate(${degrees}deg)`] },{ duration: 700 }
        ));
    }

    async slideToObject(el: HTMLElement, target: HTMLElement, duration: number = 500): Promise<any> {
        const targetRect = target.getBoundingClientRect();
        const parRect = el.parentElement!.getBoundingClientRect();
        const newX = targetRect.left - parRect.left;
        const newY = targetRect.top - parRect.top;
        if (!this.animationManager.animationsActive()) {
            el.style.left = newX + "px";
            el.style.top = newY + "px";
            return Promise.resolve(null);
        }
        return this.animateAndCommit(
            el.animate({ left: newX + "px", top: newY + "px" }, { duration: duration  })
        );
    }

    async flip(front, back: HTMLElement, lift: string = 'scale(1.3,1.3) translate(-2.3vw,2.3vw)'): Promise<any> {
        const noflip = ' rotate(0deg)';
        const revflip = ' rotateY(-180deg)';
        const fwdflip = ' rotateY(180deg)';
        if (!this.animationManager.animationsActive()) {
            back.style.transform = fwdflip;
            return Promise.resolve(null);
        }

        // Initial states: the back of the tile is not flipped but the front face is
        const flipStyles = {
            'z-index': 100,
            'position': 'absolute',
            'backface-visibility': 'hidden',
        };
        Object.assign(back.style, flipStyles);
        Object.assign(front.style, flipStyles);

        const liftAndFlip = (el : Element, start: string, end: string) => {
            const anim = el.animate([
                { transform: start },
                { transform: lift + start },
                { transform: lift + end },
                { transform: end },
            ], 800);
            return anim.finished.then(() => anim.commitStyles());
        };
        return this.animationManager.playParallel([
            () => liftAndFlip(front, revflip, noflip),
            () => liftAndFlip(back, noflip, fwdflip),
        ]);
    }

    async fadeOutIn(element: HTMLElement, iterations: number = 1, durationSeconds: number = 0.7) : Promise<any> {
        if (!this.animationManager.animationsActive()) {
            return Promise.resolve(null);
        }
        return element.animate({ opacity: [ 1.0, 0.0, 1.0 ], offset: [0, 0.5, 1.0] }, // easing: [ "ease-in", "ease-in", "ease-in" ]},
                               { duration: durationSeconds * 1000, iterations: iterations }).finished;
    }

    async fadeOut(element: HTMLElement, durationSeconds: number = 0.3) : Promise<any> {
        if (!this.animationManager.animationsActive()) {
            element.style.opacity = '0.0';
            return Promise.resolve(null);
        }
        return this.animateAndCommit(
            element.animate({ opacity: [ 0.0 ], easing: 'linear' },
                            { duration: durationSeconds * 1000 })
        );
    }

    async fadeIn(element: HTMLElement, durationSeconds: number = 0.3) : Promise<any> {
        if (!this.animationManager.animationsActive()) {
            element.style.opacity = '';
            return Promise.resolve(null);
        }
        return this.animateAndCommit(
            element.animate({ opacity: [ 1.0 ], easing: 'linear' },
                            { duration: durationSeconds * 1000 })
        );
    }

    async slideToDefaultPos(element: HTMLElement, durationSeconds: number = 0.5) : Promise<any> {
        if (!this.animationManager.animationsActive()) {
            Object.assign(element.style, { left: '0', top: '0' });
            return Promise.resolve(null);
        }
        return this.animateAndCommit(
            element.animate({ left: [ 0.0 ], top: [ 0.0 ], easing: 'linear' },
                            { duration: durationSeconds * 1000 })
        );
    }

    async swapFirstChildren(elem: HTMLElement, other: HTMLElement) {
        const ghost1 = elem.firstElementChild ? null : elem.appendChild(document.createElement('span'));
        const ghost2 = other.firstElementChild ? null : other.appendChild(document.createElement('span'));
        return this.animationManager.swap([elem.firstElementChild as HTMLElement,
                                           other.firstElementChild as HTMLElement], {})
            .then(() => { ghost1?.remove(); ghost2?.remove(); });
    }
}