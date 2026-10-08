# Pragotron Design Framework

Pragotron Design Framework je sada znovupoužitelných komponent pro retro
odjezdové tabule, nástupištní cedule a další informační displeje. Framework
odděluje:

- vizuální komponenty displejů,
- katalogy podporovaných znaků a hodnot,
- layout tabule,
- runtime, který propojuje DOM se stavem,
- aplikační controller, který řeší formuláře, vzdálené řízení a persistence.

`platformTable.html` je zobrazovací část demonstračního PoC a
`platformTableManage.html` je jeho ovládací stránka. Framework není vázaný na
jejich konkrétní formulář ani na názvy stanic.

## Rychlé spuštění

Pro vývoj je vhodné spouštět projekt přes HTTP server, protože ES modules
prohlížeče z bezpečnostních důvodů nemusí načíst z `file://`:

```text
npm install
python -m http.server 8000
```

Pokud chcete používat živé odjezdy z tabule Správy železnic, spusťte místo
jednoduchého statického serveru vestavěný server:

```text
npm run serve
```

Ten kromě statických souborů poskytuje endpoint
`/api/live-departures`, který jednou za minutu serverově načte zdrojovou
ASP.NET tabuli a předá manage stránce zparsované odjezdy. Zdrojová stránka
nemá CORS hlavičku, proto ji nelze načítat přímo z prohlížeče. Výchozí
adresa scraperu je `http://127.0.0.1:4787/api/live-departures`. Manage
stránka pak použije:

```text
http://127.0.0.1:4787/platformTableManage.html
```

Odjezdovou tabuli otevřete ve stejném originu:

```text
http://127.0.0.1:4787/departureBoard.html
```

`localhost` a `127.0.0.1` jsou pro prohlížeč různé originy, tabule se
proto v manage neobjeví. Obě stránky musí běžet na `127.0.0.1`.

Potom otevřete:

```text
http://localhost:8000/platformTable.html
```

Ovládání otevřete ve druhém tabu stejného originu:

```text
http://localhost:8000/platformTableManage.html
```

Samostatnou odjezdovou tabuli otevřete jako další zobrazovací stránku:

```text
http://localhost:8000/departureBoard.html
```

Odjezdová tabule používá stejné `platformTableManage.html` a stejný
`localStorage`/transport. Po odeslání odjezdu seřadí odjezdy podle času
a začne je zobrazovat od horního řádku. Počet řádků se nastavuje v manage
(výchozí 12) nebo parametrem `departureBoard.html?rows=16`.

Při otevření přes `file://` použijí stránky vlastní loader a fallback bundle:

- `platformTableBoardLoader.js` → `platformTableBoard.file.js`,
- `platformTableManageLoader.js` → `platformTableManage.file.js`,
- `departureBoardLoader.js` → `departureBoard.file.js`.

## Struktura frameworku

```text
src/
├─ platform/
│  ├─ data.js             katalogy, znaková sada a timing
│  ├─ displays.js         display komponenty
│  ├─ departure-board.js   řádky a orchestrátor odjezdové tabule
│  ├─ runtime.js          registry a BoardRuntime
│  ├─ audio.js            zvuk jednotlivých flipů
│  ├─ lenses.js           komponenta barevných signalizačních čoček
│  ├─ analog-clock.js     adapter analogových hodin
│  ├─ night-lighting.js   noční režim a světla
│  ├─ lighting-state.js   stavové nastavení světel bez DOM
│  ├─ board-transport.js  komunikace mezi tabulí a manage stránkou
│  ├─ sun-schedule.js     výpočet východu/západu a automatický režim
│  ├─ live-departures.js  parser a API klient živých odjezdů
│  ├─ storage.js          localStorage adapter
│  └─ index.js            veřejné API
├─ templates/             definice layoutů tabulí
├─ demos/                 PoC controller a fallback loader
└─ styles/                tokeny a CSS vrstvy design systému
```

Ve vlastní aplikaci se importuje veřejné API z `src/platform/index.js`.
PoC-specific logika patří do vlastního controlleru, nikoli do komponent.

## Společný lifecycle komponent

Display komponenty se vytvářejí nad existujícím DOM elementem:

```js
const display = new SplitFlapDisplay(element, options);
```

Používají tento společný kontrakt:

| Metoda | Význam |
| --- | --- |
| `set(value)` | nastaví hodnotu animovaně |
| `setImmediate(value)` | nastaví hodnotu bez animace |
| `clear()` | animovaně zobrazí prázdnou hodnotu |
| `getValue()` | vrátí aktuální hodnotu komponenty |
| `isSettled()` | oznámí, zda doběhly všechny flipy |
| `destroy()` | zruší timery, audio a vlastní DOM |

`BoardRuntime` tento lifecycle používá automaticky. Aplikační controller by
měl před dalším odesláním dat počkat na `board.isSettled()`.

`set()` a `clear()` používají skutečnou animaci, zvuk `split-flap.wav` a
náhodnou mechanickou odchylku podle `variation`. Všechny klapky jednoho slova
nebo řádku začínají flipovat naráz; odchylka mění jen délku jednotlivých
flipů, ne jejich start. Platí to i pro číslice času, typ vlaku a zpoždění.

Timing lze pro konkrétní `BoardRuntime` změnit bez zásahu do komponent:

```js
board.setFlapTiming({
    duration: 220,
    variation: 4
});
```

