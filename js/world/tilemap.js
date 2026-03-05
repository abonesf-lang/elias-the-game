// tilemap.js — Tile definitions and rendering
const TILE = {
    GRASS: 0,
    GRASS2: 1,  // slight variation
    DIRT_PATH: 2,
    WATER: 3,
    TREE: 4,
    BUILDING: 5,
    CAVE: 6,
    FLOWER: 7,
    SAND: 8,
    STONE: 9,
    DOOR: 10,
    FENCE: 11,
    TALL_GRASS: 12,
    // Desert
    DESERT_SAND: 13,
    CACTUS: 14,
    RED_ROCK: 15,
    DEAD_BUSH: 16,
    // Snow
    SNOW: 17,
    ICE: 18,
    PINE_TREE: 19,
    FROZEN_ROCK: 20,
    SNOW_PATH: 21
};

const TILE_SIZE = 16; // base tile size in pixels (scaled 3× by camera)

// Is this tile solid (can't walk through)?
const SOLID_TILES = new Set([
    TILE.TREE, TILE.BUILDING, TILE.WATER, TILE.STONE, TILE.FENCE,
    TILE.CACTUS, TILE.RED_ROCK, TILE.PINE_TREE, TILE.FROZEN_ROCK
]);

// Does this tile trigger a "tall grass" random encounter?
const ENCOUNTER_TILES = new Set([TILE.TALL_GRASS, TILE.DEAD_BUSH, TILE.SNOW]);

// Color palette for each tile type (drawn via Canvas 2D)
const TILE_COLORS = {
    [TILE.GRASS]: ['#4a8a38', '#3e7a2e'],
    [TILE.GRASS2]: ['#529040', '#44803a'],
    [TILE.DIRT_PATH]: ['#c8a865', '#b89456'],
    [TILE.WATER]: ['#2060c8', '#1850a8'],
    [TILE.TREE]: ['#1e5018', '#143a10'],
    [TILE.BUILDING]: ['#a87850', '#987040'],
    [TILE.CAVE]: ['#302820', '#201810'],
    [TILE.FLOWER]: ['#e85090', '#c84078'],
    [TILE.SAND]: ['#d8c080', '#c8b070'],
    [TILE.STONE]: ['#808888', '#707878'],
    [TILE.DOOR]: ['#804028', '#602010'],
    [TILE.FENCE]: ['#a08050', '#907040'],
    [TILE.TALL_GRASS]: ['#388a28', '#2a7020'],
    // Desert
    [TILE.DESERT_SAND]: ['#e8cca0', '#d8ba88'],
    [TILE.CACTUS]: ['#40a030', '#308020'],
    [TILE.RED_ROCK]: ['#c06040', '#a04830'],
    [TILE.DEAD_BUSH]: ['#a08870', '#887058'],
    // Snow
    [TILE.SNOW]: ['#f0f8ff', '#d0e8f8'],
    [TILE.ICE]: ['#a0e0ff', '#80c8f0'],
    [TILE.PINE_TREE]: ['#186040', '#104830'],
    [TILE.FROZEN_ROCK]: ['#90a8b8', '#7890a0'],
    [TILE.SNOW_PATH]: ['#c8d8e8', '#b0c0d0'],
};

