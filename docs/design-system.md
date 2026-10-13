# Pragotron platforma a design systém

Podrobný návod k použití všech komponent, katalogů, runtime, šablon a
nočního režimu je v dokumentu
[`framework-usage.md`](./framework-usage.md).

Projekt obsahuje znovupoužitelné komponenty pro retro split-flap tabule.
`platformTable.html` je zobrazovací stránka demonstrační tabule a
`platformTableManage.html` je její ovládací stránka; ani jedna není zdrojem
komponent samotných.
`departureBoard.html` je samostatná odjezdová tabule s nastavitelným počtem
řádků, která používá stejný manage a transport.

## Spuštění

Primární runtime používá ES modules, proto je doporučené spouštět PoC přes
HTTP origin:

```text
npm install
python -m http.server 8000
```

Pro režim živých odjezdů spusťte:

```text
npm run serve
```

Vestavěný server obsluhuje stránky i proxy endpoint
`/api/live-departures` na `http://127.0.0.1:4787`, protože zdrojová tabule
Správy železnic nemá CORS. Port 8787 na Windows často spadne do
zakázaného rozsahu, proto je výchozí 4787.

Potom otevřít `http://localhost:8000/platformTable.html` a ve druhém tabu
`http://localhost:8000/platformTableManage.html`; odjezdová tabule je na
`http://localhost:8000/departureBoard.html`.

Při přímém otevření přes `file://` použijí stránky vlastní loader a lokální
kompatibilní bundle. Pro ovládání musí být oba soubory otevřené ve stejném
prohlížeči a originu.

## Vrstevnice projektu

- `src/platform/data.js` — katalogy, znaková sada, timing a výchozí nastavení.
- `src/platform/displays.js` — komponenty split-flap, zpoždění, vlaku a času.
- `src/platform/departure-board.js` — katalogové flapy, číslo vlaku a řádková
  odjezdová tabule.
- `src/platform/runtime.js` — registry komponent a obecný `BoardRuntime`.
- `src/platform/analog-clock.js` — adapter analogových hodin.
- `src/platform/night-lighting.js` — noční režim, žárovky a lifecycle timerů.
- `src/platform/lighting-state.js` — stavové nastavení světel bez DOM.
- `src/platform/board-transport.js` — komunikace mezi tabulí a manage stránkou.
- `src/platform/board-identity.js` — identita nástupiště, koleje a sektoru.
- `src/platform/sun-schedule.js` — automatické řízení podle slunce.
- `src/platform/storage.js` — volitelný adapter pro `localStorage`.
- `src/templates/` — datové definice rozložení tabulí.
- `src/demos/` — aplikace, formuláře a PoC-specific orchestrace.
- `src/styles/` — tokeny a kanonické vrstvy design systému.
- `style.css` — jediný stylesheet entry point, který vrstvy importuje.

## Odjezdová tabule

Stránka `departureBoard.html` neobsahuje manage UI. Po otevření se připojí ke
stejnému `BoardTransport` kanálu jako `platformTableManage.html`, načte jeho
uložené odjezdy a reaguje na zprávy `manage:departures`. Odjezdy se zobrazí
v pořadí podle času odjezdu, maximálně v osmi řádcích. Změny jsou řazeny po
celých řádcích a při uvolnění řádku shora mají jednosekundovou pauzu před
posunem.

Pro kolej, sektor a barvu čísla vlaku se používá profil stanice. Výchozí
Brno hlavní nádraží je v `stanice/brno-hlavni-nadrazi.json`. Katalogové
komponenty stejně jako standardní split-flap postupují výhradně dopředným
směrem podle fyzického pořadí karet.

Při vložení stejného `platform/track/sector` do manage se aktualizuje jeden
existující odjezd, takže se aktualizuje i řádek odjezdové tabule místo
vytvoření duplicity.

## Board state

Veřejný stav tabule je serializovatelný a vhodný pro budoucí vzdálené API:

```js
{
    stations: ["PRAHA", "BRATISLAVA"],
    train: "Eurocity",
    delay: 12,
    departureTime: {
        hours: 16,
        minutes: 20
    }
}
```

`delay` je skutečné zpoždění v minutách. Ve výchozím stavu se od zpoždění nic
neodečítá a tabule mapuje na katalog včetně zadané hodnoty. Po zapnutí offsetu
zobrazí katalogovou hodnotu nižší než zadané zpoždění a hodnoty do 5 minut
včetně skryje.

V demonstrační stránce je runtime dostupný jako `window.pragotron`:

```js
window.pragotron.setState({
    stations: ["BRNO", "OSTRAVA"],
    train: "Ex",
    delay: "",
    departureTime: { hours: 18, minutes: 5 }
});

window.pragotron.getState();
```

`setState(state)` spouští skutečnou flip animaci. Pro obnovu bez animace
používá platforma interně `setState(state, { immediate: true })`.

## Identita nástupištní tabule

Zobrazovací stránku lze otevřít s identitou v URL:

```text
platformTable.html?platform=1&track=6a&sector=Jih
```

Identita se ukládá do `sessionStorage`, takže přežije refresh, ale různé
prohlížečové taby se navzájem nepřepisují. Lze ji změnit i z konzole:

```js
window.pragotron.configureIdentity({
    platform: "1",
    track: "6a",
    sector: "Jih"
});
```

Pole `sector` je volitelné. Příkaz z manage stránky s prázdným sektorem
zasáhne všechny tabule stejného nástupiště a koleje; vyplněný sektor zasáhne
jen přesnou shodu.

## Nová šablona tabule

1. V HTML vytvořit sloty s atributem `data-board-slot`.
2. V `src/templates/` definovat seznam slotů, typ komponenty a `statePath`.
3. Zaregistrovat existující typ přes `createDefaultRegistry()` nebo přidat
   vlastní factory přes `ComponentRegistry.register()`.
4. Připojit vlastní controller, který řeší pouze formulář, transport a
   persistence aplikace.

Příklad slotu:

```html
<div data-board-slot="stationOne" class="flap-display"></div>
```

```js
const template = {
    rootSelector: "#my-board",
    slots: [{
        id: "stationOne",
        type: "split-flap",
        selector: '[data-board-slot="stationOne"]',
        statePath: ["stations", 0]
    }]
};
```

## Komponentové standardy

- Komponenta vlastní DOM vykreslení a svůj lifecycle, ne globální aplikaci.
- `set(value)` je animované nastavení; `setImmediate(value)` je synchronní
  nastavení; `isSettled()` slouží controlleru pro čekání na dokončení.
- `destroy()` ruší vlastní timeouty, animation loop a posluchače.
- Komponenty nepřistupují přímo do `localStorage`; persistence patří controlleru
  nebo adapteru.
- Stav používaný pro vzdálené řízení musí být JSON serializovatelný.
- CSS používá tokeny z `tokens.css` a komponentové třídy; nové styly se
  nepřidávají jako další pozdější přepis stejného selektoru.
- Automatický denní/noční režim používá `sunrise-sunset-js` a výchozí lokaci
  Bratislava (`48.1486, 17.1077`, `Europe/Bratislava`).