`duration` je délka jednoho flapu v milisekundách a podporovaný rozsah je
`50–500` s krokem `10 ms`. `variation` určuje náhodnou odchylku na každém flapu v rozsahu
`0–10 ms`. Výchozí hodnoty jsou `190` a `0`; hodnoty se zaokrouhlí a omezí
na povolený rozsah.

## Znaková sada split-flapu

Výchozí znakovou sadu exportuje `data.js` jako `STATION_FLAP_SEQUENCE`:

```js
import {
    STATION_CHARACTER_COUNT,
    STATION_FLAP_SEQUENCE
} from './src/platform/index.js';
```

Aktuální pořadí fyzické klapky je:

```js
[
    ' ',
    '.', '-', '/',
    'A', 'Á', 'Ä', 'B', 'C', 'Č', 'D', 'Ď', 'E', 'É', 'Ě', 'Ë',
    'F', 'G', 'H', 'I', 'Í', 'Ï', 'J', 'K', 'L', 'Ľ', 'M', 'N', 'Ň',
    'O', 'Ó', 'Ö', 'P', 'Q', 'R', 'Ř', 'Ŕ', 'S', 'Š', 'T', 'Ť',
    'U', 'Ú', 'Ů', 'Ü', 'V', 'W', 'X', 'Y', 'Ý', 'Ÿ', 'Z', 'Ž',
    ',', ':', ';', '+', '(', ')', '[', ']',
    '!', '?', '%', '&', '#', "'",
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
]
```

Pořadí není pouze seznam povolených znaků. Klapka při animaci postupuje
sekvenčně od aktuálního znaku k cílovému znaku, proto musí odpovídat pořadí
znaků na skutečném kotouči. Platí přitom pevné pravidlo fyzického mechanismu:
každý split-flap se smí posunout pouze na následující položku sekvence.
Komponenta nikdy nevolí kratší cestu zpět. Například změna `5` na `4` musí
projít přes `6`, `7`, `8`, `9`, prázdnou kartu, `0`, `1`, `2`, `3` a teprve
potom `4`. Toto pravidlo platí také pro vlastní číselné, časové, zpožďovací a
vlakové katalogy, které proto musí být cyklické a musí obsahovat prázdnou kartu,
pokud ji fyzický kotouč má.

`SplitFlapDisplay`:

- převádí vstup na velká písmena pomocí `toLocaleUpperCase('cs-CZ')`,
- nepodporovaný znak nahradí mezerou,
- slovo `nad` zkrátí na `n/` a přilepí k následujícímu slovu
  (`Suchdol nad Odrou` → `SUCHDOL N/ODROU`); spojky `u`, `na` a `pod`
  nechává s mezerou (`Hustopeče u Brna`, `Slavkov u Brna`),
- delší název zkrátí po slovech, uříznuté slovo nenechá končit samohláskou
  (`Uherské Hradiště` → `UHERSKÉ HRAD.`, `Brno-h.Heršpice` → `BRNO-H.HERŠP.`)
  a tečku nepřidá, když už zkrácený tvar tečkou končí — místo toho vezme
  další písmeno (`Pardubice hl.n.` → `PARDUBICE HL.N`),
- zkrácený název smí být kratší než `maxLength`,
- kratší text doplní mezerami zprava,
- výchozí délka je `STATION_CHARACTER_COUNT`, tedy 14 znaků.

Pokud má konkrétní tabule jiný kotouč, nepřidávejte znaky pouze do HTML.
Předejte vlastní sekvenci:

```js
const PLATFORM_SEQUENCE = Object.freeze([
    ' ',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z'
]);

const platformDisplay = new SplitFlapDisplay(element, {
    maxLength: 3,
    sequence: PLATFORM_SEQUENCE
});

platformDisplay.set('3');
```

Sekvence musí obsahovat mezeru. Hodnota v aplikaci musí používat znaky, které
jsou v sekvenci přesně po normalizaci na velká písmena.

## Split-flap pro text, stanici nebo nástupiště

HTML element musí mít třídu `.flap-display`. Pro samostatnou komponentu:

```html
<div id="platformDisplay" class="flap-display" role="img"></div>
```

```js
import {
    SplitFlapAudio,
    SplitFlapDisplay
} from './src/platform/index.js';

const audio = new SplitFlapAudio();
const platformDisplay = new SplitFlapDisplay(
    document.querySelector('#platformDisplay'),
    {
        maxLength: 3,
        sequence: PLATFORM_SEQUENCE,
        audio
    }
);

platformDisplay.set('3');
// Později:
platformDisplay.set('12');
platformDisplay.clear();

// Čtení normalizované hodnoty:
console.log(platformDisplay.getValue());

// Ukončení aplikace:
platformDisplay.destroy();
```

Pro název stanice se obvykle použije výchozí délka a sekvence:

```js
const station = new SplitFlapDisplay(stationElement, {
    maxLength: 14,
    sequence: STATION_FLAP_SEQUENCE
});

station.set('Bratislava');
```

Při použití runtime se komponenta nevytváří ručně; její nastavení patří do
definice slotu:

```js
const slots = [{
    id: 'platform',
    type: 'split-flap',
    selector: '[data-board-slot="platform"]',
    statePath: 'platform',
    options: {
        maxLength: 3,
        sequence: PLATFORM_SEQUENCE
    }
}];
```

## Čas odjezdu

`DepartureTimeDisplay` je složený display ze tří číselných flapů:

- hodiny `0–23`,
- desítky minut `0–5`,
- jednotky minut `0–9`.

Požadovaná HTML struktura:

