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

        // ── Minimap (Top Right)
        if (Game.state === STATE.OVERWORLD || Game.state === STATE.BOSS) {
            const mmSize = 60;
            const mmX = canvasW - mmSize - 10;
            const mmY = 10;

            ctx.fillStyle = '#111';
            ctx.fillRect(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4);

            const pc = Math.floor(player.x / TILE_SIZE);
            const pr = Math.floor(player.y / TILE_SIZE);

            // Draw a tiny 30x30 chunk of the worldmap around player
            const chunk = 30;
            const startC = Math.max(0, Math.min(WorldMap.cols - chunk, pc - chunk / 2));
            const startR = Math.max(0, Math.min(WorldMap.rows - chunk, pr - chunk / 2));

            const scale = mmSize / chunk;
            for (let dc = 0; dc < chunk; dc++) {
                for (let dr = 0; dr < chunk; dr++) {
                    const tile = WorldMap.get(startC + dc, startR + dr);
                    ctx.fillStyle = FullMap._getMapColor(tile);
                    ctx.fillRect(mmX + dc * scale, mmY + dr * scale, scale, scale);
                }
            }

            // Player dot
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(mmX + (pc - startC) * scale - 1, mmY + (pr - startR) * scale - 1, 3, 3);

            ctx.strokeStyle = '#d8c080';
            ctx.strokeRect(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4);
        }

        // ── Active Power ───────────────────────────────────────
        if (player.activePower) {
            const py = 10;
            const px = 10;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(px, py, 40, 40);
            ctx.strokeStyle = '#00ff00';
            ctx.strokeRect(px, py, 40, 40);

            ctx.fillStyle = player.activePower.color;
            ctx.fillRect(px + 10, py + 10, 20, 20); // Icon placeholder

            ctx.fillStyle = '#fff';
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('[F]', px + 20, py + 48);
            ctx.textAlign = 'left';
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
