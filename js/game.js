// game.js — Main game loop and state machine

const CANVAS_W = 480;
const CANVAS_H = 320;

const STATE = {
    LOADING: 'loading',
    OVERWORLD: 'overworld',
    INTERIOR: 'interior',
    BOSS: 'boss',
    DEAD: 'dead',
};

const Game = {
    canvas: null,
    ctx: null,
    state: STATE.LOADING,
    lastTime: 0,

    // World
    currentMap: null,
    interiorId: null,
    interiorNPCs: [],
    interiorChests: [],
    interiorPortals: [],

    // Entities
    player: null,
    spawner: null,
    boss: null,

    // Global modifiers
    screenShake: 0,
    globalStunTimer: 0,

    // Narrative globals
    currentStormLevel: 0,
    clockDirection: 'backwards',

    // UI state
    pendingBoss: false,
    bossQueue: [],
    locationBanner: { text: '', timer: 0 },
    debugGrid: false,

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.canvas.width = CANVAS_W;
        this.canvas.height = CANVAS_H;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        Input.init();
        Camera.init(CANVAS_W, CANVAS_H, WorldMap.pixelWidth(), WorldMap.pixelHeight());

        // Spawn player on the main road (col 30, row 28)
        this.player = new Player(10 * TILE_SIZE, 10 * TILE_SIZE);
        this.spawner = new EnemySpawner();
        this.currentMap = WorldMap;

        // Listen for any key to dismiss loading screen
        window.addEventListener('keydown', () => this._startGame(), { once: true });

        requestAnimationFrame(ts => this.loop(ts));
    },

    _startGame() {
        const loading = document.getElementById('loading-screen');
        loading.classList.add('hidden');
        setTimeout(() => { loading.style.display = 'none'; }, 600);
        this.state = STATE.OVERWORLD;
        this.showBanner('🌿 Elias\' verden');
    },

    showBanner(text) {
        this.locationBanner = { text, timer: 2.5 };
    },

    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // cap at 100ms
        this.lastTime = timestamp;

        this.update(dt);
        this.render();
        Input.flush();

        requestAnimationFrame(ts => this.loop(ts));
    },

    // ────────────────────────── UPDATE ──────────────────────────────────
    update(dt) {
        if (this.state === STATE.LOADING) return;

        // UI updates always run
        Dialogue.update(dt);
        LevelUp.update(dt);
        PowerAward.update(dt);
        HUD.update(dt);
        Renderer.update(dt);
        if (this.locationBanner.timer > 0) this.locationBanner.timer -= dt;

        // Advance dialogue on Space
        if (Dialogue.active) {
            if (Input.isJust(' ')) Dialogue.advance();
            return; // pause gameplay while talking
        }
        if (LevelUp.active || PowerAward.active) return;

        // ── N key: toggle notebook (works even when letter-reader is open) ──
        if (Input.isJust('n') || Input.isJust('N')) {
            if (Notebook.active) Notebook.close();
            else Notebook.open();
        }

        // UI overlays: capture state BEFORE updates, then block gameplay if any were open
        const _uiWasActive = Inventory.active || Notebook.active || LetterReader.active;
        Inventory.update(dt);
        Notebook.update(dt);
        LetterReader.update(dt);
        if (_uiWasActive) return;

        // Inventory / Map full-screen overrides
        if (Inventory.active) {
            Inventory.update(dt);
            return;
        }
        if (FullMap.active) {
            FullMap.update(dt);
            return;
        }

        if (this.screenShake > 0) this.screenShake -= dt;
        if (this.globalStunTimer > 0) this.globalStunTimer -= dt;

        switch (this.state) {
            case STATE.OVERWORLD: this._updateOverworld(dt); break;
            case STATE.INTERIOR: this._updateInterior(dt); break;
            case STATE.BOSS: this._updateBoss(dt); break;
            case STATE.DEAD: this._updateDead(); break;
        }
    },

    _updateOverworld(dt) {
        // Update environment & entities
        this.player.update(dt, WorldMap);

        // Time stop / sleep logic
        const enemyDt = this.globalStunTimer > 0 ? 0 : dt;
        this.spawner.update(enemyDt, this.player, WorldMap);
        Camera.follow(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);

        // Update interior NPCs if in interior mode (handled separately)
        for (const npc of this.interiorNPCs) npc.update(dt);

        // Player attack input
        if (Input.isJust(' ')) {
            if (!Dialogue.active) this._handleSpaceOverworld();
        }

        // Active Power
        if (Input.isJust('f') || Input.isJust('F')) {
            this.player.useActivePower();
        }

        // Open UI
        if (Input.isJust('b') || Input.isJust('B')) Inventory.active = true;
        if (Input.isJust('m') || Input.isJust('M')) FullMap.active = true;

        // CHEAT CODE
        if (Input.isJust('l') || Input.isJust('L')) {
            const results = this.player.cheatLevelUp(10);
            this._handleLevelResults(results);
            HUD.addFloater('CHEAT: +10 LVL', this.player.x, this.player.y, '#ff00ff');
        }

        // Check death
        if (this.player.hp <= 0) {
            this.state = STATE.DEAD;
            Dialogue.show(['Oh nei... Du gikk ned!', 'Men kjeppen din lyser fortsatt.', 'Prøv igjen!'], 'GAME OVER', () => {
                this._respawn();
            });
            return;
        }

        // Check EXP gains from dead enemies
        const dead = this.spawner.enemies.filter(e => e.dead && e.deathTimer > 0.3);
        for (const e of dead) {
            if (e._expGiven) continue;
            e._expGiven = true;
            const mobExp = Math.floor(5 * Math.pow(this.player.level, 1.5));
            const results = this.player.gainExp(mobExp);
            HUD.addFloater(`+${mobExp} EXP`, e.x + e.w / 2, e.y, '#ffff00');
            this._handleLevelResults(results);
        }

        // Check portal / boss trigger
        if (this.pendingBoss && !LevelUp.active && !PowerAward.active && !Dialogue.active) {
            this.pendingBoss = false;
            this._spawnBoss();
            return;
        }

        // Hit detection for Overworld enemies
        if (this.player.attacking) {
            const ar = this.player.getAttackRect();
            if (ar) {
                for (const e of this.spawner.enemies) {
                    if (!e.dead && !this.player.hitEntities.has(e.id) && rectsOverlap(ar, { x: e.x, y: e.y, w: e.w, h: e.h })) {
                        this.player.hitEntities.add(e.id);
                        let dmg = Math.floor(5 + 3 * this.player.level + 0.05 * Math.pow(this.player.level, 2));
                        if (this.player.buffs && this.player.buffs.stjernekraft > 0) dmg *= 2; // Star power!
                        e.takeDamage(dmg);
                        HUD.addFloater(`${dmg}`, e.x + e.w / 2, e.y - 4, '#ff8040');
                    }
                }
            }
        }

        // Entrance with E key
        if (Input.isJust('e') || Input.isJust('E')) {
            const pc = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
            const pr = Math.floor((this.player.y + this.player.h - 4) / TILE_SIZE);
            const tile = this.player.getInteractTile(this.currentMap);
            const portal = WorldMap.portalAt(pc, pr) || WorldMap.portalAt(tile.col, tile.row);
            if (portal) {
                this._preInteriorPos = { x: this.player.x, y: this.player.y };
                this._enterInterior(portal.interior, portal.label);
            }
        }
    },

    _updateInterior(dt) {
        this.player.update(dt, this._interiorMap());
        Camera.follow(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
        const enemyDt = this.globalStunTimer > 0 ? 0 : dt;
        for (const npc of this.interiorNPCs) npc.update(enemyDt);

        if (Input.isJust(' ')) this._handleSpaceInterior();

        // Active Power (can use in caves too)
        if (Input.isJust('f') || Input.isJust('F')) {
            this.player.useActivePower();
        }

        // Open UI
        if (Input.isJust('b') || Input.isJust('B')) Inventory.active = true;

        // CHEAT CODE
        if (Input.isJust('l') || Input.isJust('L')) {
            const results = this.player.cheatLevelUp(10);
            this._handleLevelResults(results);
            HUD.addFloater('CHEAT: +10 LVL', this.player.x, this.player.y, '#ff00ff');
        }

        // Handle E for exit
        if (Input.isJust('e') || Input.isJust('E')) {
            const pc = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
            const pr = Math.floor((this.player.y + this.player.h - 4) / TILE_SIZE);
            for (const p of this.interiorPortals) {
                if (Math.abs(p.col - pc) <= 1 && Math.abs(p.row - pr) <= 1) {
                    this._exitInterior(p);
                    return;
                }
            }
        }
    },

    _updateBoss(dt) {
        this.player.update(dt, WorldMap);
        const enemyDt = this.globalStunTimer > 0 ? 0 : dt;
        if (this.boss) this.boss.update(enemyDt, this.player);
        Camera.follow(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);

        if (Input.isJust(' ')) this.player.startAttack();

        // Active Power
        if (Input.isJust('f') || Input.isJust('F')) {
            this.player.useActivePower();
        }

        // Open UI
        if (Input.isJust('b') || Input.isJust('B')) Inventory.active = true;

        // Hit detection: player attack vs boss
        const ar = this.player.getAttackRect();
        if (ar && this.boss && !this.boss.dead && !this.player.hitEntities.has('boss')) {
            if (rectsOverlap(ar, { x: this.boss.x, y: this.boss.y, w: this.boss.w, h: this.boss.h })) {
                this.player.hitEntities.add('boss');
                let dmg = Math.floor(5 + 3 * this.player.level + 0.05 * Math.pow(this.player.level, 2));
                if (this.player.buffs && this.player.buffs.stjernekraft > 0) dmg *= 2; // Star power!
                this.boss.takeDamage(dmg);
                HUD.addFloater(`${dmg}`, this.boss.x + 16, this.boss.y - 4, '#ff8040');
            }
        }

        // Boss defeated
        if (this.boss && this.boss.isFullyDead()) {
            const power = this.boss.power;
            if (power) {
                this.player.powers.push(power);
                PowerAward.show(power);
            } else {
                // Generic reward for bosses > 10
                Dialogue.show([
                    `Du beseiret gigant-dragen!`,
                    `Utrolig styrke!`,
                ], 'Seier!');
            }
            this.boss = null;
            this.state = STATE.OVERWORLD;
            this.spawner.reset();
        }

        // Player died during boss
        if (this.player.hp <= 0) {
            this.state = STATE.DEAD;
            Dialogue.show(['Dragen var for sterk...', 'Elias falt, men ånden hans lever!', 'Prøv igjen!'], 'GAME OVER', () => {
                this._respawn();
            });
        }
    },

    _updateDead() {
        // Dialogue handles respawn via callback
    },

    _handleSpaceOverworld() {
        // 1. Try attack
        this.player.startAttack();

        // 2. Try interact with NPC in front
        if (this.state === STATE.INTERIOR) return;
        const tile = this.player.getInteractTile(this.currentMap);
        // Check WorldMap portals by interact
        // (portal walk-in already handled — space does attack only on overworld)
    },

    _handleSpaceInterior() {
        this.player.startAttack();

        const tile = this.player.getInteractTile(this._interiorMap());

        // NPC interaction
        for (const npc of this.interiorNPCs) {
            const nc = Math.floor((npc.x + npc.w / 2) / TILE_SIZE);
            const nr = Math.floor((npc.y + npc.h / 2) / TILE_SIZE);
            if (Math.abs(nc - tile.col) <= 1 && Math.abs(nr - tile.row) <= 1) {
                Dialogue.show(npc.dialogue, npc.name);
                return;
            }
        }

        // Chest interaction
        for (const chest of this.interiorChests) {
            const cc = Math.floor((chest.x + chest.w / 2) / TILE_SIZE);
            const cr = Math.floor((chest.y + chest.h / 2) / TILE_SIZE);
            if (Math.abs(cc - tile.col) <= 1 && Math.abs(cr - tile.row) <= 1) {
                const reward = chest.open();
                if (reward) {
                    const msgs = [`${chest.label}`];

                    // Regular item (add to inventory as object with optional letter)
                    if (reward.item) {
                        this.player.items.push({
                            name: reward.item,
                            letter: reward.letter || null,
                            equipped: false,
                        });
                        msgs.push(`Du fant: ${reward.item}!`);
                    }

                    // Permanent stat boost
                    if (reward.statBoost) {
                        this.player.maxHp += reward.statBoost;
                        this.player.hp = this.player.maxHp;
                        msgs.push(`+${reward.statBoost} Maks HP permanent!`);
                    }

                    // EXP reward
                    const results = this.player.gainExp(reward.exp || 0);
                    if (reward.exp) msgs.push(`+${reward.exp} EXP`);

                    // Letter: open the letter-reader after dialogue closes
                    if (reward.letter) {
                        msgs.push('Du fant noe å lese...');
                        const letter = reward.letter;
                        Dialogue.show(msgs, '📦 Kiste', () => {
                            LetterReader.show(letter.title, letter.body);
                        });
                    } else {
                        Dialogue.show(msgs, '📦 Kiste');
                    }
                    this._handleLevelResults(results);
                } else {
                    Dialogue.show(['Kisten er allerede åpnet.'], '📦 Tom kiste');
                }
                return;
            }
        }
    },

    _handleLevelResults(results) {
        for (const r of results) {
            if (r.type === 'levelup') {
                const isBoss = r.level % 10 === 0;
                LevelUp.show(r.level, isBoss);
                if (isBoss) {
                    this.pendingBoss = true;
                }
            }
        }
    },

    _spawnBoss() {
        const bossNum = Math.floor(this.player.level / 10);
        // Spawn boss near player
        const bx = this.player.x + 60;
        const by = this.player.y - 40;
        this.boss = new Boss(bx, by, bossNum);
        this.state = STATE.BOSS;
        this.spawner.reset();
        Dialogue.show([
            `🐉 En eldgammel drage stiger frem!`,
            `"Du har vist stor styrke, Elias."`,
            `"Men la oss se om du kan beseire MEG!"`,
        ], `Drage Lv.${bossNum * 10}`);
    },

    _enterInterior(interiorId, label) {
        const interior = getInterior(interiorId);
        if (!interior) return;

        this.state = STATE.INTERIOR;
        this.interiorId = interiorId;
        this.interiorPortals = interior.portals || [];

        // Build NPC objects
        this.interiorNPCs = (interior.npcs || []).map(n =>
            new NPC(n.col, n.row, n.name, n.dialogue)
        );

        // Build Chest objects
        this.interiorChests = (interior.items || []).map(it =>
            new Chest(it.col, it.row, it.reward, it.label)
        );

        // Place player at entrance (just inside door, row 12)
        this.player.x = 9 * TILE_SIZE;
        this.player.y = 11 * TILE_SIZE;
        this.player.dir = 'up';

        // Reconfigure camera for interior size
        const imap = this._interiorMap();
        Camera.init(CANVAS_W, CANVAS_H, imap.pixelWidth(), imap.pixelHeight());
        Camera.x = 0; Camera.y = 0;

        this.showBanner(label || '🏠 Innendørs');
        this.spawner.reset();
    },

    _exitInterior(portal) {
        this.state = STATE.OVERWORLD;
        this.currentMap = WorldMap;
        this.interiorNPCs = [];
        this.interiorChests = [];
        this.interiorPortals = [];
        this.interiorId = null;

        // Place player at exact pre-entry pos
        if (this._preInteriorPos) {
            this.player.x = this._preInteriorPos.x;
            this.player.y = this._preInteriorPos.y;
        } else if (portal.tx !== undefined) {
            this.player.x = portal.tx * TILE_SIZE;
            this.player.y = portal.ty * TILE_SIZE;
        }
        this.player.dir = 'down';

        Camera.init(CANVAS_W, CANVAS_H, WorldMap.pixelWidth(), WorldMap.pixelHeight());
        this.showBanner('🌿 Elias\' verden');
    },

    _respawn() {
        this.player.hp = this.player.maxHp;
        this.player.x = 10 * TILE_SIZE;
        this.player.y = 10 * TILE_SIZE;
        this.state = STATE.OVERWORLD;
        this.currentMap = WorldMap;
        this.spawner.reset();
        this.boss = null;
        Camera.init(CANVAS_W, CANVAS_H, WorldMap.pixelWidth(), WorldMap.pixelHeight());
        this.showBanner('🌿 Tilbake i verden');
    },

    _interiorMap() {
        const interior = getInterior(this.interiorId);
        if (!interior) return WorldMap;
        return {
            cols: interior.cols,
            rows: interior.rows,
            data: interior.data,
            get(col, row) {
                if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return TILE.STONE;
                return this.data[row * this.cols + col];
            },
            isSolid(col, row) { return TileMap.isSolid(this.get(col, row)); },
            pixelWidth() { return this.cols * TILE_SIZE; },
            pixelHeight() { return this.rows * TILE_SIZE; },
        };
    },

    triggerGlobalSleep(time) {
        this.globalStunTimer = time;
        // Make enemies show sleep Zzz via visual change (in future), for now just stops them.
    },
    triggerGlobalFreeze(time) {
        this.globalStunTimer = time;
    },

    // ────────────────────────── RENDER ──────────────────────────────────
    render() {
        const ctx = this.ctx;
        const W = CANVAS_W, H = CANVAS_H;

        // Black background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        if (this.state === STATE.LOADING) return;

        // Follow player with camera
        const targetCamX = this.player.x + this.player.w / 2 - (W / Camera.scale) / 2;
        const targetCamY = this.player.y + this.player.h / 2 - (H / Camera.scale) / 2;
        Camera.x += (targetCamX - Camera.x) * 0.1;
        Camera.y += (targetCamY - Camera.y) * 0.1;

        // Apply screen shake
        let renderCamX = Camera.x;
        let renderCamY = Camera.y;
        if (this.screenShake > 0) {
            renderCamX += (Math.random() - 0.5) * 10 * this.screenShake;
            renderCamY += (Math.random() - 0.5) * 10 * this.screenShake;

            // Apply earthqauke damage if just started shaking loudly
            if (this.screenShake > 0.45 && this.state !== STATE.INTERIOR) {
                const dmg = Math.floor(5 + 3 * this.player.level + 0.05 * Math.pow(this.player.level, 2));
                for (const e of this.spawner.enemies) { e.takeDamage(dmg); HUD.addFloater(`${dmg}`, e.x, e.y, '#c08040'); }
                if (this.boss && !this.boss.dead) { this.boss.takeDamage(dmg); HUD.addFloater(`${dmg}`, this.boss.x, this.boss.y, '#c08040'); }
                this.screenShake = 0.4; // prevent double hit
            }
        }

        ctx.save();
        ctx.scale(Camera.scale, Camera.scale);
        ctx.translate(-Math.floor(renderCamX), -Math.floor(renderCamY));

        // Choose active map
        const map = (this.state === STATE.INTERIOR) ? this._interiorMap() : this.currentMap;

        // ── World space (camera-transformed) ────────────────────────
        Renderer.drawMap(ctx, map, Camera.x, Camera.y, W, H, Camera.scale);
        Renderer.drawEntities(ctx, this.interiorNPCs, this.interiorChests);
        if (this.state !== STATE.INTERIOR) {
            this.spawner.draw(ctx);
        }
        if (this.boss) this.boss.draw(ctx);
        this.player.draw(ctx);
        HUD.drawWorldFloaters(ctx, Camera);
        Camera.end(ctx);

        // ── HUD (fixed overlay, no camera) ──────────────────────────
        if (this.locationBanner.timer > 0) {
            const alpha = Math.min(1, this.locationBanner.timer * 2);
            HUD.drawLocationBanner(ctx, this.locationBanner.text, alpha, W);
        }

        HUD.draw(ctx, this.player, W, H);

        // Interaction hints
        this._drawInteractionHints(ctx);

        // ── UI overlays ──────────────────────────────────────────────
        Dialogue.draw(ctx, W, H);
        LevelUp.draw(ctx, W, H);
        PowerAward.draw(ctx, W, H);
        LetterReader.draw(ctx, W, H);
        Inventory.draw(ctx, W, H);
        Notebook.draw(ctx, W, H);
        FullMap.draw(ctx, W, H);
    },

    _drawInteractionHints(ctx) {
        if (this.state === STATE.OVERWORLD) {
            const pc = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
            const pr = Math.floor((this.player.y + this.player.h - 4) / TILE_SIZE);
            const tile = this.player.getInteractTile(this.currentMap);
            const portal = WorldMap.portalAt(pc, pr) || WorldMap.portalAt(tile.col, tile.row);
            if (portal) {
                const sx = (this.player.x + this.player.w / 2 - Camera.x) * Camera.scale;
                const sy = (this.player.y - Camera.y) * Camera.scale - 20;
                HUD.drawPrompt(ctx, sx, sy, `[E] Gå inn`);
            }
            return;
        }

        if (this.state !== STATE.INTERIOR) return;

        const pc = Math.floor((this.player.x + this.player.w / 2) / TILE_SIZE);
        const pr = Math.floor((this.player.y + this.player.h - 4) / TILE_SIZE);
        for (const p of this.interiorPortals) {
            if (Math.abs(p.col - pc) <= 1 && Math.abs(p.row - pr) <= 1) {
                const sx = (this.player.x + this.player.w / 2 - Camera.x) * Camera.scale;
                const sy = (this.player.y - Camera.y) * Camera.scale - 20;
                HUD.drawPrompt(ctx, sx, sy, `[E] Gå ut`);
                return;
            }
        }

        const tile = this.player.getInteractTile(this._interiorMap());

        // NPC nearby?
        for (const npc of this.interiorNPCs) {
            const nc = Math.floor((npc.x + npc.w / 2) / TILE_SIZE);
            const nr = Math.floor((npc.y + npc.h / 2) / TILE_SIZE);
            if (Math.abs(nc - tile.col) <= 1 && Math.abs(nr - tile.row) <= 1) {
                // Convert world to screen
                const sx = (npc.x + npc.w / 2 - Camera.x) * Camera.scale;
                const sy = (npc.y - Camera.y) * Camera.scale;
                HUD.drawPrompt(ctx, sx, sy, `[SPACE] Snakk`);
                break;
            }
        }

        // Chest nearby?
        for (const chest of this.interiorChests) {
            const cc = Math.floor((chest.x + chest.w / 2) / TILE_SIZE);
            const cr = Math.floor((chest.y + chest.h / 2) / TILE_SIZE);
            if (Math.abs(cc - tile.col) <= 1 && Math.abs(cr - tile.row) <= 1) {
                const sx = (chest.x + chest.w / 2 - Camera.x) * Camera.scale;
                const sy = (chest.y - Camera.y) * Camera.scale;
                HUD.drawPrompt(ctx, sx, sy, chest.opened ? `[Tom]` : `[SPACE] Åpne`);
                break;
            }
        }
    }
};

// ── Bootstrap ──────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    Game.init();
});