```html
<div
    class="departure-time-display"
    data-board-slot="departureTime"
    role="img"
    aria-label="Odjezd"
>
    <div class="time-flap time-hour-flap"></div>
    <span class="time-separator" aria-hidden="true">.</span>
    <div class="time-minute-group">
        <div class="time-flap time-minute-flap"></div>
        <div class="time-flap time-minute-flap"></div>
    </div>
</div>
```

Použití bez runtime:

```js
const departure = new DepartureTimeDisplay(element, { audio });

departure.set(16, 20);
departure.set('07.05');
departure.setImmediate(12, 30);
departure.clear();
```

Ve stavovém API je čas objekt:

```js
{
    hours: 16,
    minutes: 20
}
```

Prázdný čas je `null`, nikoli `{ hours: 0, minutes: 0 }`:

```js
board.setState({
    stations: ['', ''],
    train: '',
    delay: '',
    departureTime: null
}, { immediate: true });
```

Každý ze tří číselných flapů získává vlastní náhodnou odchylku časování.

## Nízkourovňový číselný flap

`SequentialNumericFlap` se hodí pro vlastní číselné komponenty, například
číslo koleje, nástupiště nebo pořadové číslo:

```html
<div id="trackNumber" class="time-flap"></div>
```

```js
const track = new SequentialNumericFlap(
    document.querySelector('#trackNumber'),
    1,              // minimum
    12,             // maximum
    { audio }
);

track.set(5);
track.setImmediate(8);
track.clear();
```

Číselný flap zobrazuje hodnoty včetně definovaného rozsahu a při animovaném
nastavení postupuje po jednotlivých číslech. Pro běžný čas použijte raději
`DepartureTimeDisplay`.

## Zpoždění

`DelayFlapDisplay` zobrazuje číslo a jednotku `min` jako jeden flap:

```html
<div class="delay-flap-display" role="img"></div>
```

```js
const delay = new DelayFlapDisplay(
    document.querySelector('.delay-flap-display'),
    DELAY_VALUES,
    { audio }
);

delay.set(7);
delay.set(12);       // na tabuli se zobrazí 10 min
delay.setImmediate(30);
delay.clear();
```

`DelayFlapDisplay` přijímá skutečné nezáporné zpoždění v minutách. Výchozí
stav (`DELAY_OFFSET_DEFAULT = false`) od zpoždění nic neodečítá a mapuje
na katalog včetně zadané hodnoty (7 → 5, 10 → 10, 5 → 5). V manage se offset
ovládá checkboxem „Odečíst 5 minut“, který je ve výchozím stavu vypnutý.
Po zapnutí hodnoty do 5 minut včetně skryje a vyšší zaokrouhlí na nižší
položku z `DELAY_VALUES` (7 → 5, 10 → 5, 11 → 10):

```js
delay.set(7);  // zobrazí 5 min
delay.set(10); // zobrazí 10 min
delay.set(11); // zobrazí 10 min
delay.set(5);  // zobrazí 5 min
delay.setDelayOffset(true);
delay.set(10); // zobrazí 5 min
delay.set(5);  // prázdný flap
```

Výchozí možnosti jsou exportované jako `DELAY_VALUES`. Vlastní seznam je
možné předat konstruktorem:

```js
const customDelay = new DelayFlapDisplay(element, ['', 1, 2, 3, 5, 10], {
    audio
});
```

## Čočky a signalizační světla

`LensDisplay` vykresluje skupinu barevných čoček se samostatně řízeným
světlem. Výchozí počet je dvě čočky, což odpovídá dvěma signalizačním
světýlkům v PoC:

```html
<div
    id="indicatorLenses"
    class="lens-display"
    role="img"
    aria-label="Signalizační čočky"
></div>
```

```js
import {
    LensDisplay,
    SplitFlapAudio,
    createDefaultLensState,
    LENS_COLORS
} from './src/platform/index.js';

const lenses = new LensDisplay(
    document.querySelector('#indicatorLenses'),
    {
        count: 2,
        defaultState: createDefaultLensState(2, {
            color: 'red',
            enabled: true,
            blinking: true
        })
    }
);
```

Barvy dostupné v katalogu `LENS_COLORS` jsou:

| Klíč | Sklíčko i světlo |
| --- | --- |
| `green` | zelená |
| `yellow` | žlutá |
| `red` | červená |
| `blue` | modrá |
| `coolWhite` | studená bílá |

Barva sklíčka a světla je společná vlastnost `color`, aby čočka odpovídala
reálnému signalizačnímu světlu:

```js
lenses.set({
    lenses: [
        {
            color: 'green',
            enabled: true,
            blinking: true,
            blinkInterval: 0.4,
            blinkDelay: 0
        },
        {
            color: 'green',
            enabled: true,
            blinking: true,
            blinkInterval: 0.4,
            blinkDelay: 0.4
        }
    ],
    preDeparture: {
        enabled: true,
        seconds: 90
    }
});
```

Vlastnosti jedné čočky:

| Vlastnost | Význam |
| --- | --- |
| `color` | společný klíč barvy sklíčka i světla z `LENS_COLORS` |
| `enabled` | zda čočka svítí |
| `blinking` | zda světlo bliká |
| `blinkInterval` | doba do dalšího přepnutí čoček v sekundách, `0.1–1.5` |
| `blinkDelay` | interní fáze odvozená od intervalu; u druhé čočky je přímo interval |

