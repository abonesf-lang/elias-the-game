// levelup.js — Level-up fanfare screen and boss intro
const LevelUp = {
    active: false,
    level: 0,
    timer: 0,
    duration: 3.0,
    bossWarning: false,

    show(level, isBossLevel) {
        this.active = true;
        this.level = level;
        this.timer = this.duration;
        this.bossWarning = !!isBossLevel;
    },

    update(dt) {
        if (!this.active) return;
        this.timer -= dt;
        if (this.timer <= 0) this.active = false;
    },

    draw(ctx, canvasW, canvasH) {
        if (!this.active) return;

        const progress = this.timer / this.duration;
        const alpha = progress > 0.85 ? (1 - progress) * 6.67 : (progress > 0.15 ? 1 : progress * 6.67);

        ctx.globalAlpha = alpha;

        if (this.bossWarning) {
            // Boss level — dramatic red overlay
            ctx.fillStyle = 'rgba(60,0,0,0.85)';
            ctx.fillRect(0, 0, canvasW, canvasH);

            ctx.fillStyle = '#ff2020';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ ADVARSEL ⚠', canvasW / 2, canvasH / 2 - 28);

            ctx.fillStyle = '#ffd000';
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillText(`LEVEL ${this.level}`, canvasW / 2, canvasH / 2 - 10);

            ctx.fillStyle = '#ff8060';
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.fillText('🐉 EN DRAGE NÆRMER SEG! 🐉', canvasW / 2, canvasH / 2 + 8);

            ctx.fillStyle = '#ffaaaa';
            ctx.font = '4px "Press Start 2P", monospace';
            ctx.fillText('Gjør deg klar for kamp!', canvasW / 2, canvasH / 2 + 24);

        } else {
            // Regular level-up — cheerful yellow
            ctx.fillStyle = 'rgba(0,20,0,0.80)';
            ctx.fillRect(0, 0, canvasW, canvasH);

            // Stars
            for (let i = 0; i < 20; i++) {
                const tx = (Date.now() * 0.0003 + i * 0.618) % 1;
                const ty = (i * 0.137 + (1 - progress) * 0.5) % 1;
                ctx.fillStyle = ['#ffff00', '#ffffff', '#ff80ff'][i % 3];
                ctx.fillRect(tx * canvasW, ty * canvasH, 2, 2);
            }

            ctx.fillStyle = '#ffe040';
            ctx.font = '11px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL OPP!', canvasW / 2, canvasH / 2 - 20);

            ctx.fillStyle = '#80ff80';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText(`⭐ Level ${this.level} ⭐`, canvasW / 2, canvasH / 2 + 2);

            ctx.fillStyle = '#a0c0a0';
            ctx.font = '4px "Press Start 2P", monospace';
            ctx.fillText('HP gjenopprettet!  +5 Max HP', canvasW / 2, canvasH / 2 + 20);
        }

        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }
};

// Boss power award screen
const PowerAward = {
    active: false,
    power: null,
    timer: 0,

    show(power) {
        this.active = true;
        this.power = power;
        this.timer = 4.5;
    },

    update(dt) {
        if (!this.active) return;
        this.timer -= dt;
        if (this.timer <= 0) this.active = false;
    },

    draw(ctx, canvasW, canvasH) {
        if (!this.active || !this.power) return;
        const progress = this.timer / 4.5;
        const alpha = progress > 0.9 ? (1 - progress) * 10 : (progress > 0.1 ? 1 : progress * 10);
        ctx.globalAlpha = alpha;

        ctx.fillStyle = 'rgba(10,0,20,0.92)';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Power glow
        ctx.fillStyle = this.power.color + '40';
        ctx.beginPath();
        ctx.arc(canvasW / 2, canvasH / 2 - 10, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd000';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🐉 DRAGEN ER BESEIRET! 🐉', canvasW / 2, canvasH / 2 - 44);

        ctx.fillStyle = this.power.color;
        ctx.font = '18px monospace';
        ctx.fillText(this.power.icon, canvasW / 2, canvasH / 2 - 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText('Ny kraft!: ' + this.power.name, canvasW / 2, canvasH / 2 + 8);

        // Description
        const words = this.power.desc.split(' ');
        let line = '', lineY = canvasH / 2 + 22;
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.fillStyle = '#c0c0e0';
        for (const w of words) {
            const test = line + (line ? ' ' : '') + w;
            if (ctx.measureText(test).width > canvasW - 20 && line) {
                ctx.fillText(line, canvasW / 2, lineY);
                line = w; lineY += 9;
            } else line = test;
        }
        if (line) ctx.fillText(line, canvasW / 2, lineY);

        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }
};
