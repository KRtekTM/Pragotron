import {
    formatStationName,
    resolveDepartureStations
} from '../src/platform/data.js';

const cases = [
    ['Suchdol nad Odrou', 'SUCHDOL N/ODR.'],
    ['Ústí nad Labem', 'ÚSTÍ N/LABEM'],
    ['Hradec Králové', 'HRADEC KRÁLOVÉ'],
    ['České Budějovice', 'ČESKÉ BUDĚJOV.'],
    ['Havlíčkův Brod', 'HAVLÍČKŮV BROD'],
    ['Praha', 'PRAHA'],
    ['Brno', 'BRNO'],
    ['Pec pod Sněžkou', 'PEC POD SNĚŽK.'],
    ['Jablonec nad Nisou', 'JABLONEC N/N.'],
    ['Kostelec na Hané', 'KOSTELEC NA H.'],
    ['Adamov u Brna', 'ADAMOV U BRNA'],
    ['Slavkov u Brna', 'SLAVKOV U BRNA'],
    ['Hustopeče u Brna', 'HUSTOPEČE U B.'],
    ['Uherské Hradiště', 'UHERSKÉ HRAD.'],
    ['Pardubice hl.n.', 'PARDUBICE HL.N'],
    ['Pardubice hl. n.', 'PARDUBICE HL.N'],
    ['Brno-h.Heršpice', 'BRNO-H.HERŠP.'],
    ['Brno-h. Heršpice', 'BRNO-H. HERŠP.'],
    ['Františkovy Lázně', 'FRANTIŠKOVY L.'],
    ['', ''],
    ['SUCHDOL N/ODR.', 'SUCHDOL N/ODR.']
];

for (const [input, expected] of cases) {
    const actual = formatStationName(input);
    if (actual !== expected) {
        throw new Error(
            `${JSON.stringify(input)} => ${JSON.stringify(actual)}, expected ${
                JSON.stringify(expected)
            }`
        );
    }
    if (actual.includes('U/')) {
        throw new Error(`${JSON.stringify(input)} used U/ abbreviation`);
    }
    if (actual.includes('..')) {
        throw new Error(`${JSON.stringify(input)} produced a double period`);
    }
    if (stationTooLong(actual)) {
        throw new Error(`${JSON.stringify(actual)} is longer than 14`);
    }
}

function stationTooLong(value) {
    return Array.from(value).length > 14;
}

const clearedVia = resolveDepartureStations(
    { stations: ['Břeclav', ''] },
    { stations: ['Břeclav', 'Bradavice'] }
);
if (clearedVia[0] !== 'BŘECLAV' || clearedVia[1] !== '') {
    throw new Error(
        `prázdné Přes se nesmí doplnit starou hodnotou: ${clearedVia.join('|')}`
    );
}

const keptVia = resolveDepartureStations(
    { stations: ['Břeclav', 'Brno'] },
    { stations: ['Břeclav', 'Bradavice'] }
);
if (keptVia[1] !== 'BRNO') {
    throw new Error(`vyplněné Přes se má zachovat: ${keptVia[1]}`);
}

const recoveredVia = resolveDepartureStations(
    { id: '1/1' },
    { stations: ['Břeclav', 'Brno'] }
);
if (recoveredVia[0] !== 'BŘECLAV' || recoveredVia[1] !== 'BRNO') {
    throw new Error(
        `chybějící stanice se mají vzít z uloženého stavu: ${recoveredVia.join('|')}`
    );
}

console.log(JSON.stringify(Object.fromEntries(cases), null, 2));
console.log('ok');
