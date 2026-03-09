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
        this.activePower = null;
        this.items = [];

        // Active Power Effects
        this.activeEffects = []; // for lingering things like fire
        this.buffs = {
            lyngsprang: 0, // timer for speed boost
            iskappe: 0,    // timer for shield
            drageblod: 0,  // timer for regen
            skyggeskritt: 0, // stealth
            stormvinge: 0, // whirlwind attacks
            stjernekraft: 0, // star power
        };

        // Afterimage trail for Lyngsprang
        this.trail = [];

        // Invincibility frames after hit
        this.invTimer = 0;
        this.hitEntities = new Set();
    }

    expForLevel(lvl) {
        return Math.floor(20 * Math.pow(lvl, 2.2));
    }

    gainExp(amount) {
        this.exp += amount;
        const results = [];
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.expToNext = this.expForLevel(this.level);
            this.maxHp = Math.floor(20 + 10 * (this.level - 1) + 0.1 * Math.pow(this.level, 2));
            this.hp = this.maxHp;
            results.push({ type: 'levelup', level: this.level });
            if (this.level % 10 === 0) results.push({ type: 'boss', level: this.level });
        }
        return results;
    }

    cheatLevelUp(levels) {
        let needed = (this.expToNext - this.exp);
        let simLvl = this.level + 1;
        for (let i = 1; i < levels; i++) {
            needed += this.expForLevel(simLvl);
            simLvl++;
        }
        return this.gainExp(needed);
    }

    takeDamage(amount) {
        if (this.invTimer > 0) return false;

        // Iskappe / Stjernekraft shield blocks 100% damage!
        if (this.buffs.iskappe > 0 || this.buffs.stjernekraft > 0) {
            HUD.addFloater('BLOKKERT!', this.x + this.w / 2, this.y - 10, this.buffs.stjernekraft > 0 ? '#ffff00' : '#80e0ff');
            this.invTimer = 0.5;
            return false;
        }

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

        // Whirlwind hits everywhere
        if (this.buffs.stormvinge > 0) {
            return { x: cx - reach, y: cy - reach, w: reach * 2, h: reach * 2 };
        }

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

        // Update buffs
        if (this.buffs.lyngsprang > 0) this.buffs.lyngsprang -= dt;
        if (this.buffs.iskappe > 0) this.buffs.iskappe -= dt;
        if (this.buffs.skyggeskritt > 0) this.buffs.skyggeskritt -= dt;
        if (this.buffs.stormvinge > 0) this.buffs.stormvinge -= dt;
        if (this.buffs.stjernekraft > 0) this.buffs.stjernekraft -= dt;

        if (this.buffs.drageblod > 0) {
            this.buffs.drageblod -= dt;
            // Regen 1 HP every second
            if (Math.floor(this.buffs.drageblod) !== Math.floor(this.buffs.drageblod + dt)) {
                this.hp = Math.min(this.maxHp, this.hp + 1);
                HUD.addFloater('+1', this.x + this.w / 2 + (Math.random() - 0.5) * 10, this.y - 5, '#ff0080');
            }
        }

        // Update lingering effects (like fire)
        this.activeEffects = this.activeEffects.filter(e => e.life > 0);
        for (const ef of this.activeEffects) {
            ef.life -= dt;
            // Fire damage tick
            if (ef.type === 'fire') {
                ef.tick -= dt;
                if (ef.tick <= 0) {
                    ef.tick = 0.5; // damage every 0.5s
                    // Check enemies overlapping this fire patch
                    for (const enemy of Game.spawner.enemies) {
                        if (!enemy.dead && rectsOverlap(ef.rect, { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h })) {
                            const dmg = 2 + Math.floor(this.level * 0.5);
                            enemy.takeDamage(dmg);
                            HUD.addFloater(`${dmg}`, enemy.x + enemy.w / 2, enemy.y - 4, '#ff4000');
                        }
                    }
                    if (Game.boss && !Game.boss.dead && rectsOverlap(ef.rect, { x: Game.boss.x, y: Game.boss.y, w: Game.boss.w, h: Game.boss.h })) {
                        const dmg = 2 + Math.floor(this.level * 0.5);
                        Game.boss.takeDamage(dmg);
                        HUD.addFloater(`${dmg}`, Game.boss.x + 16, Game.boss.y - 4, '#ff4000');
                    }
                }
            }
        }

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

            const spd = this.currentSpeed * dt;
            this._moveAxis(spd * dx, 0, currentMap);
            this._moveAxis(0, spd * dy, currentMap);

            // Record trail if Lyngsprang is active
            if (this.buffs.lyngsprang > 0 || this.buffs.stjernekraft > 0) {
                this.trail.push({ x: this.x, y: this.y, dir: this.dir, frame: this.frame, life: 0.3 });
                if (this.trail.length > 5) this.trail.shift();
            }

            // Animate walk cycle
            if (this.frameTimer >= this.frameDuration) {
                this.frameTimer = 0;
                this.frame = (this.frame + 1) % 4;
            }
        } else {
            this.frame = 0;
            this.frameTimer = 0;
        }

        // Update trail fade
        for (const t of this.trail) t.life -= dt;
        this.trail = this.trail.filter(t => t.life > 0);

        // Spatial bounds
        this.x = Math.max(0, Math.min(this.x, currentMap.pixelWidth() - this.w));
        this.y = Math.max(0, Math.min(this.y, currentMap.pixelHeight() - this.h));
    }

    startAttack() {
        if (this.attackCooldown > 0) return;
        this.attacking = true;
        this.attackDuration = 0.3;
        this.attackTimer = this.attackDuration;
        this.attackCooldown = 0.5;
        this.hitEntities.clear();
    }

    get isStealth() {
        return this.buffs.skyggeskritt > 0;
    }

    useActivePower() {
        if (!this.activePower) {
            HUD.addFloater('Ingen kraft', this.x, this.y - 10, '#888');
            return;
        }
        if (this.attackCooldown > 0) return; // Share GCD with attack for now

        const pName = this.activePower.name;

        if (pName === 'Ildpust') {
            // Spew fire 2 tiles forward
            HUD.addFloater('ILDPUST!', this.x + this.w / 2, this.y - 10, '#ff4000');
            this.attackCooldown = 1.0;
            this.attacking = true;
            this.attackDuration = 0.5;
            this.attackTimer = this.attackDuration;

            // Spawn 3 fire patches in front
            let fx = this.x + this.w / 2;
            let fy = this.y + this.h / 2;
            for (let i = 1; i <= 3; i++) {
                let px = fx, py = fy;
                if (this.dir === 'up') py -= i * 16;
                if (this.dir === 'down') py += i * 16;
                if (this.dir === 'left') px -= i * 16;
                if (this.dir === 'right') px += i * 16;
                this.activeEffects.push({
                    type: 'fire', life: 4.0, tick: 0,
                    x: px, y: py,
                    rect: { x: px - 12, y: py - 12, w: 24, h: 24 }
                });
            }
        }
        else if (pName === 'Lygnsprang') {
            HUD.addFloater('LYNSPRANG!', this.x + this.w / 2, this.y - 10, '#ffe000');
            this.buffs.lyngsprang = 5.0; // 5 seconds of speed
            this.attackCooldown = 0.5; // low cooldown for mobility
        }
        else if (pName === 'Iskappe') {
            HUD.addFloater('ISKAPPE!', this.x + this.w / 2, this.y - 10, '#80e0ff');
            this.buffs.iskappe = 6.0; // 6 seconds of invincibility
            this.attackCooldown = 1.5;
        }
        else if (pName === 'Jordskjelv') {
            HUD.addFloater('JORDSKJELV!', this.x + this.w / 2, this.y - 10, '#c08040');
            Game.screenShake = 0.5;
            this.activeEffects.push({ type: 'earthquake', life: 0.5, x: this.x + this.w / 2, y: this.y + this.h / 2 });
            // Damage is handled in game.js via screenShake
            this.attackCooldown = 2.0;
        }
        else if (pName === 'Drageblod') {
            HUD.addFloater('DRAGEBLOD!', this.x + this.w / 2, this.y - 10, '#ff0080');
            this.buffs.drageblod = 10.0; // 10s regen
            this.attackCooldown = 1.0;
        }
        else if (pName === 'Skyggeskritt') {
            HUD.addFloater('SKYGGE!', this.x + this.w / 2, this.y - 10, '#6020a0');
            this.buffs.skyggeskritt = 5.0; // enemies lose aggro
            this.attackCooldown = 1.0;
        }
        else if (pName === 'Stormvinge') {
            HUD.addFloater('STORMVINGE!', this.x + this.w / 2, this.y - 10, '#80ffe0');
            this.buffs.stormvinge = 5.0; // 5s whirlwind attacks
            this.attackCooldown = 1.0;
        }
        else if (pName === 'Dragesang') {
            HUD.addFloater('🎵 SØVN...', this.x + this.w / 2, this.y - 10, '#ffc0ff');
            this.activeEffects.push({ type: 'song', life: 1.0, x: this.x + this.w / 2, y: this.y + this.h / 2 });
            Game.triggerGlobalSleep(6.0); // 6s stun
            this.attackCooldown = 2.0;
        }
        else if (pName === 'Tidsstopp') {
            HUD.addFloater('TIDSSTOPP!', this.x + this.w / 2, this.y - 10, '#c0c0ff');
            Game.triggerGlobalFreeze(4.0); // 4s freeze
            this.attackCooldown = 2.0;
        }
        else if (pName === 'Stjernekraft') {
            HUD.addFloater('⭐ STJERNE!', this.x + this.w / 2, this.y - 10, '#ffffff');
            this.buffs.stjernekraft = 8.0; // Invincible + double dmg
            this.hp = this.maxHp;
            this.attackCooldown = 1.0;
        }
        else {
            // Unimplemented fallback: tiny heal
            const healAmount = this.level * 2;
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
            HUD.addFloater(`+${healAmount} HP`, this.x + this.w / 2, this.y - 10, '#00ff00');
            this.attackCooldown = 1.0;
            this.attacking = true;
            this.attackDuration = 0.4;
            this.attackTimer = this.attackDuration;
        }

        this.hitEntities.clear();
    }

    // Dynamic speed getter
    get currentSpeed() {
        let s = this.speed;
        if (this.buffs.lyngsprang > 0) s *= 2.5;
        if (this.buffs.stjernekraft > 0) s *= 1.5;
        return s;
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
        // Draw Lingering ground effects first (so they are under player)
        for (const ef of this.activeEffects) {
            if (ef.type === 'fire') {
                ctx.globalAlpha = Math.min(1, ef.life);
                // Draw a simple jagged fire shape centered on ef.x, ef.y
                const bob = Math.random() * 4;
                ctx.fillStyle = '#ff4000';
                ctx.beginPath();
                ctx.arc(ef.x, ef.y + 4, 10, 0, Math.PI, false);
                ctx.lineTo(ef.x - 12, ef.y - 4 + bob);
                ctx.lineTo(ef.x - 4, ef.y - 10 + bob);
                ctx.lineTo(ef.x, ef.y - 6 + bob);
                ctx.lineTo(ef.x + 6, ef.y - 12 + bob);
                ctx.lineTo(ef.x + 10, ef.y - 2 + bob);
                ctx.fill();

                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(ef.x, ef.y + 4, 6, 0, Math.PI, false);
                ctx.lineTo(ef.x - 6, ef.y - 2 + bob);
                ctx.lineTo(ef.x, ef.y - 6 + bob);
                ctx.lineTo(ef.x + 4, ef.y - 1 + bob);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            if (ef.type === 'earthquake') {
                ctx.strokeStyle = `rgba(192, 128, 64, ${ef.life * 2})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(ef.x, ef.y, (0.5 - ef.life) * 150, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (ef.type === 'song') {
                ctx.fillStyle = `rgba(255, 192, 255, ${ef.life})`;
                ctx.font = '10px "Press Start 2P"';
                ctx.fillText('♪', ef.x - 5 + Math.sin(ef.life * 10) * 10, ef.y - 20 - (1 - ef.life) * 20);
                ctx.fillText('♫', ef.x + 5 + Math.cos(ef.life * 10) * 10, ef.y - 15 - (1 - ef.life) * 30);
            }
        }

        // Draw Trails (Lyngsprang & Stjernekraft)
        for (let i = this.trail.length - 1; i >= 0; i--) {
            const t = this.trail[i];
            ctx.globalAlpha = t.life * 1.5;
            if (this.buffs.stjernekraft > 0) {
                // Rainbow trail
                ctx.filter = `hue-rotate(${Date.now() % 360}deg) saturate(200%)`;
            } else {
                // Tint yellow-ish
                ctx.filter = 'sepia(100%) saturate(300%) hue-rotate(30deg)';
            }
            this._drawSprite(ctx, t.x, t.y, t.dir, t.frame, false, false);
            ctx.filter = 'none';
        }
        ctx.globalAlpha = 1;

        // Draw main player
        if (this.invTimer > 0 && Math.floor(this.invTimer * 10) % 2 === 0) {
            // Invisible frame
        } else {
            if (this.buffs.skyggeskritt > 0) ctx.globalAlpha = 0.4;
            this._drawSprite(ctx, this.x, this.y, this.dir, this.frame, this.moving, this.attacking);
            ctx.globalAlpha = 1;
        }

        // Draw active buffs OVER player
        if (this.buffs.iskappe > 0) {
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 150) * 0.2;
            ctx.fillStyle = '#aaddff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2 + 2, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Snowflake sparkles
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.x + 2, this.y + 4, 2, 2);
            ctx.fillRect(this.x + 10, this.y - 2, 2, 2);
            ctx.globalAlpha = 1;
        }
    }

    _drawSprite(ctx, x, y, dir, frame, moving, attacking) {

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
        this._drawStick(ctx, x, y, dir, frame, attacking);

        // ── Attack effect ──
        if (attacking) {
            this._drawAttackEffect(ctx, x, y, dir);
        }
    }

    _drawStick(ctx, x, y, dir, frame, attacking) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();

        let startX, startY, endX, endY;

        if (attacking) {
            const progress = 1 - (this.attackTimer / this.attackDuration); // 0 to 1
            const cx = x + this.w / 2;
            const cy = y + this.h / 2;
            const stickLen = 16 + (this.buffs.stormvinge > 0 ? 8 : 0);

            if (this.buffs.stormvinge > 0) {
                // Full 360 swing
                const currentAngle = progress * Math.PI * 4; // 2 spins
                startX = cx + Math.cos(currentAngle) * 5;
                startY = cy + Math.sin(currentAngle) * 5;
                endX = cx + Math.cos(currentAngle) * (5 + stickLen);
                endY = cy + Math.sin(currentAngle) * (5 + stickLen);
            } else {
                const angleExtent = Math.PI * 0.8;
                let baseAngle = 0;
                switch (dir) {
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
            }
        } else {
            const frames = [[x + 13, y + 7, x + 20, y + 0],
            [x + 13, y + 7, x + 21, y + 3],
            [x + 13, y + 9, x + 21, y + 15],
            [x + 13, y + 9, x + 20, y + 4]];
            let f = frames[frame % 4];
            if (dir === 'left') { f = [x + 1, y + 7, x - 6, y + 0]; }
            if (dir === 'up') { f = [x + 7, y + 4, x + 5, y - 8]; }
            startX = f[0]; startY = f[1]; endX = f[2]; endY = f[3];
        }

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    _drawAttackEffect(ctx, x, y, dir) {
        let progress = 1 - (this.attackTimer / this.attackDuration);
        progress = Math.max(0, Math.min(1, progress)); // Safe clamp to avoid negative radius

        const alpha = Math.max(0, 0.8 - progress);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        const cx = x + this.w / 2;
        const cy = y + this.h / 2;
        const r = 18 * progress;

        ctx.beginPath();
        if (this.buffs.stormvinge > 0) {
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        } else {
            switch (dir) {
                case 'right': ctx.arc(cx + 8, cy, r, -Math.PI * 0.5, Math.PI * 0.5); break;
                case 'left': ctx.arc(cx - 8, cy, r, Math.PI * 0.5, -Math.PI * 0.5); break;
                case 'up': ctx.arc(cx, cy - 8, r, Math.PI, 0); break;
                case 'down': ctx.arc(cx, cy + 8, r, 0, Math.PI); break;
            }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
    }
}