`LensDisplay` je dvojice řízená jako jeden komponent: první čočka začíná
rozsvícená a druhá má vždy fázi přesně o jeden nastavený interval později.
Změna intervalu proto nemůže způsobit překryv nebo náhodné rozhození blikání.
Komponenta používá CSS animaci, takže při běžném provozu nepotřebuje vlastní
JavaScriptový timer. `clear()` čočky zhasne, `setImmediate()` nastaví stav bez
čekání a `getValue()` vrací objekt `{ lenses: [...], preDeparture: {...} }`.

Výchozí stav čoček v manage nastavení je zapnutý (`enabled: true`) včetně
volby `Rozblikat před odjezdem`. Prázdná tabule bez odjezdu zůstává
zhasnutá. Blok `preDeparture` obsahuje `enabled` a `seconds` v rozsahu
`0–300` po 10 sekundách, výchozí hodnota je `90`. Je-li zapnutý, controller aktivuje čočky až
v okamžiku `odjezd − zobrazené zpoždění − seconds`; po aktivaci blikají
až do dalšího nastavení tabule. Odjezd, jehož čas (včetně zobrazeného
zpoždění) už dnes uplynul, se bere jako zítřejší, aby noční spoje po
půlnoci nerozsvítily čočky večer předem. Odjezd bez zpoždění, který je
nejvýše 10 minut v minulosti včetně, zůstává dnešní a na tabuli. Nastavení změněné v manage UI
se na tabuli neposílá okamžitě, ale až akcí „Odeslat na tabuli“.

## Typ vlaku

`TrainFlapDisplay` zobrazuje jednu katalogovou položku. Výchozí katalog
`TRAIN_TYPES` obsahuje textové typy i obrazové varianty.

```html
<div class="train-flap-display" role="img"></div>
```

```js
const train = new TrainFlapDisplay(
    document.querySelector('.train-flap-display'),
    TRAIN_TYPES,
    { audio }
);

train.set('Ex');
train.set('Eurocity');
train.setImmediate('');
```

Položka katalogu může mít tyto vlastnosti:

| Vlastnost | Význam |
| --- | --- |
| `name` | veřejná hodnota používaná v `set()` a `aria-label` |
| `text` | hlavní text zobrazený na flapě |
| `suffix` | menší doplňkový text, například `lôžk.` nebo `miest.` |
| `source` | URL obrázku; obrázek se vloží do obou polovin flap |
| `background` | barva pozadí |
| `foreground` | barva textu |

Příklad vlastního katalogu:

```js
const CUSTOM_TRAIN_TYPES = Object.freeze([
    {
        name: '',
        text: '',
        background: 'var(--flap-background)',
        foreground: 'var(--flap-foreground)'
    },
    {
        name: 'IC',
        text: 'IC',
        background: '#1e3c69',
        foreground: '#fff'
    },
    {
        name: 'Airport Express',
        source: 'images/airport-express.svg',
        background: '#fff',
        foreground: '#000'
    }
]);

const customTrain = new TrainFlapDisplay(element, CUSTOM_TRAIN_TYPES, {
    audio
});

customTrain.set('IC');
```

`source` je relativní k dokumentu, stejně jako `src` u běžného HTML obrázku.
Pokud použijete obrázek, musí být dostupný v HTTP i ve fallback/file režimu.

## Odjezdová tabule

`DepartureBoardDisplay` je šablonová komponenta pro odjezdovou tabuli
s nastavitelným počtem řádků (výchozí 12, rozsah 1–24). Logo v záhlaví
se volí v manage (ČD, SŽ, SŽ bílé, Pragotron nebo vlastní SVG) a
ukládá se do `board:settings` jako `departureBoardLogo` a
`departureBoardLogoSvg`. V záhlaví vedle loga běží aktuální čas
jako stejný split-flap jako čas odjezdu.
Barva čoček se při načtení vezme z nastavení manage (`settings.lenses`)
a platí hned, i na prázdných řádcích. Rozsvícení dál řídí konkrétní odjezd.
Každý řádek (`DepartureBoardRow`) obsahuje čočky, typ vlaku, číslo vlaku,
dvě stanice, čas, zpoždění, nástupiště, kolej a sektor. Controlleru stačí
předat pole odjezdů:

```js
import {
    DepartureBoardDisplay,
    SplitFlapAudio
} from './src/platform/index.js';

const board = new DepartureBoardDisplay(
    document.querySelector('#departureBoard'),
    { audio: new SplitFlapAudio() }
);

board.update([
    {
        id: '1/6a/Jih',
        stations: ['PRAHA', 'BRATISLAVA'],
        train: 'Eurocity',
        trainNumber: '372',
        delay: 12,
        departureTime: { hours: 11, minutes: 0 },
        target: { platform: '1', track: '6a', sector: 'Jih' },
        lenses: {
            lenses: [
                { color: 'green', enabled: true, blinking: true },
                { color: 'green', enabled: true, blinking: true }
            ],
            preDeparture: { enabled: false, seconds: 60 }
        }
    }
]);
```

Tabule vždy zobrazí nejvýše tolik platných odjezdů, kolik má řádků,
a seřadí je podle času. Noční spoje po půlnoci, které už dnes nemají
skutečné zpoždění, se řadí až za dnešní večerní odjezdy — stejně v
manage tabulce (řazení podle času) i na odjezdové tabuli. Offset
zpoždění mění jen zobrazenou hodnotu na flapu, ne to, zda odjezd
vůbec zůstane v seznamu. Počet řádků
změní `board.setRowCount(12)` nebo nastavení v manage.
Odjezdy se zpracovávají frontou po celých řádcích: současně se mění nejvýše
jeden řádek a další začne až po jeho dokončení. Pokud se odjezd odstraní a
ostatní řádky se musí posunout nahoru, vloží se před posun jednosekundová
pauza; řádky, které se nemění, se znovu neanimují.

