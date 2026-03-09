// inventory.js — Inventory screen for items, powers, and the Notebook
const Inventory = {
    active: false,
    cursorIndex: 0,  // power grid cursor
    itemCursor: 0,   // item list cursor

    // Returns deduplicated item list: [{ count, item }]
    _uniqueItems() {
        const items = Game.player.items || [];
        const map = new Map();
        for (const it of items) {
            const name = (typeof it === 'object') ? it.name : it;
            const obj  = (typeof it === 'object') ? it : { name: it, letter: null, equipped: false };
            if (map.has(name)) {
                map.get(name).count++;
            } else {
                map.set(name, { count: 1, item: obj });
            }
        }
        return [...map.values()];
    },

    update(dt) {
        if (!this.active) return;

        const unique = this._uniqueItems();

        // ── Item cursor (up / down) ──────────────────────────────
        if (Input.isJust('ArrowUp')) {
            this.itemCursor = Math.max(0, this.itemCursor - 1);
        }
        if (Input.isJust('ArrowDown')) {
            this.itemCursor = Math.min(Math.max(0, unique.length - 1), this.itemCursor + 1);
        }

        const sel = unique[this.itemCursor];

        // ── Read letter [R] ──────────────────────────────────────
        if ((Input.isJust('r') || Input.isJust('R')) && sel?.item?.letter) {
            this.active = false;
            LetterReader.show(sel.item.letter.title, sel.item.letter.body);
            return;
        }

        // ── Equip / unequip item [E] ─────────────────────────────
        if ((Input.isJust('e') || Input.isJust('E')) && sel) {
            const item = sel.item;
            if (Game.player.equippedItem === item) {
                // Unequip
                item.equipped = false;
                Game.player.equippedItem = null;
            } else {
                // Swap equip
                if (Game.player.equippedItem) Game.player.equippedItem.equipped = false;
                item.equipped = true;
                Game.player.equippedItem = item;
            }
        }

        // ── Power grid cursor (left / right) ─────────────────────
        if (Input.isJust('ArrowLeft')) {
            this.cursorIndex = Math.max(0, this.cursorIndex - 1);
        }
        if (Input.isJust('ArrowRight')) {
            this.cursorIndex = Math.min(Game.player.powers.length - 1, this.cursorIndex + 1);
        }

        // ── Equip power [Space] ──────────────────────────────────
        if (Input.isJust(' ') && Game.player.powers.length > 0) {
            Game.player.activePower = Game.player.powers[this.cursorIndex];
        }

        // ── Close [B / Escape] ───────────────────────────────────
        if (Input.isJust('b') || Input.isJust('B') || Input.isJust('Escape')) {
            this.active = false;
        }
    },

    draw(ctx, W, H) {
        if (!this.active) return;

        // Semi-transparent dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, W, H);

        const cx = W / 2;
        let y = 30;

        // Window background
        ctx.fillStyle = '#181820';
        ctx.strokeStyle = '#d8c080';
        ctx.lineWidth = 4;
        ctx.fillRect(20, 20, W - 40, H - 40);
        ctx.strokeRect(20, 20, W - 40, H - 40);
        ctx.lineWidth = 1;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Title
        ctx.fillStyle = '#ffcc00';
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText('👜 RYGGSEKK', cx, y);
        y += 30;

        // Items list
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('GJENSTANDER:', 40, y);
        y += 15;

        const unique = this._uniqueItems();
        // Clamp cursor
        this.itemCursor = Math.max(0, Math.min(this.itemCursor, Math.max(0, unique.length - 1)));

        const ITEM_VISIBLE = 5;
        // Scroll window so cursor is always visible
        const scrollStart = Math.max(0, Math.min(this.itemCursor - Math.floor(ITEM_VISIBLE / 2), unique.length - ITEM_VISIBLE));
        const visible = unique.slice(scrollStart, scrollStart + ITEM_VISIBLE);

        if (unique.length === 0) {
            ctx.fillStyle = '#888888';
            ctx.fillText('Tomt...', 50, y);
            y += 15;
        } else {
            for (let i = 0; i < visible.length; i++) {
                const absIdx = scrollStart + i;
                const { count, item } = visible[i];
                const isSelected = absIdx === this.itemCursor;

                // Row background highlight
                if (isSelected) {
                    ctx.fillStyle = 'rgba(200,168,75,0.12)';
                    ctx.fillRect(38, y - 2, W - 76, 13);
                }

                // Cursor arrow
                ctx.fillStyle = isSelected ? '#f0c830' : '#446644';
                ctx.fillText(isSelected ? '▶' : ' ', 40, y);

                // Item name + count
                ctx.fillStyle = isSelected ? '#ffe880' : '#aaddff';
                const equip = item.equipped ? ' ★' : '';
                const hasLetter = item.letter ? ' 📜' : '';
                ctx.fillText(`${item.name} x${count}${equip}${hasLetter}`, 52, y);

                y += 15;
            }
            if (unique.length > ITEM_VISIBLE) {
                ctx.fillStyle = '#666666';
                ctx.fillText(`  ...+${unique.length - ITEM_VISIBLE} til`, 50, y);
                y += 15;
            }

            // Action hints for selected item
            const sel = unique[this.itemCursor];
            if (sel) {
                y += 2;
                ctx.fillStyle = '#6a8a6a';
                ctx.font = '6px "Press Start 2P"';
                let hints = '[E] Equip';
                if (sel.item.letter) hints += '  [R] Les brev';
                ctx.fillText(hints, 52, y);
                ctx.font = '8px "Press Start 2P"';
                y += 12;
            }
        }

        y += 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DRAGEKREFTER:', 40, y);
        y += 20;

        const powers = Game.player.powers;
        if (powers.length === 0) {
            ctx.fillStyle = '#888888';
            ctx.textAlign = 'center';
            ctx.fillText('Ingen krefter funnet ennå.', cx, y);
        } else {
            // Draw power boxes
            const boxW = 32;
            const spacing = 10;
            const totalW = powers.length * boxW + (powers.length - 1) * spacing;
            const startX = cx - totalW / 2;

            for (let i = 0; i < powers.length; i++) {
                const px = startX + i * (boxW + spacing);

                // Box background
                ctx.fillStyle = (i === this.cursorIndex) ? '#444466' : '#222233';
                ctx.fillRect(px, y, boxW, boxW);

                // Active highlight
                if (Game.player.activePower === powers[i]) {
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px - 2, y - 2, boxW + 4, boxW + 4);
                    ctx.fillStyle = '#00ff00';
                    ctx.textAlign = 'center';
                    ctx.font = '6px "Press Start 2P"';
                    ctx.fillText('AKTIV', px + boxW / 2, y - 10);
                } else if (i === this.cursorIndex) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px, y, boxW, boxW);
                }

                ctx.fillStyle = powers[i].color;
                ctx.fillRect(px + 6, y + 6, 20, 20); // Placeholder icon
            }

            y += boxW + 15;

            // Selected power details
            const selected = powers[this.cursorIndex];
            if (selected) {
                ctx.fillStyle = selected.color;
                ctx.textAlign = 'center';
                ctx.font = '10px "Press Start 2P"';
                ctx.fillText(selected.name, cx, y);
                y += 15;
                ctx.fillStyle = '#cccccc';
                ctx.font = '8px "Press Start 2P"';
                ctx.fillText(selected.desc, cx, y);
            }
        }

        // Footer hints
        ctx.fillStyle = '#888888';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('[↑↓] Item  [←→] Kraft  [SPACE] Aktiver kraft', cx, H - 35);
        ctx.fillText('[E] Equip  [R] Les brev  [B] Lukk  [N] Notatbok', cx, H - 20);
    }
};

