// enemy.js — Critter enemies
const CRITTER_TYPES = [
    {
        name: 'Blåslime',
        color: '#4080d0', eyeColor: '#ffffff',
        hp: 8, exp: 10, atk: 2, speed: 25,
        size: 10, shape: 'blob',
    },
    {
        name: 'Rødmaur',
        color: '#c03020', legColor: '#801010',
        hp: 5, exp: 7, atk: 1, speed: 40,
        size: 9, shape: 'bug',
    },
    {
        name: 'Grønnorm',
        color: '#308040', spotColor: '#204d28',
        hp: 12, exp: 14, atk: 3, speed: 20,
        size: 11, shape: 'worm',
    },
    {
        name: 'Grå kråke',
        color: '#707880', wingColor: '#505860',
        hp: 6, exp: 9, atk: 2, speed: 50,
        size: 10, shape: 'bird',
    },
    {
        name: 'Liten edderkopp',
        color: '#504040', legColor: '#402020',
        hp: 10, exp: 12, atk: 2, speed: 35,
        size: 10, shape: 'spider',
    },
];

let _enemyId = 0;

class Enemy {
    constructor(x, y, zoneMultiplier = 1) {
        this.id = _enemyId++;
        const typeIndex = Math.floor(Math.random() * CRITTER_TYPES.length);
        const type = CRITTER_TYPES[typeIndex];
        Object.assign(this, type);

        // Scale stats by zone
        this.hp = Math.floor(this.hp * zoneMultiplier);
        this.maxHp = this.hp;
        this.exp = Math.floor(this.exp * zoneMultiplier);
        this.atk = Math.floor(this.atk * zoneMultiplier);

        // Visual tinting based on zone multiplier
        this.zoneStyle = zoneMultiplier;

        this.x = x;
        this.y = y;
        this.w = this.size;
        this.h = this.size;

        // Wander AI
        this.wanderTimer = 0;
        this.wanderDx = 0;
        this.wanderDy = 0;
        this._pickWander();

        // Chase/flee states
        this.state = 'wander'; // wander | chase | flee
        this.stateTimer = 0;

        // Animation
        this.animTimer = 0;
        this.animFrame = 0;

        // Hit flash
        this.hitFlash = 0;

        this.dead = false;
        this.deathTimer = 0;
    }

