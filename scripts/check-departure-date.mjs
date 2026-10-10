import {
    compareDeparturesByTime,
    getDisplayedDelay,
    getEffectiveDepartureDate
} from '../src/platform/data.js';

const at = (iso) => new Date(iso);

const assertDate = (label, actual, expectedIso) => {
    const expected = at(expectedIso).getTime();
    if (!actual || actual.getTime() !== expected) {
        throw new Error(
            `${label}: expected ${expectedIso}, got ${actual?.toISOString()}`
        );
    }
};

const evening = at('2026-10-07T20:50:00');
assertDate(
    'overnight without delay is tomorrow',
    getEffectiveDepartureDate({ hours: 0, minutes: 15 }, '', evening),
    '2026-10-08T00:15:00'
);
assertDate(
    'later tonight stays today',
    getEffectiveDepartureDate({ hours: 23, minutes: 10 }, '', evening),
    '2026-10-07T23:10:00'
);
assertDate(
    'delayed evening train stays today',
    getEffectiveDepartureDate({ hours: 22, minutes: 0 }, 60, evening),
    '2026-10-07T23:00:00'
);
assertDate(
    'offset on subtracts catalog step',
    getEffectiveDepartureDate({ hours: 22, minutes: 0 }, 60, evening, true),
    '2026-10-07T22:55:00'
);

const assertDisplayed = (label, actual, expected) => {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
    }
};

assertDisplayed('default shows 5', getDisplayedDelay(5), 5);
assertDisplayed('default keeps 10', getDisplayedDelay(10), 10);
assertDisplayed('offset hides 5 min', getDisplayedDelay(5, undefined, true), '');
assertDisplayed('offset rounds 10 down', getDisplayedDelay(10, undefined, true), 5);
assertDisplayed('offset off still catalogs 7', getDisplayedDelay(7), 5);
assertDate(
    'delayed overnight train is tomorrow',
    getEffectiveDepartureDate({ hours: 0, minutes: 15 }, 20, evening),
    '2026-10-08T00:35:00'
);

const morning = at('2026-10-08T00:30:00');
assertDate(
    'just after midnight keeps upcoming night train today',
    getEffectiveDepartureDate({ hours: 0, minutes: 45 }, '', morning),
    '2026-10-08T00:45:00'
);
assertDate(
    'undelayed time already passed becomes tomorrow',
    getEffectiveDepartureDate({ hours: 0, minutes: 15 }, '', morning),
    '2026-10-09T00:15:00'
);

const lateMorning = at('2026-10-08T09:57:40');
assertDate(
    'undelayed train 10 minutes ago stays today',
    getEffectiveDepartureDate({ hours: 9, minutes: 47 }, '', lateMorning),
    '2026-10-08T09:47:00'
);
assertDate(
    'undelayed train 11 minutes ago is tomorrow',
    getEffectiveDepartureDate({ hours: 9, minutes: 46 }, '', lateMorning),
    '2026-10-09T09:46:00'
);

const keptOnBoard = [
    { id: 'older', departureTime: { hours: 8, minutes: 0 }, delay: '' },
    { id: 'recent', departureTime: { hours: 9, minutes: 47 }, delay: '' },
    { id: 'later', departureTime: { hours: 10, minutes: 5 }, delay: '' }
].sort((first, second) => compareDeparturesByTime(first, second, lateMorning))
    .map((departure) => departure.id);

if (JSON.stringify(keptOnBoard) !== JSON.stringify(['recent', 'later', 'older'])) {
    throw new Error(
        `recent undelayed departure was treated as tomorrow: ${keptOnBoard.join(', ')}`
    );
}

const sorted = [
    { id: 'overnight', departureTime: { hours: 0, minutes: 15 }, delay: '' },
    { id: 'evening', departureTime: { hours: 23, minutes: 10 }, delay: '' },
    { id: 'delayed', departureTime: { hours: 18, minutes: 0 }, delay: 180 }
].sort((first, second) => compareDeparturesByTime(first, second, evening))
    .map((departure) => departure.id);

if (JSON.stringify(sorted) !== JSON.stringify(['delayed', 'evening', 'overnight'])) {
    throw new Error(`sort order mismatch: ${sorted.join(', ')}`);
}

const beforeMidnight = at('2026-10-07T23:55:00');
const overnightWithDelay = [
    { id: 'later', departureTime: { hours: 0, minutes: 46 }, delay: 5 },
    { id: 'soon', departureTime: { hours: 0, minutes: 5 }, delay: '' },
    { id: 'evening', departureTime: { hours: 23, minutes: 58 }, delay: '' }
].sort((first, second) => compareDeparturesByTime(first, second, beforeMidnight))
    .map((departure) => departure.id);

if (JSON.stringify(overnightWithDelay) !== JSON.stringify(['evening', 'soon', 'later'])) {
    throw new Error(
        `delayed overnight train sorted as this morning: ${overnightWithDelay.join(', ')}`
    );
}

const departedDespiteDelay = [
    { id: 'stale', departureTime: { hours: 18, minutes: 0 }, delay: 60 },
    { id: 'evening', departureTime: { hours: 23, minutes: 10 }, delay: '' }
].sort((first, second) => compareDeparturesByTime(first, second, evening))
    .map((departure) => departure.id);

if (JSON.stringify(departedDespiteDelay) !== JSON.stringify(['evening', 'stale'])) {
    throw new Error(
        `delay kept an already departed train on today: ${departedDespiteDelay.join(', ')}`
    );
}

const afterMidnight = at('2026-10-08T00:56:00');
const heldAfterMidnight = [
    { id: 'next', departureTime: { hours: 1, minutes: 10 }, delay: '' },
    { id: 'held', departureTime: { hours: 0, minutes: 46 }, delay: 5 }
].sort((first, second) => compareDeparturesByTime(first, second, afterMidnight, true))
    .map((departure) => departure.id);

if (JSON.stringify(heldAfterMidnight) !== JSON.stringify(['held', 'next'])) {
    throw new Error(
        `offset must not hide a delayed departure: ${heldAfterMidnight.join(', ')}`
    );
}

console.log('ok');
