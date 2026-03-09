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
        [{ col: 9, row: 13, target: 'world', tx: 20, ty: 19 }], // exit door
        [{ col: 15, row: 2, type: 'chest', reward: { exp: 20, item: 'Eplepai' }, label: '📦 Gammel kiste', opened: false }],
        [{ col: 4, row: 8, name: 'Mamma', dialogue: ['Elias! Vær forsiktig der ute.', 'De smaa krypene er farlige tidlig om morgenen!'] }]
    ),

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
        [{ col: 15, row: 4, type: 'chest', reward: { exp: 15, item: 'Gulrot' }, label: '📦 Butikkhylle', opened: false }],
        [{ col: 3, row: 4, name: 'Butikkmann', dialogue: ['Velkommen til butikken!', 'De beste krypjegerne kjøper ofte Gulrot.', '(Easter Egg: Prøv å komme tilbake om natten!)'] }]
    ),

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
        [{ col: 17, row: 1, type: 'chest', reward: { exp: 35, item: 'Mystisk stein' }, label: '📦 Skjult kiste', opened: false }],
        [{ col: 4, row: 4, name: 'Gammel mann', dialogue: ['Jeg har sett mange krypjegere passere...', 'Den store dragen bor høyt oppe i fjellet.', '🐉 Hvert 10. level møter du den!'] }]
    ),

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
        [{ col: 8, row: 6, name: 'Bonde', dialogue: ['Hei der!', 'Har du sett krypene i det høye gresset?', 'De er ikke hyggelige!'] }]
    ),

    village2: buildInterior([
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
        [{ col: 5, row: 13, target: 'world', tx: 12, ty: 42 }],
        [{ col: 15, row: 5, type: 'chest', reward: { exp: 25, item: 'Tre-sverd' }, label: '📦 Lekekiste', opened: false }],
        [{ col: 8, row: 6, name: 'Barn', dialogue: ['Vil du leke?', '🎮 Hemmelig: Trykk Space på blomstene utenfor!'] }]
    ),

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
            { col: 17, row: 3, type: 'chest', reward: { exp: 80, item: 'Drage-egg fragment' }, label: '🐉 Mystisk kiste', opened: false },
            { col: 3, row: 10, type: 'chest', reward: { exp: 40, item: 'Steinhjelm' }, label: '⛏️ Gruvekiste', opened: false },
        ],
        []
    ),

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
            { col: 18, row: 1, type: 'chest', reward: { exp: 60, item: 'Fossekall-fjær' }, label: '💎 Gammel kiste', opened: false },
        ],
        [{ col: 10, row: 8, name: 'Huleånd', dialogue: ['Du er modig som tørr å komme hit.', '🌟 Easter Egg: Fossekallen synger om natten på innsjøen.'] }]
    ),

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
            { col: 10, row: 4, type: 'chest', reward: { exp: 150, item: 'DRAGE-HJERTE' }, label: '🔥 Legendarisk kiste', opened: false },
            { col: 17, row: 11, type: 'chest', reward: { exp: 100, item: 'Dype hemmelighet' }, label: '🌀 Mysteriøs kiste', opened: false },
        ],
        [{ col: 3, row: 9, name: 'Ukjent stemme', dialogue: ['...', '...Du har kommet langt.', '🐉 Dragens ånd hviler her dyp nede.', 'Vær forberedt.'] }]
    ),
};

// Get interior by id, with fresh copy of item opened states
function getInterior(id) {
    return INTERIORS[id] || null;
}
