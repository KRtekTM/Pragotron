import {
    createDefaultStationProfile,
    normalizeStationProfile,
    resolveProfileTrainType,
    sectorAtoms,
    sectorsOverlap,
    setActiveStationProfile
} from '../src/platform/station-profile.js';
import { identitiesMatch } from '../src/platform/board-identity.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const brno = createDefaultStationProfile();
setActiveStationProfile(brno, { persist: false });

assert(
    identitiesMatch(
        { platform: '1', track: '1', sector: 'A' },
        { platform: '1', track: '1', sector: 'A-C' }
    ),
    'tabule A má dostat odjezd A-C'
);
assert(
    !identitiesMatch(
        { platform: '1', track: '1', sector: 'E' },
        { platform: '1', track: '1', sector: 'A-C' }
    ),
    'tabule E nemá dostat odjezd A-C'
);
assert(
    identitiesMatch(
        { platform: '1', track: '1', sector: '' },
        { platform: '1', track: '1', sector: 'A-C' }
    ),
    'prázdný sektor tabule je celá kolej'
);
assert(
    identitiesMatch(
        { platform: '1', track: '1', sector: 'A' },
        { platform: '1', track: '1', sector: '' }
    ),
    'prázdný sektor odjezdu je celá kolej'
);
assert(
    !identitiesMatch(
        { platform: '2', track: '1', sector: 'A' },
        { platform: '1', track: '1', sector: 'A' }
    ),
    'jiné nástupiště se neshoduje'
);
assert(
    sectorsOverlap('A-C', 'C-D', brno),
    'rozsahy A-C a C-D se překrývají na C'
);
assert(
    sectorAtoms('A-C', brno).join(',') === 'A,B,C',
    'A-C pokrývá A, B a C'
);

assert(resolveProfileTrainType('IC') === 'Intercity', 'IC je Intercity');
assert(resolveProfileTrainType('RJ', 'RJET') === 'RJ', 'RJ a RJET je RegioJet');
assert(resolveProfileTrainType('rj', 'ČD') === 'rj', 'rj a ČD je railjet');

const custom = setActiveStationProfile({
    name: 'Zkouška',
    platforms: ['1'],
    tracks: ['2'],
    sectors: ['X', 'Y', 'Z'],
    sectorRanges: ['X-Z'],
    numberStyles: [{
        id: 'default',
        label: 'Výchozí',
        background: '#111111',
        foreground: '#ffffff'
    }],
    trainTypes: [{
        name: 'LE',
        text: 'LE',
        numberStyle: 'default',
        aliases: ['Leo']
    }]
}, { persist: false });

assert(custom, 'vlastní profil se má uložit do paměti');
assert(
    sectorAtoms('X-Z', custom).join(',') === 'X,Y,Z',
    'X-Z pokrývá Y'
);
assert(
    identitiesMatch(
        { platform: '1', track: '2', sector: 'Y' },
        { platform: '1', track: '2', sector: 'X-Z' },
        custom
    ),
    'tabule Y má dostat rozsah X-Z'
);
assert(
    resolveProfileTrainType('Leo', '', custom) === 'LE',
    'alias Leo je typ LE'
);
assert(
    normalizeStationProfile({
        platforms: [],
        tracks: ['1'],
        trainTypes: [{ name: 'Os' }]
    }) === null,
    'profil bez nástupiště je neplatný'
);
assert(
    normalizeStationProfile(null) === null,
    'prázdný import je neplatný'
);

console.log('ok');
