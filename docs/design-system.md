# Pragotron platforma a design systém

Podrobný návod k použití všech komponent, katalogů, runtime, šablon a
nočního režimu je v dokumentu
[`framework-usage.md`](./framework-usage.md).

Projekt obsahuje znovupoužitelné komponenty pro retro split-flap tabule.
`platformTable.html` je demonstrační implementace platformní tabule, nikoli
zdroj komponent samotných.

## Spuštění

Primární runtime používá ES modules, proto je doporučené spouštět PoC přes
HTTP origin:

```text
python -m http.server 8000
```

Potom otevřít `http://localhost:8000/platformTable.html`.

Při přímém otevření přes `file://` použije `platformTableLoader.js` lokální
kompatibilní bundle, takže funguje i bez ručního spouštění serveru.

## Vrstevnice projektu

- `src/platform/data.js` — katalogy, znaková sada, timing a výchozí nastavení.
- `src/platform/displays.js` — komponenty split-flap, zpoždění, vlaku a času.
- `src/platform/runtime.js` — registry komponent a obecný `BoardRuntime`.
- `src/platform/analog-clock.js` — adapter analogových hodin.
- `src/platform/night-lighting.js` — noční režim, žárovky a lifecycle timerů.
- `src/platform/storage.js` — volitelný adapter pro `localStorage`.
- `src/templates/` — datové definice rozložení tabulí.
- `src/demos/` — aplikace, formuláře a PoC-specific orchestrace.
- `src/styles/` — tokeny a kanonické vrstvy design systému.
- `style.css` — jediný stylesheet entry point, který vrstvy importuje.

## Board state

Veřejný stav tabule je serializovatelný a vhodný pro budoucí vzdálené API:

```js
{
    stations: ["PRAHA", "BRATISLAVA"],
    train: "Eurocity",
    delay: "5",
    departureTime: {
        hours: 16,
        minutes: 20
    }
}
```

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
