// input.js — Keyboard state manager
const Input = {
    keys: {},

    init() {
        window.addEventListener('keydown', e => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'b', 'B', 'm', 'M', 'f', 'F', 'l', 'L', 'n', 'N', 'Escape', 'e', 'E', 'r', 'R', 's', 'S'].includes(e.key)) {
                e.preventDefault();
            }
            if (!this.keys[e.key] || !this.keys[e.key].held) {
                this.keys[e.key] = { held: true, just: true };
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.key] = { held: false, just: false };
        });
    },

    isDown(key) { return !!(this.keys[key]?.held); },
    isJust(key) { return !!(this.keys[key]?.just); },

    // Called at end of each frame to clear "just pressed" flags
    flush() {
        for (const k in this.keys) {
            if (this.keys[k]) this.keys[k].just = false;
        }
    },

    // One-time check: was any key pressed this frame
    anyJust() {
        return Object.values(this.keys).some(k => k?.just);
    }
};