HTML řádek musí obsahovat sloty s atributem `data-departure-slot`:

```html
<tr data-departure-row>
    <td><div data-departure-slot="lenses" class="lens-display"></div></td>
    <td><div data-departure-slot="train" class="train-flap-display"></div></td>
    <td><div data-departure-slot="trainNumber"></div></td>
    <td><div data-departure-slot="stationOne" class="flap-display"></div></td>
    <td><div data-departure-slot="stationTwo" class="flap-display"></div></td>
    <!-- time, delay, platform, track, sector -->
</tr>
```

Číslo vlaku je čtyřslotová komponenta `TrainNumberDisplay`. Zarovnává
číslice vpravo a používá fyzický katalog karet:

- prázdná karta a `0–9` s výchozím pozadím,
- `0–9` s bílým pozadím a černým textem pro Intercity, Eurocity, IC, EC
  a SuperCity,
- `0–9` s modrým pozadím pro `Sp` a NightJet (`nj`),
- `0–9` s červeným pozadím pro `R`, railjet (`rj`), regiojet (`RJ`), `Ex`,
  `ČEDOK` a `ROH`.

`CatalogFlapDisplay` je vhodný pro hodnoty, které nejsou běžný text. PoC jej
využívá pro kolej (`'', 1, 2, 3, 4, 5, 6, 6a, 11a`) a sektor
(`'', Sever, Jih`). Katalog je vždy cyklický a komponenta postupuje pouze
dopředu; při změně z `5` na `4` proto projde přes `6`, `7`, `8`, `9`, prázdnou
kartu, `0`, …, `4`. Stejné pravidlo musí dodržovat každý nový katalog.

`departureBoard.html` a `src/demos/departureBoard.js` jsou hotový příklad
zapojení. Přes `BoardTransport` poslouchají zprávy `manage:departures` a
`board:settings`; při startu si vezmou poslední odjezdy a timing z uloženého
stavu. Správa zůstává výhradně na `platformTableManage.html`.

## Audio

`SplitFlapAudio` přehraje pro každý flip samostatný klon zvuku. Díky tomu
může hrát více flapů současně:

```js
const audio = new SplitFlapAudio('assets/split-flap.wav');
const registry = createDefaultRegistry({ audio });
```

Výchozí cesta je `split-flap.wav` relativně k aktuálnímu dokumentu.
Jednoznakové klapky ho používají dál. Typ vlaku, zpoždění, nástupiště, kolej
a sektor volají `play('pitched')` a hrají `split-flap_pitched_down.wav`.
Oba soubory trvají 170 ms; `playbackRate` je `170 / délka flapu`, takže zvuk
skončí zároveň s otočením i při jiné nastavené rychlosti.
Vlastní audio objekt lze předat všem display komponentám nebo sdílet přes
`createDefaultRegistry()`.

Prohlížeč povolí přehrávání až po uživatelské akci. Controller může aktivaci
navázat na kořen tabule a stav zobrazit ve vzdáleném manage:

```js
audio.bindUserActivation(boardRoot);
audio.subscribe((state) => console.log(state.unlocked));
audio.getState(); // { available, unlocked, muted }
```

`setMuted(true)` zvuk flapů na dané tabuli úplně vypne: `play()` se nespustí.
Stav se pamatuje v `sessionStorage` daného okna. V manage seznamu připojených
tabulí je u každé instance tlačítko pro ztlumení a opětovné zapnutí.

Pro vypnutí zvuku v testu lze předat vlastní audio objekt s prázdnou metodou:

```js
const silentAudio = { play() {}, destroy() {} };
```

## BoardRuntime a stav tabule

Runtime propojuje HTML sloty s komponentami a JSON stavem:

```html
<section id="myBoard">
    <div data-board-slot="from" class="flap-display"></div>
    <div data-board-slot="platform" class="flap-display"></div>
    <div data-board-slot="train" class="train-flap-display"></div>
</section>
```

```js
import {
    createBoard,
    createDefaultRegistry,
    createEmptyBoardState,
    SplitFlapAudio
} from './src/platform/index.js';

const template = {
    rootSelector: '#myBoard',
    slots: [
        {
            id: 'from',
            type: 'split-flap',
            selector: '[data-board-slot="from"]',
            statePath: ['stations', 0]
        },
        {
            id: 'platform',
            type: 'split-flap',
            selector: '[data-board-slot="platform"]',
            statePath: 'platform',
            options: {
                maxLength: 3,
                sequence: PLATFORM_SEQUENCE
            }
        },
        {
            id: 'train',
            type: 'train-flap',
            selector: '[data-board-slot="train"]',
            statePath: 'train'
        }
    ]
};

const board = createBoard({
    root: document.querySelector(template.rootSelector),
    slots: template.slots,
    registry: createDefaultRegistry({
        audio: new SplitFlapAudio()
    }),
    initialState: createEmptyBoardState()
});

board.setState({
    stations: ['PRAHA', ''],
    platform: '3',
    train: 'Ex',
    delay: '',
    departureTime: null
});
```

Stav se může lišit od výchozího `createEmptyBoardState()`; `BoardRuntime`
zkopíruje známé hodnoty a neznámé sloty nechá v jejich komponentě. Veřejný
stav pro vzdálené řízení má být JSON serializovatelný:

