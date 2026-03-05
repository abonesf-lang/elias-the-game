// hud.js — Heads-up display overlay
const HUD = {
    // Floating EXP gain numbers
    floaters: [],

    addFloater(text, x, y, color) {
        this.floaters.push({ text, x, y, color: color || '#ffff00', life: 1.2, vy: -18 });
    },

    update(dt) {
        this.floaters = this.floaters.filter(f => f.life > 0);
        for (const f of this.floaters) {
            f.life -= dt;
            f.y += f.vy * dt;
        }
    },

    draw(ctx, player, canvasW, canvasH) {
        // ── Semi-transparent bottom HUD bar ────────────────────
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, canvasH - 40, canvasW, 40);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(0, canvasH - 41, canvasW, 1);

        // ── Level badge ─────────────────────────────────────────
        ctx.fillStyle = '#ffd000';
        ctx.fillStyle = 'rgba(255,208,0,0.9)';
        ctx.fillRect(8, canvasH - 34, 50, 28);
        ctx.fillStyle = '#1a1a00';
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LVL', 33, canvasH - 22);
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText(player.level, 33, canvasH - 10);
        ctx.textAlign = 'left';

        // ── HP hearts ───────────────────────────────────────────
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff6080';
        ctx.fillText('HP', 68, canvasH - 24);
        const heartW = 8;
        const maxHearts = Math.min(10, Math.ceil(player.maxHp / 4));
        for (let i = 0; i < maxHearts; i++) {
            const filled = (i + 1) * 4 <= player.hp;
            const half = !filled && i * 4 < player.hp;
            ctx.fillStyle = filled ? '#ff2040' : (half ? '#ff8090' : '#402030');
            ctx.fillRect(68 + i * (heartW + 2), canvasH - 16, heartW, 7);
            if (!filled) {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(68 + i * (heartW + 2), canvasH - 16, heartW, 7);
            }
            // crack line on empty
            if (!filled && !half) {
                ctx.fillStyle = '#5a2030';
                ctx.fillRect(68 + i * (heartW + 2) + 3, canvasH - 16, 1, 7);
            }
        }

        // ── EXP bar ─────────────────────────────────────────────
        const expBarX = 68;
        const expBarY = canvasH - 7;
        const expBarW = canvasW - 76;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(expBarX, expBarY, expBarW, 5);
        ctx.fillStyle = '#40e080';
        const pct = Math.min(1, player.exp / player.expToNext);
        ctx.fillRect(expBarX, expBarY, Math.floor(expBarW * pct), 5);
        // EXP label
        ctx.fillStyle = '#60c090';
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${player.exp}/${player.expToNext} EXP`, canvasW - 4, expBarY + 4);
        ctx.textAlign = 'left';

        // ── Special powers ───────────────────────────────────────
        if (player.powers.length > 0) {
            const py = canvasH - 34;
            for (let i = 0; i < player.powers.length; i++) {
                const pw = player.powers[i];
                ctx.font = '9px monospace';
                ctx.fillText(pw.icon, canvasW - 14 - i * 14, py + 8);
            }
        }

        // ── Floating EXP gain numbers (drawn in world space, scaled) ──
        // (These are in HUD coords mapped from world by caller)
    },

    drawWorldFloaters(ctx, cam) {
        ctx.save();
        ctx.scale(cam.scale, cam.scale);
        ctx.translate(-Math.floor(cam.x), -Math.floor(cam.y));
        ctx.font = '5px "Press Start 2P", monospace';
        for (const f of this.floaters) {
            ctx.globalAlpha = Math.min(1, f.life * 1.5);
            ctx.fillStyle = f.color;
            ctx.textAlign = 'center';
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
        ctx.restore();
    },

    // Interaction prompt above NPC or door
    drawPrompt(ctx, screenX, screenY, text) {
        ctx.fillStyle = 'rgba(20,20,20,0.85)';
        ctx.fillRect(screenX - 30, screenY - 20, 60, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, screenX, screenY - 9);
        ctx.textAlign = 'left';
    },

    drawLocationBanner(ctx, text, alpha, canvasW) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 6, canvasW, 18);
        ctx.fillStyle = '#ffe080';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvasW / 2, 19);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }
};
