import {
    extractStationName,
    parseStationTable
} from '../src/platform/live-departures.js';
import { TRAIN_TYPES, getTrainNumberCardStyle } from '../src/platform/data.js';

const expectedVisuals = {
    Intercity: { source: 'images/intercity.svg', background: '#fff' },
    rj: { source: 'images/railjet.svg', background: '#D80300' },
    RJ: { source: 'images/regiojet.svg', background: '#F1B504' },
    SuperCity: { source: 'images/supercity.svg', background: '#fff' },
    nj: { source: 'images/nightjet.svg', background: '#1e3c69' }
};

Object.entries(expectedVisuals).forEach(([name, expected]) => {
    const type = TRAIN_TYPES.find((candidate) => candidate.name === name);
    if (!type) {
        throw new Error(`Missing train type ${name}`);
    }
    if (type.source !== expected.source || type.background !== expected.background) {
        throw new Error(
            `${name} visuals mismatch: ${type.source} ${type.background}`
        );
    }
});

const row = (type, number, operator) =>
    `<tr id="x_DXDataRow0"><td><div>12:00</div></td><td><div></div></td><td></td>`
    + `<td><div>${type} ${number}</div><div>${operator}</div></td>`
    + `<td></td><td></td><td><div>Praha</div></td><td><div>Brno</div></td>`
    + `<td></td><td><div>1 / 1</div></td></tr>`;

const szRow = (type, number, operator) =>
    `<tr id="x_DXDataRow0"><td><div>12:00</div></td><td><div></div></td><td></td>`
    + `<td><div style ="color:#10A764; float:left; padding-right:5px; font-weight:bold">${type} ${number}</div>`
    + `<div style="color:gray">${operator}</div></td>`
    + `<td></td><td></td><td><div>Praha</div></td><td><div>Brno</div></td>`
    + `<td></td><td><div>1 / 1</div></td></tr>`;

const html = `<table class="DXMainTable"><tbody>${[
    row('rj', '56', 'ČD'),
    row('rj', '1001', 'RegioJet'),
    row('RJ', '1020', 'RJET'),
    row('IC', '502', 'ČD'),
    row('EC', '172', 'ČD'),
    row('SC', '241', 'ČD'),
    row('nj', '401', 'ÖBB'),
    row('NJ', '456', 'ČD'),
    row('NightJet', '457', 'ČD'),
    row('EN', '442', 'ČD'),
    row('Os', '4618', 'ČD'),
    szRow('nj', '458', 'ČD'),
    szRow('rj', '577', 'ČD'),
    szRow('RJ', '1040', 'RJET'),
    szRow('R', '101101', 'RJET'),
    `<tr id="x_DXDataRow0"><td><div>12:00</div></td><td><div></div></td><td></td>`
    + `<td><div>nj459</div><div>ČD</div></td>`
    + `<td></td><td></td><td><div>Praha</div></td><td><div>Brno</div></td>`
    + `<td></td><td><div>1 / 1</div></td></tr>`
].join('')}</tbody></table>`;

const parsed = parseStationTable(html).map((departure) => ({
    train: departure.train,
    n: departure.trainNumber,
    op: departure.operator
}));

const expected = [
    { train: 'rj', n: '56', op: 'ČD' },
    { train: 'RJ', n: '1001', op: 'RegioJet' },
    { train: 'RJ', n: '1020', op: 'RJET' },
    { train: 'Intercity', n: '502', op: 'ČD' },
    { train: 'Eurocity', n: '172', op: 'ČD' },
    { train: 'SuperCity', n: '241', op: 'ČD' },
    { train: 'nj', n: '401', op: 'ÖBB' },
    { train: 'nj', n: '456', op: 'ČD' },
    { train: 'nj', n: '457', op: 'ČD' },
    { train: 'EuroNight', n: '442', op: 'ČD' },
    { train: 'Os', n: '4618', op: 'ČD' },
    { train: 'nj', n: '458', op: 'ČD' },
    { train: 'rj', n: '577', op: 'ČD' },
    { train: 'RJ', n: '1040', op: 'RJET' },
    { train: 'R', n: '1101', op: 'RJET' },
    { train: 'nj', n: '459', op: 'ČD' }
];

if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
    console.error('parsed', parsed);
    console.error('expected', expected);
    throw new Error('Train type mapping mismatch');
}

for (const name of ['Eurocity', 'SuperCity', 'Intercity']) {
    if (getTrainNumberCardStyle(name) !== 'intercity') {
        throw new Error(`${name} number card is not white-black`);
    }
}

for (const name of ['rj', 'RJ', 'railjet', 'regiojet', 'R']) {
    if (getTrainNumberCardStyle(name) !== 'red') {
        throw new Error(`${name} number card is not red`);
    }
}

for (const name of ['nj', 'NightJet', 'Sp']) {
    if (getTrainNumberCardStyle(name) !== 'sp') {
        throw new Error(`${name} number card is not Sp blue`);
    }
}

if (
    extractStationName(
        '<span id="OGMainContent_BCPTable_ctl02_LStationName" class="CaptionRow">Brno hlavní nádraží</span>'
    ) !== 'Brno hlavní nádraží'
) {
    throw new Error('Station name was not parsed from SŽ HTML');
}

if (extractStationName('<table></table>') !== '') {
    throw new Error('Missing station name should stay empty');
}

console.log(JSON.stringify(parsed, null, 2));
console.log('ok');