    _pickWander() {
        this.wanderTimer = 1.5 + Math.random() * 2.5;
        const angle = Math.random() * Math.PI * 2;
        this.wanderDx = Math.cos(angle);
        this.wanderDy = Math.sin(angle);
        if (Math.random() < 0.3) { this.wanderDx = 0; this.wanderDy = 0; } // idle sometimes
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 0.25;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            this.deathTimer = 0.45;
        }
    }

    update(dt, player, currentMap) {
        if (this.dead) {
            this.deathTimer -= dt;
            return;
        }

        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.animTimer += dt;
        if (this.animTimer > 0.2) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 2; }

        // Distance to player
        const pdx = (player.x + player.w / 2) - (this.x + this.w / 2);
        const pdy = (player.y + player.h / 2) - (this.y + this.h / 2);
        const dist = Math.sqrt(pdx * pdx + pdy * pdy);

        // State transitions
        if (dist < 60 && (!player.isStealth || this.state === 'chase')) {
            if (!player.isStealth) this.state = 'chase';
            else this.state = 'wander'; // lose aggro if player pops stealth
        } else if (player.attacking && dist < 80) {
            this.state = 'flee';
            this.stateTimer = 2;
        } else if (this.state !== 'wander') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) this.state = 'wander';
        }

        let mx = 0, my = 0;

        if (this.state === 'wander') {
            this.wanderTimer -= dt;
            if (this.wanderTimer <= 0) this._pickWander();
            mx = this.wanderDx;
            my = this.wanderDy;
        } else if (this.state === 'chase') {
            if (dist > 1) { mx = pdx / dist; my = pdy / dist; }
        } else if (this.state === 'flee') {
            if (dist > 1) { mx = -pdx / dist; my = -pdy / dist; }
        }

        // Move with simple collision
        const spd = this.speed * dt;
        const nx = this.x + mx * spd;
        const ny = this.y + my * spd;
        const left = Math.floor(nx / TILE_SIZE);
        const right = Math.floor((nx + this.w - 1) / TILE_SIZE);
        const top = Math.floor(ny / TILE_SIZE);
        const bottom = Math.floor((ny + this.h - 1) / TILE_SIZE);
        if (!currentMap.isSolid(left, top) && !currentMap.isSolid(right, top) &&
            !currentMap.isSolid(left, bottom) && !currentMap.isSolid(right, bottom)) {
            this.x = nx;
            this.y = ny;
        }

        // Clamp to map
        this.x = Math.max(0, Math.min(this.x, currentMap.pixelWidth() - this.w));
        this.y = Math.max(0, Math.min(this.y, currentMap.pixelHeight() - this.h));

        // Damage player on contact
        if (dist < 12 && this.state === 'chase') {
            player.takeDamage(this.atk);
        }
    }

    draw(ctx) {
        if (this.dead) {
            if (this.deathTimer > 0) this._drawDeath(ctx);
            return;
        }

        const x = Math.floor(this.x);
        const y = Math.floor(this.y);
        const bob = this.animFrame === 0 ? 0 : 1;

        // Hit flash overlay
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y + bob, this.w, this.h);
            ctx.globalAlpha = 1;
            return;
        }

        // Frozen visually?
        if (Game.globalStunTimer > 0) {
            ctx.filter = 'saturate(50%) hue-rotate(-30deg) brightness(120%)';
        }

        // HP bar above enemy (only when damaged)
        if (this.hp < this.maxHp) {
            ctx.fillStyle = '#600000';
            ctx.fillRect(x - 1, y - 5, this.w + 2, 3);
            ctx.fillStyle = '#00e000';
            ctx.fillRect(x - 1, y - 5, Math.floor((this.w + 2) * this.hp / this.maxHp), 3);
        }

        switch (this.shape) {
            case 'blob': this._drawBlob(ctx, x, y + bob); break;
            case 'bug': this._drawBug(ctx, x, y + bob); break;
            case 'worm': this._drawWorm(ctx, x, y + bob); break;
            case 'bird': this._drawBird(ctx, x, y + bob); break;
            case 'spider': this._drawSpider(ctx, x, y + bob); break;
        }
        ctx.filter = 'none';
    }

    _drawBlob(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(x + 5, y + 6, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.eyeColor;
        ctx.fillRect(x + 2, y + 4, 2, 2);
        ctx.fillRect(x + 6, y + 4, 2, 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + 3, y + 4, 1, 1);
        ctx.fillRect(x + 7, y + 4, 1, 1);
    }

    _drawBug(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 2, y + 2, 6, 7);
        ctx.fillStyle = this.legColor;
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 0, y + 3 + i * 2, 2, 1);
            ctx.fillRect(x + 8, y + 3 + i * 2, 2, 1);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 3, y + 2, 1, 1);
        ctx.fillRect(x + 6, y + 2, 1, 1);
    }

    _drawWorm(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 1, y + 4, 9, 5);
        ctx.fillRect(x + 3, y + 2, 5, 3);
        ctx.fillStyle = this.spotColor;
        ctx.fillRect(x + 2, y + 5, 2, 2);
        ctx.fillRect(x + 6, y + 5, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 2, 1, 1);
        ctx.fillRect(x + 6, y + 2, 1, 1);
    }

    _drawBird(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 2, y + 3, 7, 6);
        ctx.fillStyle = this.wingColor;
        ctx.fillRect(x + 0, y + 2, 3, 4);
        ctx.fillRect(x + 8, y + 2, 3, 4);
        ctx.fillStyle = '#f0c000';
        ctx.fillRect(x + 3, y + 3, 2, 1);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + 6, y + 3, 1, 1);
    }

    _drawSpider(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 2, y + 3, 6, 5);
        ctx.fillStyle = this.legColor;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(x - 2 + i, y + 3 + i % 2, 3, 1);
            ctx.fillRect(x + 9 - i, y + 3 + (i + 1) % 2, 3, 1);
        }
        ctx.fillStyle = '#ff2020';
        ctx.fillRect(x + 3, y + 4, 1, 1);
        ctx.fillRect(x + 6, y + 4, 1, 1);
    }

    _drawDeath(ctx) {
        const progress = 1 - this.deathTimer / 0.45;
        ctx.globalAlpha = 1 - progress;
        ctx.fillStyle = '#ffff00';
        const x = Math.floor(this.x), y = Math.floor(this.y);
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const r = progress * 12;
            ctx.fillRect(
                x + Math.cos(angle) * r + 4,
                y + Math.sin(angle) * r + 4, 3, 3
            );
        }
        ctx.globalAlpha = 1;
    }
}

// Enemy spawner
class EnemySpawner {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 4; // seconds between spawns
        this.maxEnemies = 12;
    }

    reset() { this.enemies = []; this.spawnTimer = 0; }

    spawnNear(player, currentMap) {
        // Find zone multiplier based on player's X coordinate (0-79: 1x, 80-159: Desert 2.5x, 160-239: Snow 5x)
        const pcol = Math.floor(player.x / TILE_SIZE);
        let zoneMult = 1;
        if (pcol >= 80 && pcol < 160) zoneMult = 3;
        if (pcol >= 160) zoneMult = 6;

        // spawn at a random position off-screen but within map
        for (let attempt = 0; attempt < 20; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 120 + Math.random() * 80; // spawn ring distance
            const sx = Math.floor(player.x + Math.cos(angle) * dist);
            const sy = Math.floor(player.y + Math.sin(angle) * dist);
            const col = Math.floor(sx / TILE_SIZE);
            const row = Math.floor(sy / TILE_SIZE);
            if (!currentMap.isSolid(col, row)) {
                this.enemies.push(new Enemy(sx, sy, zoneMult));
                break;
            }
        }
    }

    update(dt, player, currentMap) {
        // Remove fully-dead enemies
        this.enemies = this.enemies.filter(e => !(e.dead && e.deathTimer <= 0));

        // Spawn
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.enemies.length < this.maxEnemies) {
            this.spawnNear(player, currentMap);
            this.spawnTimer = this.spawnInterval;
        }

        // Update each
        for (const e of this.enemies) {
            e.update(dt, player, currentMap);
        }
    }

    draw(ctx) {
        for (const e of this.enemies) e.draw(ctx);
    }
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
