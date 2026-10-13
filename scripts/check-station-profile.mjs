import brnoFile from '../stanice/brno-hlavni-nadrazi.json' with { type: 'json' };
import { trainTypeImageUrl } from '../src/platform/data.js';
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

assert(
    brno.trainTypes.find((type) => type.name === 'RJ')?.source
        === 'images/typy-vlaku/regiojet.svg',
    'výchozí RJ používá obrázek z images/typy-vlaku'
);
const namedTypes = (profile) => profile.trainTypes.filter((type) => type.name);
const fileTypes = brnoFile.trainTypes.filter((type) => type.name);
assert(brno.name === brnoFile.name, 'název výchozího profilu je ze souboru stanice');
assert(
    brno.platforms.join('\n') === brnoFile.platforms.join('\n'),
    'nástupiště výchozího profilu jsou ze souboru stanice'
);
assert(
    brno.tracks.join('\n') === brnoFile.tracks.join('\n'),
    'koleje výchozího profilu jsou ze souboru stanice'
);
assert(
    brno.sectors.join('\n') === brnoFile.sectors.join('\n'),
    'sektory výchozího profilu jsou ze souboru stanice'
);
assert(
    brno.sectorRanges.join('\n') === brnoFile.sectorRanges.join('\n'),
    'rozsahy sektorů výchozího profilu jsou ze souboru stanice'
);
assert(
    brno.numberStyles.map((style) =>
        `${style.id}|${style.background}|${style.foreground}`
    ).join('\n') === brnoFile.numberStyles.map((style) =>
        `${style.id}|${style.background}|${style.foreground}`
    ).join('\n'),
    'styly čísel výchozího profilu jsou ze souboru stanice'
);
assert(
    namedTypes(brno).map((type) => type.name).join('\n')
        === fileTypes.map((type) => type.name).join('\n'),
    'typy vlaků výchozího profilu jsou ze souboru stanice'
);
fileTypes.forEach((type) => {
    const actual = namedTypes(brno).find((item) => item.name === type.name);
    ['text', 'suffix', 'source', 'label', 'background', 'foreground', 'numberStyle']
        .forEach((key) => {
            assert(
                actual?.[key] === (type[key] || ''),
                `${type.name}.${key} má odpovídat souboru stanice`
            );
        });
    assert(
        (actual?.aliases || []).join('\n') === (type.aliases || []).join('\n'),
        `${type.name}.aliases mají odpovídat souboru stanice`
    );
});
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

const images = normalizeStationProfile({
    name: 'Obrázky',
    platforms: ['1'],
    tracks: ['1'],
    trainTypes: [
        { name: 'RJ', source: 'images/regiojet.svg' },
        {
            name: 'Znacka',
            source: '<svg viewBox="0 0 8 8"><rect width="8" height="8"/></svg>'
        },
        { name: 'Skodlive', source: '<svg onload="alert(1)"></svg>' }
    ]
});
const imageType = (name) => images.trainTypes.find((type) => type.name === name);
assert(
    imageType('RJ')?.source === 'images/typy-vlaku/regiojet.svg',
    'stará cesta obrázku se přemapuje'
);
assert(
    imageType('Znacka')?.source.startsWith('<svg'),
    'vlastní svg zůstane v profilu'
);
assert(imageType('Skodlive')?.source === '', 'svg s událostí se zahodí');
const svgUrl = trainTypeImageUrl(imageType('Znacka')?.source);
assert(svgUrl.startsWith('data:image/svg+xml'), 'vlastní svg je data url');
assert(!svgUrl.includes('"'), 'data url neobsahuje uvozovky');
assert(
    trainTypeImageUrl('images/railjet.svg') === 'images/typy-vlaku/railjet.svg',
    'url staré cesty míří do typy-vlaku'
);

console.log('ok');
