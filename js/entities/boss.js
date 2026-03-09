// boss.js — Dragon boss that appears every 10 levels

const DRAGON_POWERS = [
    { name: 'Ildpust', desc: 'Angrep brenner fiender og gir ekstra skade!', color: '#ff4400', icon: '🔥' },
    { name: 'Lygnsprang', desc: 'Du beveger deg med lynets hastighet!', color: '#ffe000', icon: '⚡' },
    { name: 'Iskappe', desc: 'Et iskoldt skjold beskytter deg!', color: '#80e0ff', icon: '❄️' },
    { name: 'Jordskjelv', desc: 'Kjeppslagene sender sjokkbølger i bakken!', color: '#c08040', icon: '🌍' },
    { name: 'Drageblod', desc: 'Du regenererer HP sakte over tid!', color: '#ff0080', icon: '💜' },
    { name: 'Skyggeskritt', desc: 'Du kan snike deg gjennom fiender!', color: '#6020a0', icon: '🌑' },
    { name: 'Stormvinge', desc: 'Kjeppen skaper virvelvind-angrep rundt deg!', color: '#80ffe0', icon: '🌀' },
    { name: 'Dragesang', desc: 'Alle kryp i nærheten faller i søvn!', color: '#ffc0ff', icon: '✨' },
    { name: 'Tidsstopp', desc: 'Fiender fryser et øyeblikk ved hvert angrep!', color: '#c0c0ff', icon: '⏳' },
    { name: 'Stjernekraft', desc: 'Superkraft! Alt skade doblet og uovervinnelig!', color: '#ffffff', icon: '⭐' },
];

class Boss {
    constructor(x, y, bossNumber) {
        this.x = x;
        this.y = y;
        this.w = 32 + (bossNumber - 1) * 8;
        this.h = 32 + (bossNumber - 1) * 8;
        this.bossNumber = bossNumber;

        // Scale with boss number (much harder scaling)
        const scale = 1 + (bossNumber - 1) * 0.8 + Math.pow(bossNumber * 0.3, 2);
        this.maxHp = Math.floor(150 * scale);
        this.hp = this.maxHp;
        this.atk = Math.floor(10 * scale);
        this.speed = 50 + bossNumber * 6;

        this.power = bossNumber <= DRAGON_POWERS.length ? DRAGON_POWERS[bossNumber - 1] : null;
        this.dead = false;
        this.deathTimer = 0;

        // Animation
        this.animTimer = 0;
        this.animFrame = 0;
        this.wingFlap = 0;
        this.hitFlash = 0;

        // Attack pattern
        this.attackTimer = 0;
        this.attackCooldown = 2.0;
        this.phase = 1;

        // Movement
        this.targetX = x;
        this.targetY = y;
        this.moveTimer = 0;
    }

