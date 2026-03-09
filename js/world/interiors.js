// interiors.js — Interior maps for caves and buildings

// Each interior is a small map (20×15 tiles)
const INTERIOR_COLS = 20;
const INTERIOR_ROWS = 15;
const IF = TILE.STONE;   // wall / floor variants
const FL2 = TILE.SAND;   // indoor floor
const IT = TILE.TREE;    // used as furniture blocker

// Build a basic interior from a layout string array
function buildInterior(rows, portals, items, npcs) {
    const data = [];
    for (const row of rows) {
        for (const ch of row) {
            switch (ch) {
                case '#': data.push(TILE.STONE); break;
                case '.': data.push(TILE.SAND); break;
                case 'D': data.push(TILE.DOOR); break;
                case 'W': data.push(TILE.WATER); break;
                case 'T': data.push(TILE.TREE); break;
                case 'G': data.push(TILE.GRASS); break;
                case 'f': data.push(TILE.FLOWER); break;
                default: data.push(TILE.SAND); break;
            }
        }
    }
    return { data, portals: portals || [], items: items || [], npcs: npcs || [], cols: INTERIOR_COLS, rows: INTERIOR_ROWS };
}

const INTERIORS = {

    // ── Hus 1: Elias' hjem (Gresslette 20, 19) ──────────────────────────
    house1: buildInterior([
        '####################',
        '#..................#',
        '#....T......T......#',
        '#..................#',
        '#..................#',
        '#....T.............#',
        '#..................#',
        '#..................#',
        '#....T......T......#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.........D........#',
        '####################',
    ],
        [{ col: 9, row: 13, target: 'world', tx: 20, ty: 19 }],
        [{ col: 15, row: 2, type: 'chest', reward: { item: 'Elias sine gamle notater', letter: { title: 'Elias sine gamle notater', body: 'Side 1, risset inn med usikker hånd:\n\n"Vannet husker..."\n\nDen første stormen kom ikke fra himmelen.\nDen kom innenfra.\n\nNoen prøvde å stoppe klokken.\nNoen feilet.\n\nSe etter vannet som faller.\nVann husker alltid.' } }, label: '📓 Gamle notater', opened: false }],
        [{ col: 4, row: 8, name: 'Mamma', dialogue: ['Elias... notatboken din.', 'Ikke glem hva du skrev før stormen tok det.', 'Se etter vannet som faller, Elias.', 'Vann husker alltid.'] }]
    ),

    // ── Hus 2: Kremmerens butikk (Gresslette 36, 13) ─────────────────────
    house2: buildInterior([
        '####################',
        '#..................#',
        '#...T..T..T..T.....#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.........D........#',
        '####################',
    ],
        [{ col: 9, row: 13, target: 'world', tx: 36, ty: 13 }],
        [{ col: 15, row: 4, type: 'chest', reward: { item: 'Rusten Nøkkel', letter: { title: 'Rusten Nøkkel', body: 'En gammel nøkkel av ukjent opphav.\nRosen spiser sakte metallet.\n\nPå håndtaket er det risset inn\net symbol jeg ikke kjenner igjen.\n\nDet ligner symbolet\npå Den Store Klokken.' } }, label: '🗝️ Rusten Nøkkel', opened: false }],
        [{ col: 3, row: 4, name: 'Kremmeren', dialogue: ['Tiden går fra oss alle, best å skynde seg.', 'Har du sett Den Store Klokken?', 'Den har begynt å tikke feil vei.', 'Easter Egg: Prøv å lytte til fossefallet i nord ved midnatt.'] }]
    ),

    // ── Hus 3: Tidsvokterens hytte (Gresslette 60, 23) ───────────────────
    house3: buildInterior([
        '####################',
        '#....f....f........#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.........D........#',
        '####################',
    ],
        [{ col: 9, row: 13, target: 'world', tx: 60, ty: 23 }],
        [{ col: 17, row: 1, type: 'chest', reward: { item: 'Uleselig Kartbit', letter: { title: 'Uleselig Kartbit', body: 'Et fragment av et kart,\nav ukjent alder.\n\nDet meste er brent bort.\nMen midt på arket:\n\n- Et klokkesymbol\n- Noe som ligner et tårn\n  speilet i vann\n- Tallene 4... 1... 2...' } }, label: '🗺️ Uleselig Kartbit', opened: false }],
        [{ col: 4, row: 4, name: 'Tidsvokteren', dialogue: ['Fjellene bærer på mer enn stein.', 'Dragene der oppe vokter tidens anker.', 'Du må beseire den første før du kan forstå klokken.'] }]
    ),

    // ── Shop: Eventyrernes base (Gresslette 36, 41) ───────────────────────
    shop: buildInterior([
        '####################',
        '#..................#',
        '#..T..T..T..T..T...#',
        '#..................#',
        '#...............T..#',
        '#..................#',
        '#..................#',
        '#...T..............#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#...T........T.....#',
        '#........D.........#',
        '####################',
    ],
        [{ col: 8, row: 13, target: 'world', tx: 36, ty: 41 }],
        [
            { col: 16, row: 2, type: 'chest', reward: { exp: 50, item: 'Gullkjede' }, label: '📦 Eventyrkiste', opened: false },
            { col: 3, row: 12, type: 'chest', reward: { exp: 20, item: 'Gammel kart' }, label: '📦 Reisekiste', opened: false },
        ],
        [{
            col: 10, row: 3, name: 'Eventyrernes leder',
            dialogue: ['Dette er basen vår!', 'Samle nok EXP og du kan bli en mester.', '🗺️ Easter Egg: Det finnes et hemmelig rom bak fossen...']
        }]
    ),

    // ── Landsby-hus 1 (Gresslette 6, 42) ────────────────────────────────
    village1: buildInterior([
        '####################',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.....D............#',
        '####################',
    ],
        [{ col: 5, row: 13, target: 'world', tx: 6, ty: 42 }],
        [],
        [{ col: 8, row: 6, name: 'Bonde', dialogue: ['Når regnet pisket som verst her om natten...', 'Sverger jeg på at jeg så sølvfargede tårn', 'speile seg i pytter.'] }]
    ),

    // ── Landsby-hus 2 (Gresslette 12, 42) ───────────────────────────────
    village2: buildInterior([
        '####################',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#....f.............#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.....D............#',
        '####################',
    ],
        [{ col: 5, row: 13, target: 'world', tx: 12, ty: 42 }],
        [{ col: 6, row: 5, type: 'chest', reward: { letter: { title: 'Hemmelig blomsterkode', body: 'Risset inn i en blomsterstengel\nmed en tynn kniv.\n\nDu må se veldig nært\nfor å lese det:\n\n"7 - 7 - 7"\n\nHva er dette koden til?' } }, label: '💎 Hemmelig blomsterkode', opened: false }],
        [{ col: 8, row: 6, name: 'Barn', dialogue: ['Leker du gjemsel?', 'Speilgutten leker bare i stormen!', 'Psst... trykk Space på blomstene her inne.', 'Det er en hemmelighet!'] }]
    ),

    // ── Hule 1 (Gresslette/fjell 60, 9) ─────────────────────────────────
    cave1: buildInterior([
        '####################',
        '#GGG...........GGGG#',
        '#GG.....G.......GG.#',
        '#G.....GGG.......G.#',
        '#......GGG.........#',
        '#..................#',
        '#...W..W...........#',
        '#...WWWW...........#',
        '#..................#',
        '#.........T........#',
        '#.......T..T.......#',
        '#..................#',
        '#..................#',
        '#.........D........#',
        '####################',
    ],
        [{ col: 9, row: 13, target: 'world', tx: 60, ty: 9 }],
        [
            { col: 17, row: 3, type: 'chest', reward: { exp: 80, item: 'Drage-egg fragment', letter: { title: 'Drage-egg fragment', body: 'Skjellene er iskalde,\nmen noe pulserer svakt inni.\n\nPå innsiden av skallet,\nrisset inn med en klo:\n\n"De ble født\nav den første stormen."\n\nFørste stormen?\nVar det flere?' } }, label: '🐉 Mystisk kiste', opened: false },
            { col: 3, row: 10, type: 'chest', reward: { item: 'Skjult Kode', letter: { title: 'Skjult Kode', body: 'Risset inn i klippen\nmed et skarpt redskap.\n\nBokstavene er gamle,\nmen lesbare:\n\nKODE TIL KLOKKEN:\n4 - 1 - 2\n\nHvilken klokke?\nDen Store Klokken\ni landsbyen?' } }, label: '🔒 Kode-kiste', opened: false },
        ],
        []
    ),

    // ── Hule 2 (Gresslette sør 4, 54) ───────────────────────────────────
    cave2: buildInterior([
        '####################',
        '#GGG.......T.T.GGG.#',
        '#G.................#',
        '#.......T..........#',
        '#..................#',
        '#..WWWW............#',
        '#...WWW............#',
        '#..................#',
        '#..................#',
        '#...T..............#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.....D............#',
        '####################',
    ],
        [{ col: 5, row: 13, target: 'world', tx: 4, ty: 54 }],
        [
            { col: 18, row: 1, type: 'chest', reward: { item: 'Klokke-tannhjul', letter: { title: 'Klokke-tannhjul', body: 'Et presisjonskoghjul\nav ukjent metall.\n\nLaget med en håndverksmessig\npresisjon langt utover det noen\nsmed i disse deler er kjent for.\n\nDet passer ikke til noen klokke\njeg har sett... ennå.' } }, label: '⚙️ Klokke-tannhjul', opened: false },
        ],
        [{ col: 10, row: 8, name: 'Fossekall', dialogue: ['Du fant meg...', 'Bak den store fossen i snølandskapet', 'venter sannheten om deg selv.'] }]
    ),

    // ── Hule 3 (Gresslette/Ørken 74, 39) ────────────────────────────────
    cave3: buildInterior([
        '####################',
        '#..................#',
        '#.....WWWWWW.......#',
        '#....WWWWWWWW......#',
        '#...WWWWWWWWWW.....#',
        '#...WWWWWWWWWW.....#',
        '#....WWWWWWWW......#',
        '#.....WWWWWW.......#',
        '#..................#',
        '#.T....T....T....T.#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#.....D............#',
        '####################',
    ],
        [{ col: 5, row: 13, target: 'world', tx: 74, ty: 39 }],
        [
            { col: 10, row: 4, type: 'chest', reward: { statBoost: 10, item: 'DRAGE-HJERTE' }, label: '🔥 Legendarisk kiste', opened: false },
            { col: 17, row: 11, type: 'chest', reward: { item: 'Mester-koden', letter: { title: 'Mester-koden', body: 'Skrevet på et skinnstykke\nmed mørk blekk.\n\n"Den syvende stormen\nkaller på Speilbyen."\n\nSpeilbyen...\nTimenes Speilby.\n\nEksisterer den virkelig?\n\nOg når kommer\nden syvende stormen?' } }, label: '📜 Mester-koden', opened: false },
        ],
        [{ col: 3, row: 9, name: 'Speilgutten', dialogue: ['Klokken tikker baklengs, Elias.', 'Hva prøver du å ta tilbake?', 'Den siste Dragen venter på den høyeste tinden.'] }]
    ),
};

// Get interior by id, with fresh copy of item opened states
function getInterior(id) {
    return INTERIORS[id] || null;
}
