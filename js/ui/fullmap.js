// fullmap.js — Renders the entire 240x60 map on screen with player cursor
const FullMap = {
    active: false,
    blinkTimer: 0,
    blinkState: true,

    update(dt) {
        if (!this.active) return;

        this.blinkTimer += dt;
        if (this.blinkTimer > 0.4) {
            this.blinkTimer = 0;
            this.blinkState = !this.blinkState;
        }

        if (Input.isJust('m') || Input.isJust('M') || Input.isJust('Escape')) {
            this.active = false;
        }
    },

    draw(ctx, W, H) {
        if (!this.active) return;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, W, H);

        const mapW = WorldMap.cols; // 240
        const mapH = WorldMap.rows; // 60

        // Size each tile to fit the screen
        // Canvas is 480x320. 240 tiles * 2px = 480px!
        const tw = 2; // px width
        const th = 2; // px height

        // Center vertically (60 tiles * 2px = 120px)
        const ox = (W - (mapW * tw)) / 2;
        const oy = (H - (mapH * th)) / 2 - 10;

        // Draw map pixels fast
        ctx.fillStyle = '#111';
        ctx.fillRect(ox - 2, oy - 2, (mapW * tw) + 4, (mapH * th) + 4);

        for (let r = 0; r < mapH; r++) {
            for (let c = 0; c < mapW; c++) {
                const id = WorldMap.get(c, r);
                // Simplify tile colors for the minimap
                ctx.fillStyle = this._getMapColor(id);
                ctx.fillRect(ox + c * tw, oy + r * th, tw, th);
            }
        }

        // Draw Player location
        if (Game.player && this.blinkState) {
            const pc = Math.floor(Game.player.x / TILE_SIZE);
            const pr = Math.floor(Game.player.y / TILE_SIZE);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(ox + pc * tw - 1, oy + pr * th - 1, 4, 4);
        }

        // Labels / Borders
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('ELIAS\' VERDEN — [M] Lukk', W / 2, oy + mapH * th + 20);

        // Zone Names
        ctx.font = '6px "Press Start 2P"';
        ctx.fillStyle = '#aaffaa'; ctx.fillText('Gressletta (1-10)', ox + 40 * tw, oy - 8);
        ctx.fillStyle = '#ffaa66'; ctx.fillText('Scorched Desert (11-20)', ox + 120 * tw, oy - 8);
        ctx.fillStyle = '#aaccff'; ctx.fillText('Frozen Peaks (21+)', ox + 200 * tw, oy - 8);
    },

    _getMapColor(id) {
        // Fast hardcoded minimap colors based on TILE constants
        switch (id) {
            case TILE.GRASS: case TILE.GRASS2: return '#3e7a2e';
            case TILE.DIRT_PATH: return '#b89456';
            case TILE.WATER: return '#2060c8';
            case TILE.TREE: return '#1e5018';
            case TILE.BUILDING: return '#a87850';
            case TILE.CAVE: return '#201810';
            case TILE.FLOWER: return '#c84078';
            case TILE.SAND: return '#c8b070';
            case TILE.STONE: return '#707878';
            case TILE.TALL_GRASS: return '#2a7020';
            case TILE.DESERT_SAND: return '#e8cca0';
            case TILE.CACTUS: return '#308020';
            case TILE.RED_ROCK: return '#c06040';
            case TILE.DEAD_BUSH: return '#a08870';
            case TILE.SNOW: return '#f0f8ff';
            case TILE.ICE: return '#a0e0ff';
            case TILE.PINE_TREE: return '#186040';
            case TILE.FROZEN_ROCK: return '#90a8b8';
            default: return '#000000';
        }
    }
};
