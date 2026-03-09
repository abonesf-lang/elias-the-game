// worldmap.js — The overworld tile map (80×60 grid)
// Each value is a TILE constant

const WORLD_COLS = 240;
const WORLD_ROWS = 60;

// Helper shorthand
const G = TILE.GRASS;
const G2 = TILE.GRASS2;
const P = TILE.DIRT_PATH;
const W = TILE.WATER;
const TR = TILE.TREE;
const B = TILE.BUILDING;
const CV = TILE.CAVE;
const FL = TILE.FLOWER;
const SA = TILE.SAND;
const ST = TILE.STONE;
const DR = TILE.DOOR;
const FN = TILE.FENCE;
const TG = TILE.TALL_GRASS;

// Desert
const DS = TILE.DESERT_SAND;
const CA = TILE.CACTUS;
const RR = TILE.RED_ROCK;
const DB = TILE.DEAD_BUSH;

// Snow
const SN = TILE.SNOW;
const IC = TILE.ICE;
const PT = TILE.PINE_TREE;
const FR = TILE.FROZEN_ROCK;
const SP = TILE.SNOW_PATH;

// Build map as a flat array [row * WORLD_COLS + col]
function buildWorldMap() {
    // Start entirely grassy
    const map = new Array(WORLD_COLS * WORLD_ROWS).fill(G);

    function set(col, row, tile) {
        if (col >= 0 && col < WORLD_COLS && row >= 0 && row < WORLD_ROWS) {
            map[row * WORLD_COLS + col] = tile;
        }
    }

    function hline(col, row, len, tile) {
        for (let i = 0; i < len; i++) set(col + i, row, tile);
    }

    function vline(col, row, len, tile) {
        for (let i = 0; i < len; i++) set(col, row + i, tile);
    }

    function rect(col, row, w, h, tile) {
        for (let r = 0; r < h; r++) hline(col, row + r, w, tile);
    }

    function rectBorder(col, row, w, h, tile, fill) {
        rect(col, row, w, h, tile);
        if (fill !== undefined) rect(col + 1, row + 1, w - 2, h - 2, fill);
    }

    // ── Zone 1: Scattered grass variants & flowers (0 - 79) ────────
    const rng = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
    for (let r = 0; r < WORLD_ROWS; r++) {
        for (let c = 0; c < 80; c++) {
            const v = rng(r * 137 + c * 19);
            if (v < 0.1) set(c, r, G2);
            if (v > 0.92) set(c, r, FL);
        }
    }

    // ── Zone 2: Desert Base (80 - 159) ─────────────────────────────
    rect(80, 0, 80, WORLD_ROWS, DS);
    for (let r = 0; r < WORLD_ROWS; r++) {
        for (let c = 80; c < 160; c++) {
            const v = rng(r * 83 + c * 41);
            if (v < 0.04) set(c, r, DB);
            else if (v > 0.94) set(c, r, CA);
            else if (v > 0.91) set(c, r, RR);
        }
    }

    // ── Zone 3: Snow Base (160 - 239) ──────────────────────────────
    rect(160, 0, 80, WORLD_ROWS, SN);
    for (let r = 0; r < WORLD_ROWS; r++) {
        for (let c = 160; c < 240; c++) {
            const v = rng(r * 101 + c * 67);
            if (v < 0.1) set(c, r, PT);
            else if (v > 0.95) set(c, r, FR);
        }
    }

    // ── Water lake (Grasslands center-left) ────────────────────────
    rect(8, 18, 12, 8, W);
    rect(9, 17, 10, 1, W);
    rect(8, 26, 12, 1, SA);
    rect(9, 16, 8, 1, SA);

    // ── Sand beach around lake ─────────────────────────────────────────
    hline(7, 18, 1, SA); hline(20, 18, 1, SA);
    hline(7, 25, 14, SA);

    // ── Main dirt/stone paths ──────────────────────────────────────────
    // Spine through Grasslands
    vline(30, 0, WORLD_ROWS, P);
    // Main horizontal road crossing all zones (row 30)
    hline(0, 30, WORLD_COLS, P);

    // Grasslands branches
    vline(15, 0, 30, P);
    vline(55, 0, WORLD_ROWS, P);
    hline(0, 12, 30, P);
    hline(30, 45, 50, P);
    hline(55, 15, 25, P);

    // Desert spine
    vline(120, 0, WORLD_ROWS, P);
    hline(100, 15, 40, P);
    hline(80, 45, 40, P);

    // Snow spine (using snow path)
    vline(200, 0, WORLD_ROWS, SP);
    hline(180, 15, 40, SP);
    hline(180, 45, 40, SP);

    // Smooth the horizontal main road through Snow as snow path
    hline(160, 30, 80, SP);

    // ── Trees: Grassland forests ──────────────────────────────────
    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 14; c++) {
            const v = rng(r * 53 + c * 71);
            if (v < 0.55) set(c, r, TR);
        }
    }
    // Forest right side
    for (let r = 5; r < 25; r++) {
        for (let c = 62; c < 78; c++) {
            const v = rng(r * 29 + c * 43);
            if (v < 0.5) set(c, r, TR);
        }
    }
    // Forest bottom
    for (let r = 52; r < WORLD_ROWS; r++) {
        for (let c = 35; c < 78; c++) {
            const v = rng(r * 61 + c * 37);
            if (v < 0.45) set(c, r, TR);
        }
    }

    // Border walls between zones (with a gap at row 30)
    vline(79, 0, 30, ST); vline(79, 31, 29, ST);
    vline(159, 0, 30, RR); vline(159, 31, 29, RR);

    // ── Tall grass patches (encounter zones) ──────────────────────────
    // Grass
    rect(32, 5, 8, 5, TG);
    rect(40, 33, 10, 6, TG);
    rect(5, 35, 8, 4, TG);
    rect(20, 48, 12, 5, TG);
    // Desert
    rect(90, 10, 8, 5, DB);
    rect(130, 35, 10, 8, DB);
    // Snow
    rect(170, 10, 10, 5, SN);
    rect(210, 35, 12, 8, SN);

    // ── Oasis (Desert) ────────────────────────────────────────────────
    rect(140, 48, 8, 6, W);
    rectBorder(139, 47, 10, 8, SA);

    // ── Frozen Lake (Snow) ────────────────────────────────────────────
    rect(175, 5, 12, 8, IC);
    rectBorder(174, 4, 14, 10, SN);

    // ── Stone walls / ruins ────────────────────────────────────────────
    hline(35, 22, 10, ST);
    vline(35, 22, 6, ST);
    vline(44, 22, 6, ST);

    // ── Small house 1 (col 17, row 14) ────────────────────────────────
    rect(17, 14, 6, 5, B);
    set(20, 18, DR);
    hline(16, 19, 8, FN);

    // Bridge from the path at col 15 across the lake to house1 door (same tile as the bridge at col 15)
    hline(16, 18, 4, P); // cols 16–19 row 18: path bridge over water to the door
    set(20, 19, P);      // clear fence tile directly in front of the door

    // ── Small house 2 (col 34, row 8) ─────────────────────────────────
    rect(34, 8, 5, 5, B);
    set(36, 12, DR);

    // ── Small house 3 (col 57, row 18) ────────────────────────────────
    rect(57, 18, 6, 5, B);
    set(60, 22, DR);

    // ── Large building / shop (col 32, row 33) ────────────────────────
    rect(32, 33, 10, 8, B);
    hline(32, 33, 10, 0xa0); // darker roof row — just use stone recolor
    set(36, 40, DR);
    set(37, 40, DR);

    // ── House village cluster (col 4, row 38) ─────────────────────────
    rect(4, 38, 5, 4, B); set(6, 41, DR);
    rect(10, 38, 5, 4, B); set(12, 41, DR);
    rect(4, 44, 5, 4, B); set(6, 47, DR);
    hline(3, 48, 14, FN);

    // ── Desert Ruins / Village ────────────────────────────────────────
    rect(100, 20, 6, 5, B); set(103, 24, DR);
    rect(125, 40, 8, 5, B); set(128, 44, DR);

    // ── Snow Cabin ────────────────────────────────────────────────────
    rect(205, 15, 6, 5, B); set(208, 19, DR);

    // ── Cave 1: north-east mountains ──────────────────────────────────
    rect(58, 5, 6, 4, ST);
    set(60, 8, CV);
    set(61, 8, CV);

    // ── Cave 2: south-west cliffs ─────────────────────────────────────
    rect(2, 50, 6, 4, ST);
    set(4, 53, CV);

    // ── Cave 3: deep east grass ───────────────────────────────────────
    rect(72, 35, 6, 4, ST);
    set(74, 38, CV);

    // ── Cave 4: Desert tomb ───────────────────────────────────────────
    rect(145, 10, 6, 4, RR);
    set(147, 13, CV);

    // ── Cave 5: Ice Cave ──────────────────────────────────────────────
    rect(220, 50, 6, 4, FR);
    set(222, 53, CV);

    // ── Clear paths over structures (ensure walkable routes) ──────────
    // Clear the main cross-zone road perfectly
    hline(0, 30, WORLD_COLS, P);
    hline(160, 30, 80, SP); // snow path

    vline(30, 0, WORLD_ROWS, P);
    vline(55, 0, WORLD_ROWS, P);
    vline(120, 0, WORLD_ROWS, P);
    vline(200, 0, WORLD_ROWS, SP);

    hline(0, 12, 15, P);
    hline(30, 45, 50, P);
    hline(55, 15, 25, P);

    return map;
}

