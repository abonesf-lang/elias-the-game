// player.js — Elias, the player character
class Player {
    constructor(x, y) {
        this.x = x;       // world pixel position (top-left of sprite)
        this.y = y;
        this.w = 14;
        this.h = 16;
        this.speed = 60;  // pixels per second
        this.dir = 'down';

        // Animation
        this.frame = 0;
        this.frameTimer = 0;
        this.frameDuration = 0.15; // seconds per frame
        this.moving = false;

        // Attack
        this.attacking = false;
        this.attackTimer = 0;
        this.attackDuration = 0.3;
        this.attackCooldown = 0;

        // Stats
        this.level = 1;
        this.exp = 0;
        this.expToNext = 20;
        this.hp = 20;
        this.maxHp = 20;
        this.powers = [];            // special powers from dragons

        // Invincibility frames after hit
        this.invTimer = 0;
        this.hitEntities = new Set();
    }

    expForLevel(lvl) {
        return Math.floor(20 * Math.pow(1.4, lvl - 1));
    }

    gainExp(amount) {
        this.exp += amount;
        const results = [];
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.expToNext = this.expForLevel(this.level);
            this.maxHp += 5;
            this.hp = this.maxHp;
            results.push({ type: 'levelup', level: this.level });
            if (this.level % 10 === 0) results.push({ type: 'boss', level: this.level });
        }
        return results;
    }

    takeDamage(amount) {
        if (this.invTimer > 0) return false;
        this.hp = Math.max(0, this.hp - amount);
        this.invTimer = 1.5; // 1.5s invincibility
        return true;
    }

    // Returns the attack hitbox rect in world coords (or null if not attacking)
    getAttackRect() {
        if (!this.attacking) return null;
        const reach = 18;
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        switch (this.dir) {
            case 'up': return { x: cx - 6, y: cy - reach, w: 12, h: reach };
            case 'down': return { x: cx - 6, y: cy, w: 12, h: reach };
            case 'left': return { x: cx - reach, y: cy - 6, w: reach, h: 12 };
            case 'right': return { x: cx, y: cy - 6, w: reach, h: 12 };
        }
        return null;
    }

    // Returns interact point (1 tile in front of player)
    getInteractTile(currentMap) {
        const cx = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        const cy = Math.floor((this.y + this.h / 2) / TILE_SIZE);
        switch (this.dir) {
            case 'up': return { col: cx, row: cy - 1 };
            case 'down': return { col: cx, row: cy + 1 };
            case 'left': return { col: cx - 1, row: cy };
            case 'right': return { col: cx + 1, row: cy };
        }
        return { col: cx, row: cy };
    }

    update(dt, currentMap) {
        this.frameTimer += dt;
        if (this.invTimer > 0) this.invTimer -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Handle attack
        if (this.attacking) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) this.attacking = false;
        }

        // Movement
        let dx = 0, dy = 0;
        if (!this.attacking) {
            if (Input.isDown('ArrowLeft')) { dx = -1; this.dir = 'left'; }
            if (Input.isDown('ArrowRight')) { dx = 1; this.dir = 'right'; }
            if (Input.isDown('ArrowUp')) { dy = -1; this.dir = 'up'; }
            if (Input.isDown('ArrowDown')) { dy = 1; this.dir = 'down'; }
        }

        this.moving = dx !== 0 || dy !== 0;

        if (this.moving) {
            // Normalize diagonal
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len; dy /= len;

            const spd = this.speed * dt;
            this._moveAxis(spd * dx, 0, currentMap);
            this._moveAxis(0, spd * dy, currentMap);

            // Animate walk cycle
            if (this.frameTimer >= this.frameDuration) {
                this.frameTimer = 0;
                this.frame = (this.frame + 1) % 4;
            }
        } else {
            this.frame = 0;
            this.frameTimer = 0;
        }

        // Spatial bounds
        this.x = Math.max(0, Math.min(this.x, currentMap.pixelWidth() - this.w));
        this.y = Math.max(0, Math.min(this.y, currentMap.pixelHeight() - this.h));
    }

    startAttack() {
        if (this.attackCooldown > 0) return;
        this.attacking = true;
        this.attackTimer = this.attackDuration;
        this.attackCooldown = 0.5;
        this.hitEntities.clear();
    }

    _moveAxis(dx, dy, map) {
        const nx = this.x + dx;
        const ny = this.y + dy;
        // Check corners of hitbox
        const left = Math.floor(nx / TILE_SIZE);
        const right = Math.floor((nx + this.w - 1) / TILE_SIZE);
        const top = Math.floor(ny / TILE_SIZE);
        const bottom = Math.floor((ny + this.h - 1) / TILE_SIZE);

        const blocked = (
            map.isSolid(left, top) || map.isSolid(right, top) ||
            map.isSolid(left, bottom) || map.isSolid(right, bottom)
        );
        if (!blocked) {
            this.x = nx;
            this.y = ny;
        }
    }

    draw(ctx) {
        const x = Math.floor(this.x);
        const y = Math.floor(this.y);

        // Flicker during invincibility
        if (this.invTimer > 0 && Math.floor(this.invTimer * 10) % 2 === 0) return;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + 7, y + 17, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Leg animation offset
        const walkBob = this.moving ? (this.frame % 2 === 0 ? 1 : -1) : 0;

        // ── Body ──
        // Shoes
        ctx.fillStyle = '#402008';
        if (this.dir !== 'up') {
            ctx.fillRect(x + 2, y + 14 + walkBob, 4, 3);
            ctx.fillRect(x + 8, y + 14 - walkBob, 4, 3);
        } else {
            ctx.fillRect(x + 3, y + 14, 8, 3);
        }

        // Pants (dark blue)
        ctx.fillStyle = '#184880';
        ctx.fillRect(x + 3, y + 10, 8, 5);

        // Shirt (Earthbound-style striped)
        ctx.fillStyle = '#d04030'; // red shirt
        ctx.fillRect(x + 2, y + 5, 10, 6);
        ctx.fillStyle = '#f06050';
        ctx.fillRect(x + 2, y + 6, 10, 1);
        ctx.fillRect(x + 2, y + 8, 10, 1);

        // Arms
        ctx.fillStyle = '#e8b880'; // skin
        if (this.dir === 'left' || this.dir === 'right') {
            ctx.fillRect(x + 0, y + 5, 3, 5);
            ctx.fillRect(x + 11, y + 5, 3, 5);
        } else {
            ctx.fillRect(x + 0, y + 6, 2, 4);
            ctx.fillRect(x + 12, y + 6, 2, 4);
        }

        // Head
        ctx.fillStyle = '#e8b880';
        ctx.fillRect(x + 2, y + 0, 10, 6);
        // Eyes
        if (this.dir !== 'up') {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 4, y + 2, 2, 2);
            ctx.fillRect(x + 8, y + 2, 2, 2);
            // Pupils
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 4, y + 2, 1, 1);
            ctx.fillRect(x + 8, y + 2, 1, 1);
        }

        // Hair (Earthbound bowl cut)
        ctx.fillStyle = '#503010';
        ctx.fillRect(x + 2, y + 0, 10, 2);
        ctx.fillRect(x + 2, y + 0, 2, 4);
        ctx.fillRect(x + 10, y + 0, 2, 4);

        // Baseball cap brim
        ctx.fillStyle = '#e03020';
        ctx.fillRect(x + 2, y + 0, 10, 2);
        ctx.fillStyle = '#c02010';
        ctx.fillRect(x + 0, y + 1, 14, 1); // brim

        // ── Stick / weapon ──
        this._drawStick(ctx, x, y);

        // ── Attack effect ──
        if (this.attacking) {
            this._drawAttackEffect(ctx, x, y);
        }
    }

    _drawStick(ctx, x, y) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();

        let startX, startY, endX, endY;

        if (this.attacking) {
            const progress = 1 - (this.attackTimer / this.attackDuration); // 0 to 1
            const angleExtent = Math.PI * 0.8;
            const cx = x + this.w / 2;
            const cy = y + this.h / 2;
            const stickLen = 16;
            let baseAngle = 0;
            switch (this.dir) {
                case 'right': baseAngle = 0; break;
                case 'down': baseAngle = Math.PI / 2; break;
                case 'left': baseAngle = Math.PI; break;
                case 'up': baseAngle = -Math.PI / 2; break;
            }
            const currentAngle = baseAngle - angleExtent / 2 + angleExtent * progress;
            startX = cx + Math.cos(currentAngle) * 5;
            startY = cy + Math.sin(currentAngle) * 5;
            endX = cx + Math.cos(currentAngle) * (5 + stickLen);
            endY = cy + Math.sin(currentAngle) * (5 + stickLen);
        } else {
            const frames = [[x + 13, y + 7, x + 20, y + 0],
            [x + 13, y + 7, x + 21, y + 3],
            [x + 13, y + 9, x + 21, y + 15],
            [x + 13, y + 9, x + 20, y + 4]];
            let f = frames[this.frame % 4];
            if (this.dir === 'left') { f = [x + 1, y + 7, x - 6, y + 0]; }
            if (this.dir === 'up') { f = [x + 7, y + 4, x + 5, y - 8]; }
            startX = f[0]; startY = f[1]; endX = f[2]; endY = f[3];
        }

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    _drawAttackEffect(ctx, x, y) {
        const progress = 1 - (this.attackTimer / this.attackDuration);
        const alpha = Math.max(0, 0.8 - progress);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        const cx = x + this.w / 2;
        const cy = y + this.h / 2;
        const r = 18 * progress;

        ctx.beginPath();
        switch (this.dir) {
            case 'right': ctx.arc(cx + 8, cy, r, -Math.PI * 0.5, Math.PI * 0.5); break;
            case 'left': ctx.arc(cx - 8, cy, r, Math.PI * 0.5, -Math.PI * 0.5); break;
            case 'up': ctx.arc(cx, cy - 8, r, Math.PI, 0); break;
            case 'down': ctx.arc(cx, cy + 8, r, 0, Math.PI); break;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
    }
}