    takeDamage(amount) {
        if (this.dead) return;
        this.hp -= amount;
        this.hitFlash = 0.2;
        if (this.hp < this.maxHp * 0.5) this.phase = 2;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            this.deathTimer = 2.0;
        }
    }

    update(dt, player) {
        if (this.dead) { this.deathTimer -= dt; return; }
        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.animTimer += dt;
        this.wingFlap += dt * (this.phase === 2 ? 4 : 2.5);

        // Move toward player (unless stealthed)
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            this.moveTimer = 1.5;
            if (player.isStealth) {
                this.targetX = this.x + (Math.random() - 0.5) * 100;
                this.targetY = this.y + (Math.random() - 0.5) * 100;
            } else {
                this.targetX = player.x + (Math.random() - 0.5) * 60;
                this.targetY = player.y + (Math.random() - 0.5) * 60;
            }
        }
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
            const spd = this.speed * dt;
            this.x += (dx / dist) * spd;
            this.y += (dy / dist) * spd;
        }

        // Attack player on contact
        const pdx = (player.x + player.w / 2) - (this.x + this.w / 2);
        const pdy = (player.y + player.h / 2) - (this.y + this.h / 2);
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        this.attackTimer -= dt;
        if (pdist < 28 && this.attackTimer <= 0) {
            player.takeDamage(this.atk);
            this.attackTimer = this.attackCooldown / (this.phase === 2 ? 1.5 : 1);
        }

        if (this.animTimer > 0.15) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
    }

    draw(ctx) {
        if (this.dead) {
            if (this.deathTimer > 0) this._drawDeathEffect(ctx);
            return;
        }

        const x = Math.floor(this.x);
        const y = Math.floor(this.y);
        const bob = Math.sin(this.wingFlap) * 2;

        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 4, y - 4 + bob, this.w + 8, this.h + 8);
            ctx.globalAlpha = 1;
            return;
        }

        if (Game.globalStunTimer > 0) ctx.filter = 'saturate(50%) hue-rotate(-30deg) brightness(120%)';

        // Phase 2 glow aura
        if (this.phase === 2) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ff4000';
            ctx.beginPath();
            ctx.ellipse(x + this.w / 2, y + this.h / 2 + bob, this.w * 0.8, this.h * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Palette select
        const pArray = [
            { main: '#305820', belly: '#60a040', wing: '#204810', outline: '#306020' }, // Grass
            { main: '#803000', belly: '#c05020', wing: '#602010', outline: '#803020' }, // Fire
            { main: '#104080', belly: '#4080c0', wing: '#082040', outline: '#104080' }, // Ice
            { main: '#605030', belly: '#908050', wing: '#403020', outline: '#504020' }, // Earth
            { main: '#401060', belly: '#8040a0', wing: '#200830', outline: '#401060' }, // Void
        ];
        const p1 = pArray[(this.bossNumber - 1) % pArray.length];
        const p2 = pArray[Math.min(this.bossNumber, pArray.length - 1)]; // Enraged palette
        const pal = this.phase === 2 ? p2 : p1;

        // Scale factor for drawing
        const s = this.w / 32;

        ctx.save();
        ctx.translate(x, y + bob);
        ctx.scale(s, s);

        // ── Dragon body ──────────────────────────────
        // Tail
        ctx.fillStyle = pal.wing;
        ctx.fillRect(-8, 18, 10, 6);
        ctx.fillRect(-12, 20, 6, 4);

        // Body
        ctx.fillStyle = pal.main;
        ctx.fillRect(2, 10, 22, 18);
        // Belly
        ctx.fillStyle = pal.belly;
        ctx.fillRect(6, 14, 14, 12);

        // Wings (animated flap)
        const wA = Math.sin(this.wingFlap) * 8;
        ctx.fillStyle = pal.wing;
        ctx.beginPath();
        ctx.moveTo(4, 12);
        ctx.lineTo(-14, 4 - wA);
        ctx.lineTo(-4, 18);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(22, 12);
        ctx.lineTo(38, 4 - wA);
        ctx.lineTo(28, 18);
        ctx.closePath();
        ctx.fill();
        // Wing membrane lines
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(4, 12); ctx.lineTo(-8, 10 - wA);
        ctx.moveTo(4, 12); ctx.lineTo(-14, 8 - wA * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(22, 12); ctx.lineTo(32, 10 - wA);
        ctx.moveTo(22, 12); ctx.lineTo(38, 8 - wA * 0.5);
        ctx.stroke();

        // Neck & Head
        ctx.fillStyle = pal.main;
        ctx.fillRect(8, 2, 12, 12);
        // Head
        ctx.fillRect(6, -6, 16, 12);
        // Snout
        ctx.fillStyle = pal.belly;
        ctx.fillRect(8, -3, 14, 7);
        // Nostrils
        ctx.fillStyle = '#101010';
        ctx.fillRect(10, -2, 2, 2);
        ctx.fillRect(16, -2, 2, 2);
        // Eyes
        ctx.fillStyle = this.phase === 2 ? '#ff2020' : '#ffe000';
        ctx.fillRect(9, -5, 4, 4);
        ctx.fillRect(18, -5, 4, 4);
        ctx.fillStyle = '#101010';
        ctx.fillRect(10, -4, 2, 2);
        ctx.fillRect(19, -4, 2, 2);
        // Horns
        ctx.fillStyle = '#e0c000';
        ctx.fillRect(9, -10, 3, 6);
        ctx.fillRect(19, -10, 3, 6);
        // Teeth / fire glow
        ctx.fillStyle = this.phase === 2 ? '#ff6000' : '#ffffff';
        ctx.fillRect(10, -1, 2, 3);
        ctx.fillRect(14, -1, 2, 3);
        ctx.fillRect(18, -1, 2, 3);

        ctx.restore();

        // HP bar
        ctx.fillStyle = '#600000';
        ctx.fillRect(x - 4, y - 18 + bob, this.w + 8, 5);
        ctx.fillStyle = '#e02020';
        ctx.fillRect(x - 4, y - 18 + bob, Math.floor((this.w + 8) * this.hp / this.maxHp), 5);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 4, y - 18 + bob, this.w + 8, 5);

        // Name label
        ctx.fillStyle = '#ffd000';
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🐉 Drage Lv.${this.bossNumber * 10}`, x + this.w / 2, y - 22 + bob);
        ctx.textAlign = 'left';

        ctx.filter = 'none';
    }

    _drawDeathEffect(ctx) {
        const progress = 1 - this.deathTimer / 2.0;
        ctx.globalAlpha = Math.max(0, 1 - progress * 1.5);
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + progress * Math.PI;
            const r = progress * 50;
            ctx.fillStyle = ['#ff4000', '#ffaa00', '#ffffff'][i % 3];
            ctx.fillRect(cx + Math.cos(angle) * r - 3, cy + Math.sin(angle) * r - 3, 6, 6);
        }
        ctx.globalAlpha = 1;
    }

    isFullyDead() {
        return this.dead && this.deathTimer <= 0;
    }
}