const WorldMap = {
    cols: WORLD_COLS,
    rows: WORLD_ROWS,
    data: buildWorldMap(),

    // Portal/entrance definitions: tile position → interior id
    portals: [
        { col: 20, row: 18, interior: 'house1', label: 'Elias\' hjem' },
        { col: 36, row: 12, interior: 'house2', label: 'Butikk' },
        { col: 60, row: 22, interior: 'house3', label: 'Gammel hytte' },
        { col: 36, row: 40, interior: 'shop', label: 'Eventyrernes hus' },
        { col: 6, row: 41, interior: 'village1', label: 'Landsbymann' },
        { col: 12, row: 41, interior: 'village2', label: 'Landsbymann' },
        { col: 60, row: 8, interior: 'cave1', label: 'Hule 1' },
        { col: 61, row: 8, interior: 'cave1', label: 'Hule 1' },
        { col: 4, row: 53, interior: 'cave2', label: 'Gammel grotte' },
        { col: 74, row: 38, interior: 'cave3', label: 'Dypet' },
        // Desert Portals
        { col: 103, row: 24, interior: 'house2', label: 'Ørkenhus' }, // reusing interior maps for now to save space
        { col: 128, row: 44, interior: 'shop', label: 'Ørkenbasar' },
        { col: 147, row: 13, interior: 'cave2', label: 'Faraos Grav' },
        // Snow Portals
        { col: 208, row: 19, interior: 'house3', label: 'Snøhytte' },
        { col: 222, row: 53, interior: 'cave3', label: 'Ishallen' },
    ],

    get(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return TILE.STONE;
        return this.data[row * this.cols + col];
    },

    isSolid(col, row) {
        return TileMap.isSolid(this.get(col, row));
    },

    portalAt(col, row) {
        return WorldMap.portals.find(p => p.col === col && p.row === row) || null;
    },

    pixelWidth() { return this.cols * TILE_SIZE; },
    pixelHeight() { return this.rows * TILE_SIZE; },
};
