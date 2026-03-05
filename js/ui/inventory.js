// inventory.js — Inventory screen for items and powers
const Inventory = {
    active: false,
    cursorIndex: 0, // 0 to powers.length-1

    update(dt) {
        if (!this.active) return;

        // Navigation
        if (Input.isJust('ArrowLeft')) {
            this.cursorIndex = Math.max(0, this.cursorIndex - 1);
        }
        if (Input.isJust('ArrowRight')) {
            this.cursorIndex = Math.min(Game.player.powers.length - 1, this.cursorIndex + 1);
        }

        // Selection
        if (Input.isJust(' ') && Game.player.powers.length > 0) {
            Game.player.activePower = Game.player.powers[this.cursorIndex];
        }

        // Exit
        if (Input.isJust('b') || Input.isJust('B') || Input.isJust('Escape')) {
            this.active = false;
        }
    },

    draw(ctx, W, H) {
        if (!this.active) return;

        // Semi-transparent dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, W, H);

        const cx = W / 2;
        let y = 30;

        // Window background
        ctx.fillStyle = '#181820';
        ctx.strokeStyle = '#d8c080';
        ctx.lineWidth = 4;
        ctx.fillRect(20, 20, W - 40, H - 40);
        ctx.strokeRect(20, 20, W - 40, H - 40);
        ctx.lineWidth = 1;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Title
        ctx.fillStyle = '#ffcc00';
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText('👜 RYGGSEKK', cx, y);
        y += 30;

        // Items list
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('GJENSTANDER:', 40, y);
        y += 15;

        const items = Game.player.items;
        if (items.length === 0) {
            ctx.fillStyle = '#888888';
            ctx.fillText('Tomt...', 50, y);
            y += 15;
        } else {
            ctx.fillStyle = '#aaddff';
            // Count duplicates
            const counts = {};
            for (const it of items) counts[it] = (counts[it] || 0) + 1;

            let i = 0;
            for (const [name, qty] of Object.entries(counts)) {
                ctx.fillText(`- ${name} x${qty}`, 50, y);
                y += 15;
                if (++i > 4) { // show max 5 lines
                    ctx.fillText('  ...', 50, y);
                    y += 15;
                    break;
                }
            }
        }

        y += 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DRAGEKREFTER:', 40, y);
        y += 20;

        const powers = Game.player.powers;
        if (powers.length === 0) {
            ctx.fillStyle = '#888888';
            ctx.textAlign = 'center';
            ctx.fillText('Ingen krefter funnet ennå.', cx, y);
        } else {
            // Draw power boxes
            const boxW = 32;
            const spacing = 10;
            const totalW = powers.length * boxW + (powers.length - 1) * spacing;
            const startX = cx - totalW / 2;

            for (let i = 0; i < powers.length; i++) {
                const px = startX + i * (boxW + spacing);

                // Box background
                ctx.fillStyle = (i === this.cursorIndex) ? '#444466' : '#222233';
                ctx.fillRect(px, y, boxW, boxW);

                // Active highlight
                if (Game.player.activePower === powers[i]) {
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px - 2, y - 2, boxW + 4, boxW + 4);
                    ctx.fillStyle = '#00ff00';
                    ctx.textAlign = 'center';
                    ctx.font = '6px "Press Start 2P"';
                    ctx.fillText('AKTIV', px + boxW / 2, y - 10);
                } else if (i === this.cursorIndex) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px, y, boxW, boxW);
                }

                ctx.fillStyle = powers[i].color;
                ctx.fillRect(px + 6, y + 6, 20, 20); // Placeholder icon
            }

            y += boxW + 15;

            // Selected power details
            const selected = powers[this.cursorIndex];
            if (selected) {
                ctx.fillStyle = selected.color;
                ctx.textAlign = 'center';
                ctx.font = '10px "Press Start 2P"';
                ctx.fillText(selected.name, cx, y);
                y += 15;
                ctx.fillStyle = '#cccccc';
                ctx.font = '8px "Press Start 2P"';
                ctx.fillText(selected.desc, cx, y);
            }
        }

        // Footer hints
        ctx.fillStyle = '#888888';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('[PILTASTER] Velg   [SPACE] Aktiver', cx, H - 35);
        ctx.fillText('[B] Lukk', cx, H - 20);
    }
};