```js
const state = board.getState();
const unsubscribe = board.subscribe((nextState) => {
    console.log('Tabule:', nextState);
});

board.setState(nextState);
board.setState(nextState, { immediate: true });
console.log(board.isSettled());

unsubscribe();
board.destroy();
```

`statePath` může být řetězec nebo pole. Pole je nutné pro indexování pole:

```js
statePath: ['stations', 0]
statePath: ['platform', 'number']
statePath: 'train'
```

U `departure-time` runtime očekává objekt `{ hours, minutes }` nebo `null`.
Ostatní display hodnoty jsou obvykle řetězce či čísla podle konkrétní
komponenty.

## Vlastní komponenta v registru

Existující registry lze rozšířit vlastním typem:

```js
const registry = createDefaultRegistry({ audio });

registry.register('platform-number', (element, options) =>
    new SplitFlapDisplay(element, {
        ...options,
        maxLength: 3,
        sequence: PLATFORM_SEQUENCE,
        audio
    })
);
```

Slot potom používá:

```js
{
    id: 'platform',
    type: 'platform-number',
    selector: '[data-board-slot="platform"]',
    statePath: 'platform'
}
```

Pro úplně nový typ komponenty musí factory vracet objekt s metodami
`set`, `setImmediate`, `getValue`, `isSettled` a `destroy`. Pokud podporuje
prázdnou hodnotu, přidejte i `clear` a případně `clearImmediate`.

```js
class StaticLabelDisplay {
    constructor(element) {
        this.element = element;
        this.value = '';
    }

    set(value) {
        this.value = String(value ?? '');
        this.element.textContent = this.value;
        return this.value;
    }

    setImmediate(value) {
        return this.set(value);
    }

    getValue() {
        return this.value;
    }

    isSettled() {
        return true;
    }

    destroy() {
        this.element.replaceChildren();
    }
}

registry.register(
    'static-label',
    (element, options) => new StaticLabelDisplay(element, options)
);
```

## Šablony tabulí

Šablona obsahuje pouze layoutovou konfiguraci, ne formulář ani persistence.
Aktuální PoC používá `src/templates/platformTable.js`:

```js
export const PLATFORM_TABLE_TEMPLATE = {
    rootSelector: '#tabule',
    slots: [
        {
            id: 'stationOne',
            type: 'split-flap',
            selector: '[data-board-slot="stationOne"]',
            statePath: ['stations', 0]
        }
        // další sloty...
    ]
};
```

Doporučený postup pro novou tabuli:

1. navrhnout HTML a každému display místu dát `data-board-slot`,
2. vytvořit šablonu v `src/templates/`,
3. zvolit komponentu přes `type`,
4. namapovat stav pomocí `statePath`,
5. vytvořit controller, který zavolá `createBoard`,
6. vlastní CSS omezit na novou šablonu nebo na společné komponentové třídy.

## Analogové hodiny

`AnalogClock` je adapter pro stávající jQuery plugin
`js/jquery.thooClock.js`. Plugin musí být načtený před mountem:

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="js/jquery.thooClock.js"></script>
```

```js
const clock = new AnalogClock(
    document.querySelector('#pragotronAnalogClock'),
    {
        size: 512,
        showNumerals: false,
        showMinuteLines: false,
        secondHandEnabled: false
    }
);

clock.mount();
clock.redraw();
clock.transitionNightMode();
clock.destroy();
```

Výchozí nastavení jsou exportovaná jako `DEFAULT_CLOCK_OPTIONS`. Adapter
řeší mount a cleanup; aplikace nemusí volat jQuery plugin přímo.

## Noční režim a světla

`NightLighting` řídí třídu `night-mode`, žárovky, timer nepravidelného
poblikávání a CSS proměnné osvětlení hodin:

```js
const lighting = new NightLighting({
    root: document.querySelector('#skrin'),
    clockBlock: document.querySelector('#clockBlock'),
    initialLamps: savedState?.lamps || {},
    initialClock: savedState?.clockLight || NIGHT_CLOCK_DEFAULTS
});

lighting.mount();
lighting.setNightMode(true);
lighting.setClockLight({
    enabled: true,
    intensity: 50
});

lighting.updateLamp('top-left', {
    enabled: true,
    variation: true,
    intensity: 80,
    speed: 45,
    fade: 'slow'
});
```

Výchozí katalog je `NIGHT_LIGHT_DEFAULTS`. Jedna konfigurace světla má:

| Vlastnost | Význam |
| --- | --- |
| `id` | vazba na `data-light-id` v HTML |
| `enabled` | zda světlo svítí |
| `variation` | zda smí mít efekt |
| `intensity` | intenzita `0–100` |
| `speed` | délka cyklu v sekundách, `1–120` |
| `fade` | `none`, `soft`, `slow` nebo `flicker` |

`NIGHT_FADE_MODES` obsahuje hodnoty vhodné pro select ve vlastním UI.
Při skrytí stránky se efekty pozastaví a při `destroy()` se všechny timery
uklidí.

Výchozí parametry všech pěti žárovek jsou stejné jako u `Horní levá`
(`enabled: true`, `variation: true`, `intensity: 100`, `speed: 45`,
`fade: 'soft'`). Rozdíly v barvě, kuželu ani délce cyklu se proto nevytvářejí
v CSS; pokud je potřeba rozdílné chování, nastavuje se výhradně v manage UI.

Po změně režimu je potřeba synchronizovat i adapter hodin:

```js
function setNightMode(isNight) {
    lighting.setNightMode(isNight);
    clock.transitionNightMode();
}
```

Automatické řízení používá `sunrise-sunset-js`, výchozí souřadnice Bratislavy
a časové pásmo `Europe/Bratislava`:

```js
import {
    BRATISLAVA_SUN_LOCATION,
    SunSchedule
} from './src/platform/index.js';

