// renderer.js — Draws the world map (tiles + decorations)
const Renderer = {
    // Animated water frame
    waterFrame: 0,
    waterTimer: 0,

    update(dt) {
        this.waterTimer += dt;
        if (this.waterTimer > 0.5) { this.waterTimer = 0; this.waterFrame ^= 1; }
    },

    drawMap(ctx, mapData, camX, camY, canvasW, canvasH, scale) {
        // Calculate visible tile range
        const tileX0 = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
        const tileY0 = Math.max(0, Math.floor(camY / TILE_SIZE) - 1);
        const tileX1 = Math.min(mapData.cols - 1, Math.floor((camX + canvasW / scale) / TILE_SIZE) + 1);
        const tileY1 = Math.min(mapData.rows - 1, Math.floor((camY + canvasH / scale) / TILE_SIZE) + 1);

        for (let row = tileY0; row <= tileY1; row++) {
            for (let col = tileX0; col <= tileX1; col++) {
                const tileId = mapData.get(col, row);
                TileMap.drawTile(ctx, tileId, col, row);
            }
        }
    },

    // Draw NPCs or chests that live in an interior/map
    drawEntities(ctx, npcs, chests) {
        if (chests) for (const c of chests) c.draw(ctx);
        if (npcs) for (const n of npcs) n.draw(ctx);
    },

    // Draw a subtle grid overlay for debugging (press G to toggle)
    drawDebugGrid(ctx, camX, camY, canvasW, canvasH, scale) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 0.5;
        const tileX0 = Math.floor(camX / TILE_SIZE);
        const tileY0 = Math.floor(camY / TILE_SIZE);
        const tileX1 = Math.ceil((camX + canvasW / scale) / TILE_SIZE);
        const tileY1 = Math.ceil((camY + canvasH / scale) / TILE_SIZE);
        for (let col = tileX0; col <= tileX1; col++) {
            ctx.beginPath();
            ctx.moveTo(col * TILE_SIZE, tileY0 * TILE_SIZE);
            ctx.lineTo(col * TILE_SIZE, tileY1 * TILE_SIZE);
            ctx.stroke();
        }
        for (let row = tileY0; row <= tileY1; row++) {
            ctx.beginPath();
            ctx.moveTo(tileX0 * TILE_SIZE, row * TILE_SIZE);
            ctx.lineTo(tileX1 * TILE_SIZE, row * TILE_SIZE);
            ctx.stroke();
        }
    }
};
