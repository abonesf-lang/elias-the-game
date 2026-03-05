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
        this.player = new Player(30 * TILE_SIZE, 28 * TILE_SIZE);
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

        switch (this.state) {
            case STATE.OVERWORLD: this._updateOverworld(dt); break;
            case STATE.INTERIOR: this._updateInterior(dt); break;
            case STATE.BOSS: this._updateBoss(dt); break;
            case STATE.DEAD: this._updateDead(); break;
        }
    },

    _updateOverworld(dt) {
        this.player.update(dt, this.currentMap);
        this.spawner.update(dt, this.player, this.currentMap);
        Camera.follow(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);

        // Update interior NPCs if in interior mode (handled separately)
        for (const npc of this.interiorNPCs) npc.update(dt);

        // Player attack input
        if (Input.isJust(' ')) {
            if (!Dialogue.active) this._handleSpaceOverworld();
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
            const results = this.player.gainExp(e.exp);
            HUD.addFloater(`+${e.exp} EXP`, e.x + e.w / 2, e.y, '#ffff00');
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
                        const dmg = 5 + this.player.level * 2;
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
        for (const npc of this.interiorNPCs) npc.update(dt);

        if (Input.isJust(' ')) this._handleSpaceInterior();

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
        if (!this.boss) return;
        this.player.update(dt, this.currentMap);
        this.boss.update(dt, this.player);
        Camera.follow(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);

        if (Input.isJust(' ')) this.player.startAttack();

        // Hit detection: player attack vs boss
        const ar = this.player.getAttackRect();
        if (ar && !this.boss.dead && !this.player.hitEntities.has('boss')) {
            if (rectsOverlap(ar, { x: this.boss.x, y: this.boss.y, w: this.boss.w, h: this.boss.h })) {
                this.player.hitEntities.add('boss');
                this.boss.takeDamage(5 + this.player.level * 2);
                HUD.addFloater(`${5 + this.player.level * 2}`, this.boss.x + 16, this.boss.y - 4, '#ff8040');
            }
        }

        // Boss defeated
        if (this.boss.isFullyDead()) {
            const power = this.boss.power;
            this.player.powers.push(power);
            PowerAward.show(power);
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
                    const results = this.player.gainExp(reward.exp || 0);
                    Dialogue.show([
                        `${chest.label}`,
                        `Du fant: ${reward.item}!`,
                        `+${reward.exp} EXP`,
                    ], '📦 Kiste');
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
        this.player.x = 30 * TILE_SIZE;
        this.player.y = 28 * TILE_SIZE;
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

    // ────────────────────────── RENDER ──────────────────────────────────
    render() {
        const ctx = this.ctx;
        const W = CANVAS_W, H = CANVAS_H;

        // Black background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        if (this.state === STATE.LOADING) return;

        // Choose active map
        const map = (this.state === STATE.INTERIOR) ? this._interiorMap() : this.currentMap;

        // ── World space (camera-transformed) ────────────────────────
        Camera.begin(ctx);
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
