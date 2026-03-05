// dialogue.js — RPG typewriter dialogue box
const Dialogue = {
    active: false,
    lines: [],
    currentLine: 0,
    displayText: '',
    charIndex: 0,
    charTimer: 0,
    charDelay: 0.035,  // seconds per character
    speakerName: '',
    onClose: null,

    show(lines, speakerName, onClose) {
        this.active = true;
        this.lines = Array.isArray(lines) ? lines : [lines];
        this.currentLine = 0;
        this.displayText = '';
        this.charIndex = 0;
        this.charTimer = 0;
        this.speakerName = speakerName || '';
        this.onClose = onClose || null;
    },

    advance() {
        if (!this.active) return;
        // If still typing, show full line immediately
        if (this.charIndex < this.lines[this.currentLine].length) {
            this.displayText = this.lines[this.currentLine];
            this.charIndex = this.lines[this.currentLine].length;
            return;
        }
        // Next line
        this.currentLine++;
        if (this.currentLine >= this.lines.length) {
            this.active = false;
            if (this.onClose) this.onClose();
        } else {
            this.displayText = '';
            this.charIndex = 0;
        }
    },

    update(dt) {
        if (!this.active) return;
        if (this.charIndex < this.lines[this.currentLine].length) {
            this.charTimer += dt;
            while (this.charTimer >= this.charDelay && this.charIndex < this.lines[this.currentLine].length) {
                this.charTimer -= this.charDelay;
                this.displayText += this.lines[this.currentLine][this.charIndex];
                this.charIndex++;
            }
        }
    },

    draw(ctx, canvasW, canvasH) {
        if (!this.active) return;

        const boxH = 58;
        const boxY = canvasH - boxH - 44;
        const boxX = 8;
        const boxW = canvasW - 16;

        // Box background
        ctx.fillStyle = 'rgba(10,16,10,0.92)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = '#60c080';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        // Inner border
        ctx.strokeStyle = 'rgba(96,192,128,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 3, boxY + 3, boxW - 6, boxH - 6);

        // Speaker name badge
        if (this.speakerName) {
            ctx.fillStyle = '#60c080';
            ctx.fillRect(boxX + 8, boxY - 10, this.speakerName.length * 6 + 12, 12);
            ctx.fillStyle = '#0a160a';
            ctx.font = '5px "Press Start 2P", monospace';
            ctx.fillText(this.speakerName, boxX + 14, boxY - 1);
        }

        // Message text (word-wrapped)
        ctx.fillStyle = '#d0f0d0';
        ctx.font = '5px "Press Start 2P", monospace';
        const maxW = boxW - 20;
        const words = this.displayText.split(' ');
        let line = '';
        let lineY = boxY + 18;
        for (const word of words) {
            const test = line + (line ? ' ' : '') + word;
            if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line, boxX + 10, lineY);
                line = word;
                lineY += 12;
            } else {
                line = test;
            }
        }
        if (line) ctx.fillText(line, boxX + 10, lineY);

        // Continue arrow (blink)
        const done = this.charIndex >= this.lines[this.currentLine].length;
        if (done) {
            const blink = Math.floor(Date.now() / 400) % 2 === 0;
            if (blink) {
                ctx.fillStyle = '#60c080';
                ctx.font = '6px monospace';
                ctx.fillText('▼', boxX + boxW - 18, boxY + boxH - 8);
            }
            ctx.fillStyle = '#608060';
            ctx.font = '4px "Press Start 2P", monospace';
            const isLast = this.currentLine >= this.lines.length - 1;
            ctx.textAlign = 'right';
            ctx.fillText(isLast ? '[SPACE: Lukk]' : '[SPACE: Neste]', boxX + boxW - 6, boxY + boxH - 4);
            ctx.textAlign = 'left';
        }

        ctx.lineWidth = 1;
    }
};
