// camera.js — Smooth follow camera
const Camera = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    scale: 3,        // 3× pixel upscale for retro look
    worldW: 0,
    worldH: 0,

    init(canvasW, canvasH, worldPixelW, worldPixelH) {
        this.width = canvasW;
        this.height = canvasH;
        this.worldW = worldPixelW;
        this.worldH = worldPixelH;
    },

    follow(targetX, targetY) {
        // Center on target
        let cx = targetX - (this.width / this.scale) / 2;
        let cy = targetY - (this.height / this.scale) / 2;
        // Clamp to world bounds
        cx = Math.max(0, Math.min(cx, this.worldW - this.width / this.scale));
        cy = Math.max(0, Math.min(cy, this.worldH - this.height / this.scale));
        // Smooth lerp
        this.x += (cx - this.x) * 0.12;
        this.y += (cy - this.y) * 0.12;
    },

    // Apply camera transform to ctx
    begin(ctx) {
        ctx.save();
        ctx.scale(this.scale, this.scale);
        ctx.translate(-Math.floor(this.x), -Math.floor(this.y));
    },

    end(ctx) {
        ctx.restore();
    },

    // Convert screen coords → world coords
    screenToWorld(sx, sy) {
        return {
            x: sx / this.scale + this.x,
            y: sy / this.scale + this.y
        };
    }
};