const schedule = new SunSchedule({
    location: BRATISLAVA_SUN_LOCATION,
    onChange: (isNight) => {
        lighting.setNightMode(isNight);
        clock.transitionNightMode();
    }
}).start();

schedule.destroy();
```

V PoC se automatika zapíná přepínačem vedle tlačítka denního/nočního režimu.
Po zapnutí se hned nastaví denní nebo noční režim podle aktuálního východu
a západu slunce; další přepnutí přijde při nejbližší hranici. Manage stránka
i zobrazovací stránka tabule počítají slunce samostatně, takže automatika
funguje i když je otevřená jen jedna z nich.

## Oddělená stránka tabule a manage

PoC používá dvě stránky stejného originu:

- `platformTable.html` pouze vykresluje tabuli a přijímá příkazy,
- `platformTableManage.html` obsahuje formulář a nastavení.

Propojení zajišťuje `BoardTransport`. Primárně používá `BroadcastChannel`,
při jeho nedostupnosti použije `storage` event přes vlastní namespaced klíč.
Obě stránky proto musí být otevřené ve stejném prohlížeči a na stejném originu.
Příkazy s animovanou změnou dostávají potvrzení až po `board.isSettled()`.

Každá nástupištní tabule má stabilní identitu složenou z nástupiště, koleje
a volitelného sektoru. Nastavit ji lze parametry URL:

```text
platformTable.html?platform=1&track=6a&sector=Jih
```

nebo po načtení tabule příkazem v konzoli:

```js
window.pragotron.configureIdentity({
    platform: "1",
    track: "6a",
    sector: "Jih"
});
```

Identita se ukládá do `sessionStorage`. Manage stránka tabule objevuje pomocí
discovery zpráv a heartbeatů; v seznamu proto může být současně více tabulí
stejné identity. Příkaz s prázdným sektorem se doručí všem sektorům dané
koleje, zatímco vyplněný sektor se doručí pouze přesné shodě.

U každé aktivní tabule je v manage stránce také administrátorské tlačítko
`Identifikovat čočky`. Cíleně rozsvítí všechny čočky dané instance bez
blikání. Na odjezdové tabuli se rozsvítí všechny čočky na všech řádcích.
Druhé stisknutí obnoví původní stav podle právě platných odjezdů;
identifikace proto nemění uložené nastavení ani odjezd. Vedle něj je tlačítko
pro ztlumení zvuku flapů jen u této instance. Ztlumená tabule zvuk vůbec
nespouští.

V manage editoru je volba `Bliká` záměrně pouze informativní a zůstává vždy
zaškrtnutá; blikání čoček je součástí jejich komponentového chování.

## Živé odjezdy ze stanice

Manage stránka obsahuje tlačítko `Spustit live odjezdy`. Po jeho aktivaci
každou minutu načte zvolenou tabuli Správy železnic přes
`/api/live-departures`. Výchozí zdroj je Brno hlavní nádraží
(`StationTable.aspx?Key=455`), v manage jde URL změnit na jinou stanici
se stejným formátem. Vedle popisku `Adresa tabule SŽ` parser doplní název
stanice z `LStationName` jako odkaz na právě použitou URL. Nový snapshot:

- používá pravidelný čas jako `departureTime`,
- z rozdílu pravidelného a aktuálního času vypočítá skutečné zpoždění,
- z čísla vlaku ponechá nejvýše čtyři číslice zprava (interní `liveKey`
  si ale drží celé zdrojové číslo),
- uloží první zastávku ze sloupce `Přes` a názvy stanic zkrátí na 14 znaků
  (`nad` → `n/`, `u` zůstane s mezerou, uříznuté slovo nekončí samohláskou),
- rozloží vlak na typ, číslo a dopravce; dopravce zůstává jen ve sloupci
  manage tabulky,
- `IC` mapuje na Intercity, `EC` na Eurocity, `SC` na SuperCity,
  `EN` na EuroNight, `nj`/`NJ`/`NightJet` na NightJet,
- `rj` s dopravcem ČD je railjet a `rj`/`RJ` s dopravcem RegioJet (`RJET`) je
  regiojet; klapka na tabuli bere přesnou shodu `rj`/`RJ`, ne jen malá písmena;
  parser bere kód i bez mezery (`nj456`); Intercity, SuperCity mají bílé pozadí a logo, railjet červené
  `#D80300`, regiojet žluté `#F1B504` a NightJet modré `#1e3c69`,
- rozliší odjezdy podle dne a čísla vlaku, takže změna zpoždění nebo
  doplnění nástupiště/koleje/sektoru aktualizuje stejný záznam,
- odebere živé záznamy, které už ve zdrojové tabuli nejsou.

Změna nástupiště, koleje nebo sektoru proto upraví stejný řádek podle
`liveKey`; nevzniká nový odjezd. Odjezdy bez přiděleného nástupiště nebo koleje
zůstávají v manage i na odjezdové tabuli, ale nemohou být směrovány na
konkrétní nástupištní tabuli. Stejně se chová ruční formulář: nástupiště a kolej
nejsou povinné a dopravce se zadává do pole `Dopravce`. Při změně cílové identity
controller nejprve resetuje starou tabuli a potom odešle nový stav na novou identitu.

