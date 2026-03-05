// worldmap.js — The overworld tile map (80×60 grid)
// Each value is a TILE constant

const WORLD_COLS = 80;
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

    // ── Scattered grass variants & flowers ─────────────────────────────
    const rng = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
    for (let r = 0; r < WORLD_ROWS; r++) {
        for (let c = 0; c < WORLD_COLS; c++) {
            const v = rng(r * 137 + c * 19);
            if (v < 0.1) set(c, r, G2);
            if (v > 0.92) set(c, r, FL);
        }
    }

    // ── Water lake (center-left) ────────────────────────────────────────
    rect(8, 18, 12, 8, W);
    rect(9, 17, 10, 1, W);
    rect(8, 26, 12, 1, SA);
    rect(9, 16, 8, 1, SA);

    // ── Sand beach around lake ─────────────────────────────────────────
    hline(7, 18, 1, SA); hline(20, 18, 1, SA);
    hline(7, 25, 14, SA);

    // ── Main dirt paths ────────────────────────────────────────────────
    // Vertical spine: col 30
    vline(30, 0, WORLD_ROWS, P);
    // Horizontal main road: row 30
    hline(0, 30, WORLD_COLS, P);
    // Branch north-west
    vline(15, 0, 30, P);
    // Branch east side
    vline(55, 0, WORLD_ROWS, P);
    // Horizontal cross roads
    hline(0, 12, 30, P);
    hline(30, 45, 50, P);
    hline(55, 15, 25, P);

    // ── Trees: forest top-left ─────────────────────────────────────────
    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 14; c++) {
            const v = rng(r * 53 + c * 71);
            if (v < 0.55) set(c, r, TR);
        }
    }
    // Forest right side
    for (let r = 5; r < 25; r++) {
        for (let c = 62; c < WORLD_COLS; c++) {
            const v = rng(r * 29 + c * 43);
            if (v < 0.5) set(c, r, TR);
        }
    }
    // Forest bottom
    for (let r = 52; r < WORLD_ROWS; r++) {
        for (let c = 35; c < WORLD_COLS; c++) {
            const v = rng(r * 61 + c * 37);
            if (v < 0.45) set(c, r, TR);
        }
    }

    // ── Tall grass patches (encounter zones) ──────────────────────────
    rect(32, 5, 8, 5, TG);
    rect(40, 33, 10, 6, TG);
    rect(5, 35, 8, 4, TG);
    rect(20, 48, 12, 5, TG);

    // ── Stone walls / ruins ────────────────────────────────────────────
    hline(35, 22, 10, ST);
    vline(35, 22, 6, ST);
    vline(44, 22, 6, ST);

    // ── Small house 1 (col 17, row 14) ────────────────────────────────
    rect(17, 14, 6, 5, B);
    set(20, 18, DR);
    hline(16, 19, 8, FN);

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

    // ── Cave 1: north-east mountains ──────────────────────────────────
    rect(58, 5, 6, 4, ST);
    set(60, 8, CV);
    set(61, 8, CV);

    // ── Cave 2: south-west cliffs ─────────────────────────────────────
    rect(2, 50, 6, 4, ST);
    set(4, 53, CV);

    // ── Cave 3: deep east ─────────────────────────────────────────────
    rect(72, 35, 6, 4, ST);
    set(74, 38, CV);

    // ── Clear paths over structures (ensure walkable routes) ──────────
    // Main horizontal road clear
    hline(0, 30, WORLD_COLS, P);
    vline(30, 0, WORLD_ROWS, P);
    vline(55, 0, WORLD_ROWS, P);
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
