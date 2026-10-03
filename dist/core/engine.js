import { applyEconomyTick, updateReveals } from './economy.js';
import { trainingTick } from './models.js';
import { checkProjects } from './projects.js';
import { ambientTick, setPieceTick } from './events.js';
import { milestoneCheck } from './milestones.js';
import { checkStageTransition, dateTick } from './stages.js';
import { rivalTick } from './rival.js';
import { politicsTick } from './politics.js';
import { checkEndings } from './endings.js';
import { updateHint } from './hints.js';
import { REG } from './registry.js';
export const TICK = 0.1; // seconds of sim time per logic step
export const SLOW_EVERY = 10; // steps per slow tick
export const MAX_CATCHUP_MS = 60000;
export const AUTOSAVE_SECONDS = 30;
const CHART_EVERY = 5; // sim seconds between chart samples
const CHART_MAX = 400;
export class Engine {
    constructor(state) {
        this.speed = 1;
        this.running = false;
        this.acc = 0;
        this.last = 0;
        this.steps = 0;
        this.lastFrame = -Infinity;
        this.handlers = {};
        if (!REG.stages[1])
            throw new Error('content not registered (import content/index.js and call registerContent())');
        this.state = state;
        checkProjects(state);
        updateReveals(state);
    }
    on(ev, fn) {
        var _a;
        ((_a = this.handlers)[ev] ?? (_a[ev] = [])).push(fn);
    }
    emit(ev) {
        for (const fn of this.handlers[ev] ?? [])
            fn(this.state);
    }
    setState(s) {
        this.state = s;
        this.acc = 0;
        this.steps = 0;
        checkProjects(s);
        updateReveals(s);
    }
    /** One fixed logic step. */
    tick(dt = TICK) {
        const s = this.state;
        if (s.ending)
            return;
        if (s.modal?.kind === 'choice' && REG.events[s.modal.eventId]?.pauses)
            return;
        s.t += dt;
        applyEconomyTick(s, dt);
        trainingTick(s, dt);
        updateReveals(s);
        dateTick(s, dt);
        this.emit('tick');
        this.steps += 1;
        if (this.steps % SLOW_EVERY === 0)
            this.slowTick();
    }
    /** Once per sim second: reveals, scheduler, set pieces, stages, milestones, hint, autosave. */
    slowTick() {
        const s = this.state;
        checkProjects(s);
        milestoneCheck(s);
        setPieceTick(s);
        ambientTick(s);
        checkStageTransition(s);
        checkEndings(s);
        rivalTick(s, 1);
        politicsTick(s, 1);
        updateHint(s);
        s.counters.chartTimer += 1;
        if (s.counters.chartTimer >= CHART_EVERY) {
            s.counters.chartTimer = 0;
            s.chart.push([Math.round(s.dateDays * 10) / 10, s.model.capability, Math.round(s.rival.capability * 100) / 100]);
            if (s.chart.length > CHART_MAX)
                s.chart = s.chart.filter((_, i) => i % 2 === 0);
        }
        s.counters.saveTimer += 1;
        if (s.counters.saveTimer >= AUTOSAVE_SECONDS) {
            s.counters.saveTimer = 0;
            this.emit('autosave');
        }
        this.emit('slow');
    }
    /** Advance `seconds` of sim time in fixed steps (the sim bot, dev tools). */
    step(seconds) {
        const n = Math.round(seconds / TICK);
        for (let i = 0; i < n; i++)
            this.tick(TICK);
    }
    /** Browser loop: real time × speed, fixed steps, render at most every 100 ms. */
    start() {
        if (this.running)
            return;
        this.running = true;
        const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(() => cb(performance.now()), 16);
        this.last = performance.now();
        const frame = (now) => {
            if (!this.running)
                return;
            const real = Math.min(Math.max(0, now - this.last), MAX_CATCHUP_MS);
            this.last = now;
            this.acc += real * this.speed;
            while (this.acc >= TICK * 1000) {
                this.tick(TICK);
                this.acc -= TICK * 1000;
            }
            if (now - this.lastFrame >= 100) {
                this.lastFrame = now;
                this.emit('frame');
            }
            raf(frame);
        };
        raf(frame);
    }
    stop() {
        this.running = false;
    }
    /** Force a render on the next frame (after a player action). */
    requestFrame() {
        this.lastFrame = -Infinity;
    }
}
//# sourceMappingURL=engine.js.map