Parser je samostatně použitelný:

```js
import {
    extractStationName,
    LIVE_STATION_DEFAULTS,
    parseStationTable
} from './src/platform/index.js';

const station = extractStationName(html) || LIVE_STATION_DEFAULTS.name;
const departures = parseStationTable(html).map((departure) => ({
    ...departure,
    source: station
}));
```

Serverová implementace je v `scripts/live-departures-server.mjs`; zdrojová
stránka nemá CORS hlavičku, proto live režim nepoužívá přímý browser fetch.

```js
const transport = new BoardTransport();

transport.subscribe((message) => {
    if (message.type === 'board:ready') {
        // Manage stránka může odeslat aktuální nastavení.
    }
});

transport.publish('board:command', {
    action: 'apply-board',
    target: {
        platform: '1',
        track: '6a',
        sector: 'Jih'
    },
    state: {
        stations: ['PRAHA', 'BRNO'],
        train: 'Ex',
        delay: 12,
        departureTime: { hours: 16, minutes: 20 },
        lenses: { lenses: [] }
    }
});
```

## Persistence a vzdálené ovládání

PoC manage ukládá odeslané odjezdy do namespaced `localStorage` jako kolekci
unikátní podle kombinace `platform + track + sector`. Odeslání stejné
kombinace řádek nahradí. Nově připojená tabule s odpovídající identitou dostane
automaticky poslední uložený stav; reset ukládá i explicitní prázdný stav, aby
se po reconnectu neobnovil starý odjezd. Číselné zpoždění zůstává skutečnou
hodnotou, ale zobrazovací komponenta používá katalog nejbližší nižší hodnoty.
Ve výchozím stavu (offset vypnutý) se od zpoždění nic neodečítá; po
zapnutí offsetu v manage hodnoty do 5 minut včetně skryje.

Manage může u odjezdu evidovat také volitelné číslo vlaku o délce nejvýše
čtyř číslic. Zobrazuje se a řadí v manage tabulce, ale aktuální nástupištní
tabule ho zatím nepoužívá ani nevykresluje.

Framework komponenty samy neukládají stav. Controller může použít
`LocalStorageAdapter`:

```js
const storage = new LocalStorageAdapter('my-board-state.v1');

storage.save({
    board: board.getState(),
    lamps: lighting.getLampSettings(),
    clockLight: lighting.getClockSettings(),
    nightMode: lighting.isNightMode()
});

const saved = storage.load();
```

Pro vzdálené API je vhodné posílat odděleně:

```js
{
    board: {
        stations: ['PRAHA', 'BRNO'],
        platform: '3',
        train: 'Ex',
        delay: 5,
        departureTime: { hours: 16, minutes: 20 }
    },
    displayOptions: {
        immediate: false
    }
}
```

Přijímací controller validuje payload, zavolá `board.setState()` a po
`board.isSettled()` může potvrdit dokončení akce. Do transportní vrstvy
neposílejte DOM elementy ani instance komponent.

## CSS a design systém

`style.css` je vstupní stylesheet:

```css
@import url('src/styles/tokens.css');
@import url('src/styles/board.css');
@import url('src/styles/flaps.css');
@import url('src/styles/manage.css');
@import url('src/styles/night.css');
```

Význam vrstev:

- `tokens.css` — barvy, rozměry, font a globální design tokeny,
- `board.css` — skříň, lem, tabule, řádky a hodiny,
- `flaps.css` — společná geometrie a animace flap komponent,
- `lenses.css` — vzhled a blikání signalizačních čoček,
- `manage.css` — ovládací formulář PoC,
- `night.css` — noční režim a světelné efekty.

Pro použití komponent v jiné tabuli zachovejte jejich sémantické třídy:

- `.flap-display`,
- `.flap-character`,
- `.train-flap-display`,
- `.delay-flap-display`,
- `.departure-time-display`,
- `.time-flap`.

Aktuální CSS používá selektory `#tabule` kvůli přesné vizuální kompatibilitě
PoC. Při tvorbě nové tabule je vhodné buď použít stejné ID, nebo vytvořit
novou tematickou CSS vrstvu se stejnými komponentovými třídami a novým
root scope. Nemíchejte ad-hoc pozdější přepisy stejného selektoru.

Font `Roboto Condensed` je uložen lokálně ve `fonts/`, takže komponenty
nepotřebují externí font server.

## Doporučené standardy

- Veřejný stav udržujte JSON serializovatelný.
- Pro text vždy používejte `STATION_FLAP_SEQUENCE` nebo fyzicky odpovídající
  vlastní sekvenci.
- Prázdný čas reprezentujte `null`, nikoli hodnotou `0:00`.
- `set()` používejte pro běžnou změnu obsahu, `setImmediate()` při prvním
  renderu nebo při obnově uloženého stavu bez animace.
- Před zničením tabule volejte `destroy()` na runtime, hodinách i osvětlení.
- Sdílejte jeden `SplitFlapAudio` mezi komponentami jedné tabule.
- Pro vlastní vlakový typ vždy uveďte prázdnou položku jako první katalogovou
  položku.
- Pro ovládání z jiné aplikace validujte názvy typů, rozsahy časů, délku textu
  a povolené hodnoty zpoždění před voláním runtime.
- Ovládací UI, persistence a síťovou komunikaci držte mimo display
  komponenty.