// ── Notatbok (HTML textarea — fritekst) ──────────────────────────────────────
const Notebook = {
    active: false,
    _overlay: null,
    _textarea: null,
    _initialized: false,

    _init() {
        if (this._initialized) return;
        this._initialized = true;
        this._overlay  = document.getElementById('notebook-overlay');
        this._textarea = document.getElementById('notebook-text');

        // Capture ALL keystrokes inside textarea so they don't reach game Input
        this._textarea.addEventListener('keydown', e => {
            e.stopPropagation();
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        });

        document.getElementById('notebook-close-btn').addEventListener('click', () => {
            this.close();
        });
    },

    open() {
        this._init();
        this._textarea.value = (Game.player && Game.player.notebookText) || '';
        this._populateHints();
        // Coexist mode: right half when letter-reader is visible
        if (LetterReader.active) {
            this._overlay.classList.add('coexist');
        } else {
            this._overlay.classList.remove('coexist');
        }
        this._overlay.style.display = 'flex';
        this.active = true;
        setTimeout(() => this._textarea && this._textarea.focus(), 20);
    },

    close() {
        if (!this._overlay) return;
        if (Game.player) Game.player.notebookText = this._textarea.value;
        this._overlay.style.display = 'none';
        this._overlay.classList.remove('coexist');
        this.active = false;
        const canvas = document.getElementById('game-canvas');
        if (canvas) canvas.focus();
    },

    // Rebuild the hints list pane from player.notebookHints
    _populateHints() {
        const list   = document.getElementById('notebook-hints-list');
        const detail = document.getElementById('notebook-hint-detail');
        if (!list || !detail) return;
        list.innerHTML = '';
        detail.textContent = '';

        const hints = (Game.player && Game.player.notebookHints) || [];
        if (hints.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'hint-item';
            empty.style.color = '#44380e';
            empty.style.cursor = 'default';
            empty.textContent = 'Ingen lagrede hint ennå...';
            list.appendChild(empty);
            return;
        }
        hints.forEach((hint, i) => {
            const el = document.createElement('div');
            el.className = 'hint-item';
            el.textContent = hint.title;
            el.addEventListener('click', () => {
                list.querySelectorAll('.hint-item').forEach(e => e.classList.remove('nb-active'));
                el.classList.add('nb-active');
                detail.textContent = hint.body;
            });
            list.appendChild(el);
            // Auto-select first hint
            if (i === 0) {
                el.classList.add('nb-active');
                detail.textContent = hint.body;
            }
        });
    },

    // Called from game loop — HTML handles all input, this is a no-op
    update(dt) {},
    draw(ctx, W, H) {},
};

