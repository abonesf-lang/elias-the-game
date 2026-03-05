// npc.js — Friendly non-player characters and interactable chests

class NPC {
    constructor(x, y, name, dialogue) {
        this.x = x * TILE_SIZE + 2;
        this.y = y * TILE_SIZE;
        this.w = 12;
        this.h = 16;
        this.name = name;
        this.dialogue = dialogue;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    update(dt) {
        this.animTimer += dt;
        if (this.animTimer > 0.8) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }
    }

    draw(ctx) {
        const x = Math.floor(this.x);
        const y = Math.floor(this.y);
        const bob = this.animFrame === 0 ? 0 : 1;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x + 6, y + 17, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shoes
        ctx.fillStyle = '#302008';
        ctx.fillRect(x + 2, y + 13 + bob, 3, 3);
        ctx.fillRect(x + 7, y + 13 + bob, 3, 3);

        // Pants
        ctx.fillStyle = '#604020';
        ctx.fillRect(x + 2, y + 9 + bob, 8, 5);

        // Shirt (varied color by name)
        const shirtColor = this._colorFromName();
        ctx.fillStyle = shirtColor;
        ctx.fillRect(x + 1, y + 4 + bob, 10, 6);

        // Head
        ctx.fillStyle = '#e8c090';
        ctx.fillRect(x + 2, y + 0 + bob, 8, 5);

        // Eyes
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + 3, y + 1 + bob, 2, 2);
        ctx.fillRect(x + 7, y + 1 + bob, 2, 2);

        // Hair
        ctx.fillStyle = this._hairColorFromName();
        ctx.fillRect(x + 2, y + 0 + bob, 8, 2);

        // Speech bubble indicator (when close to player — drawn by HUD)
    }

    _colorFromName() {
        const colors = ['#4080c0', '#c04040', '#40a060', '#c09020', '#8040c0', '#808080'];
        let h = 0; for (const c of this.name) h += c.charCodeAt(0);
        return colors[h % colors.length];
    }

    _hairColorFromName() {
        const colors = ['#402010', '#101010', '#c0a000', '#c04020'];
        let h = 0; for (const c of this.name) h += c.charCodeAt(0) * 3;
        return colors[h % colors.length];
    }
}

class Chest {
    constructor(x, y, reward, label) {
        this.x = x * TILE_SIZE + 2;
        this.y = y * TILE_SIZE + 2;
        this.w = 12;
        this.h = 10;
        this.reward = reward;
        this.label = label;
        this.opened = false;
    }

    open() {
        if (!this.opened) {
            this.opened = true;
            return this.reward;
        }
        return null;
    }

    draw(ctx) {
        const x = Math.floor(this.x);
        const y = Math.floor(this.y);

        if (this.opened) {
            // Opened chest
            ctx.fillStyle = '#804020';
            ctx.fillRect(x, y + 4, 12, 6);
            ctx.fillStyle = '#602010';
            ctx.fillRect(x, y, 12, 4);
            ctx.strokeStyle = '#f0c020';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 12, 10);
        } else {
            // Closed chest (glowing slightly)
            ctx.fillStyle = '#905030';
            ctx.fillRect(x, y, 12, 10);
            ctx.fillStyle = '#704020';
            ctx.fillRect(x, y, 12, 4);
            // Metal clasp
            ctx.fillStyle = '#f0c020';
            ctx.fillRect(x + 4, y + 2, 4, 6);
            ctx.fillRect(x + 5, y + 3, 2, 4);
            // Glow
            ctx.globalAlpha = 0.2 + Math.sin(Date.now() * 0.003) * 0.1;
            ctx.fillStyle = '#ffe080';
            ctx.fillRect(x - 2, y - 2, 16, 14);
            ctx.globalAlpha = 1;
            // lock
            ctx.fillStyle = '#c0a000';
            ctx.fillRect(x + 5, y + 4, 2, 3);
        }
    }
}