const TileMap = {
    tileSize: TILE_SIZE,

    isSolid(tileId) {
        return SOLID_TILES.has(tileId);
    },

    isEncounter(tileId) {
        return ENCOUNTER_TILES.has(tileId);
    },

    // Draw a single tile at grid coords (gx, gy)
    drawTile(ctx, tileId, gx, gy) {
        const x = gx * TILE_SIZE;
        const y = gy * TILE_SIZE;
        const T = TILE_SIZE;
        const colors = TILE_COLORS[tileId] || ['#4a8a38', '#3e7a2e'];

        // Base fill
        ctx.fillStyle = colors[0];
        ctx.fillRect(x, y, T, T);

        // Tile-specific decoration
        switch (tileId) {
            case TILE.GRASS:
            case TILE.GRASS2:
                // small darker patches for texture
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 2, y + 3, 3, 2);
                ctx.fillRect(x + 9, y + 10, 4, 2);
                break;

            case TILE.TALL_GRASS:
                ctx.fillStyle = colors[1];
                for (let i = 0; i < 4; i++) {
                    ctx.fillRect(x + 2 + i * 3, y + 3, 2, 8);
                }
                break;

            case TILE.DIRT_PATH:
            case TILE.SNOW_PATH:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 1, y + 1, T - 2, 1);
                ctx.fillRect(x + 1, y + T - 2, T - 2, 1);
                break;

            case TILE.WATER:
                // animated via a shimmer pattern
                ctx.fillStyle = '#4090e8';
                ctx.fillRect(x + 1, y + 5, 6, 2);
                ctx.fillRect(x + 9, y + 10, 5, 2);
                ctx.fillStyle = '#80c0ff';
                ctx.fillRect(x + 3, y + 5, 2, 1);
                ctx.fillRect(x + 10, y + 10, 2, 1);
                break;

            case TILE.TREE:
                // trunk
                ctx.fillStyle = '#6a3b1a';
                ctx.fillRect(x + 6, y + 9, 4, 7);
                // canopy layers
                ctx.fillStyle = '#226018';
                ctx.fillRect(x + 2, y + 6, 12, 7);
                ctx.fillStyle = '#2a8020';
                ctx.fillRect(x + 4, y + 2, 8, 7);
                ctx.fillStyle = '#38a028';
                ctx.fillRect(x + 6, y + 0, 4, 5);
                break;

            case TILE.BUILDING:
                // wall top
                ctx.fillStyle = '#c08860';
                ctx.fillRect(x, y, T, 6);
                // roof detail
                ctx.fillStyle = '#e07030';
                ctx.fillRect(x, y, T, 3);
                break;

            case TILE.CAVE:
                // dark cave mouth oval
                ctx.fillStyle = '#100c08';
                ctx.beginPath();
                ctx.ellipse(x + 8, y + 10, 6, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                // stone edges
                ctx.fillStyle = '#504840';
                ctx.fillRect(x, y, T, 5);
                break;

            case TILE.FLOWER:
                ctx.fillStyle = '#4a8a38';  // grass base
                ctx.fillRect(x, y, T, T);
                ctx.fillStyle = '#e85090';
                for (let fx of [3, 10]) {
                    ctx.fillRect(x + fx, y + 4, 3, 3);
                    ctx.fillStyle = '#ffff80';
                    ctx.fillRect(x + fx + 1, y + 5, 1, 1);
                    ctx.fillStyle = '#e85090';
                }
                break;

            case TILE.STONE:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
                ctx.fillStyle = '#909898';
                ctx.fillRect(x + 3, y + 3, 4, 4);
                break;

            case TILE.FENCE:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x, y + 6, T, 3);
                ctx.fillStyle = colors[0];
                ctx.fillRect(x + 3, y + 2, 2, 12);
                ctx.fillRect(x + 11, y + 2, 2, 12);
                break;

            case TILE.SAND:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 2, y + 2, 3, 2);
                ctx.fillRect(x + 10, y + 9, 3, 2);
                break;

            case TILE.DOOR:
                ctx.fillStyle = '#a04820';
                ctx.fillRect(x + 4, y + 3, 8, 13);
                ctx.fillStyle = '#c06030';
                ctx.fillRect(x + 5, y + 4, 6, 9);
                ctx.fillStyle = '#f0a000';
                ctx.fillRect(x + 10, y + 8, 2, 2);
                break;

            // DESERT
            case TILE.DESERT_SAND:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 3, y + 4, 2, 1);
                ctx.fillRect(x + 11, y + 10, 2, 1);
                break;
            case TILE.CACTUS:
                ctx.fillStyle = colors[1]; // shadow
                ctx.fillRect(x + 5, y + 2, 6, 14);
                ctx.fillStyle = colors[0];
                ctx.fillRect(x + 6, y + 2, 4, 14);
                ctx.fillRect(x + 2, y + 6, 4, 3);
                ctx.fillRect(x + 10, y + 4, 4, 3);
                ctx.fillStyle = '#a0ff80'; // spikes
                ctx.fillRect(x + 5, y + 4, 1, 1); ctx.fillRect(x + 10, y + 10, 1, 1);
                break;
            case TILE.RED_ROCK:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
                ctx.fillStyle = colors[0];
                ctx.beginPath(); ctx.moveTo(x + 2, y + T - 2); ctx.lineTo(x + T / 2, y + 2); ctx.lineTo(x + T - 2, y + T - 2); ctx.fill();
                break;
            case TILE.DEAD_BUSH:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 6, y + 8, 4, 6);
                ctx.fillStyle = colors[0];
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(x + 2 + i * 4, y + 4 + (i % 2) * 2, 4, 4);
                }
                break;

            // SNOW
            case TILE.SNOW:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 2, y + 2, 3, 2);
                ctx.fillRect(x + 10, y + 9, 4, 2);
                ctx.fillStyle = '#ffffff'; // sparkle
                ctx.fillRect(x + 4, y + 5, 1, 1);
                break;
            case TILE.ICE:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 4, y + 4, 8, 8);
                ctx.fillStyle = '#ffffff'; // gleam
                ctx.fillRect(x + 6, y + 6, 4, 1);
                ctx.fillRect(x + 6, y + 6, 1, 4);
                break;
            case TILE.PINE_TREE:
                ctx.fillStyle = '#402810'; // trunk
                ctx.fillRect(x + 6, y + 10, 4, 6);
                ctx.fillStyle = colors[1]; // shadow canopy
                ctx.beginPath(); ctx.moveTo(x + 8, y + 0); ctx.lineTo(x + 14, y + 12); ctx.lineTo(x + 2, y + 12); ctx.fill();
                ctx.fillStyle = colors[0]; // main canopy
                ctx.beginPath(); ctx.moveTo(x + 8, y + 0); ctx.lineTo(x + 12, y + 10); ctx.lineTo(x + 4, y + 10); ctx.fill();
                ctx.fillStyle = '#ffffff'; // snow on branches
                ctx.fillRect(x + 6, y + 3, 4, 2); ctx.fillRect(x + 4, y + 7, 3, 2); ctx.fillRect(x + 10, y + 8, 3, 2);
                break;
            case TILE.FROZEN_ROCK:
                ctx.fillStyle = colors[1];
                ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
                ctx.fillStyle = '#ffffff'; // snow cap
                ctx.fillRect(x + 2, y + 1, 12, 4);
                ctx.fillRect(x + 4, y + 5, 8, 2);
                break;
        }
    }
};