// ── Brev-leser (Letter Reader — canvas overlay) ───────────────────────────────
const LetterReader = {
    active: false,
    title: '',
    body: '',

    _savedFlash: 0, // visual feedback timer when hint is saved

    show(title, body) {
        this.title = title;
        this.body  = body;
        this.active = true;
        this._savedFlash = 0;
        // Tell notebook to go narrow if it's open
        if (Notebook.active && Notebook._overlay) {
            Notebook._overlay.classList.add('coexist');
        }
    },

    close() {
        this.active = false;
        // Restore notebook to full width
        if (Notebook.active && Notebook._overlay) {
            Notebook._overlay.classList.remove('coexist');
        }
    },

    update(dt) {
        if (!this.active) return;
        if (this._savedFlash > 0) this._savedFlash -= dt;

        // Close
        if (Input.isJust('Escape')) {
            this.close();
            return;
        }

        // Save hint to notebook [S]
        if (Input.isJust('s') || Input.isJust('S')) {
            if (Game.player) {
                const already = Game.player.notebookHints.some(h => h.title === this.title);
                if (!already) {
                    Game.player.notebookHints.push({ title: this.title, body: this.body });
                    this._savedFlash = 2.0;
                    // Refresh notebook hints pane if it's open
                    if (Notebook.active) Notebook._populateHints();
                } else {
                    this._savedFlash = -1.0; // use negative to signal "already saved"
                }
            }
        }
    },

    draw(ctx, W, H) {
        if (!this.active) return;

        // When notebook is also open, render in the left half only
        const narrow = Notebook.active;
        const panelW = narrow ? Math.floor(W * 0.52) : W;
        const pad = 18;

        // Dark background
        ctx.fillStyle = 'rgba(6, 6, 16, 0.93)';
        ctx.fillRect(0, 0, panelW, H);

        // Parchment panel
        ctx.fillStyle = '#100d06';
        ctx.strokeStyle = '#c8a84b';
        ctx.lineWidth = 3;
        ctx.fillRect(pad, pad, panelW - pad * 2, H - pad * 2);
        ctx.strokeRect(pad, pad, panelW - pad * 2, H - pad * 2);

        // Inner decorative border
        ctx.strokeStyle = '#7a5a14';
        ctx.lineWidth = 1;
        ctx.strokeRect(pad + 5, pad + 5, panelW - pad * 2 - 10, H - pad * 2 - 10);
        ctx.lineWidth = 1;

        const cx = panelW / 2;

        // Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f0c830';
        ctx.font = '9px "Press Start 2P"';
        // Truncate title if too wide
        let titleStr = '📜 ' + this.title;
        while (ctx.measureText(titleStr).width > panelW - pad * 2 - 16 && titleStr.length > 4) {
            titleStr = titleStr.slice(0, -1);
        }
        ctx.fillText(titleStr, cx, pad + 12);

        // Divider
        ctx.strokeStyle = '#7a5a14';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad + 12, pad + 28);
        ctx.lineTo(panelW - pad - 12, pad + 28);
        ctx.stroke();

        // Body text
        ctx.fillStyle = '#e8d8a0';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'left';
        const textX = pad + 14;
        const textMaxW = panelW - pad * 2 - 28;
        const wrappedLines = this._wrap(ctx, this.body, textMaxW);
        let y = pad + 36;
        const lineH = 13;
        const maxY = H - pad * 2 - 18;
        for (const line of wrappedLines) {
            if (y + lineH > maxY) break;
            if (line === '') { y += Math.floor(lineH * 0.6); continue; }
            ctx.fillText(line, textX, y);
            y += lineH;
        }

        // Saved feedback banner
        if (this._savedFlash > 0) {
            const alpha = Math.min(1, this._savedFlash);
            ctx.fillStyle = `rgba(20,80,20,${alpha * 0.9})`;
            ctx.fillRect(pad + 6, H - pad - 28, panelW - pad * 2 - 12, 18);
            ctx.fillStyle = `rgba(80,220,100,${alpha})`;
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('✓ Hint lagret i notatboken!', cx, H - pad - 14);
        } else if (this._savedFlash < 0) {
            const alpha = Math.min(1, -this._savedFlash);
            ctx.fillStyle = `rgba(80,60,10,${alpha * 0.9})`;
            ctx.fillRect(pad + 6, H - pad - 28, panelW - pad * 2 - 12, 18);
            ctx.fillStyle = `rgba(220,180,40,${alpha})`;
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('Allerede lagret.', cx, H - pad - 14);
        }

        // Footer hints
        ctx.fillStyle = '#7a6030';
        ctx.font = '5px "Press Start 2P"';
        ctx.textAlign = 'center';
        if (narrow) {
            ctx.fillText('[ESC] Lukk   [S] Lagre hint', cx, H - pad - 6);
        } else {
            ctx.fillText('[ESC] Lukk   [S] Lagre hint   [N] Åpne notatbok', cx, H - pad - 6);
        }
    },

    _wrap(ctx, text, maxW) {
        const out = [];
        for (const para of text.split('\n')) {
            if (para.trim() === '') { out.push(''); continue; }
            const words = para.split(' ');
            let cur = '';
            for (const w of words) {
                const test = cur ? cur + ' ' + w : w;
                if (ctx.measureText(test).width > maxW && cur) {
                    out.push(cur);
                    cur = w;
                } else {
                    cur = test;
                }
            }
            if (cur) out.push(cur);
        }
        return out;
    },
};
