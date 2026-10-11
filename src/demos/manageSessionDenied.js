import {
    DEPARTURE_BOARD_ROW_COUNT_DEFAULT,
    DEPARTURE_BOARD_ROW_COUNT_MAX,
    DEPARTURE_BOARD_ROW_COUNT_MIN
} from '../platform/data.js';
import { LENS_COLORS } from '../platform/lenses.js';
import {
    createDefaultStationProfile,
    profileSectorValues,
    readStoredStationProfile
} from '../platform/station-profile.js';

const PARAM_ORDER = [
    'platform',
    'track',
    'sector',
    'rows',
    'volume',
    'lenses'
];

const numberOptions = (min, max) => {
    const options = [];
    for (let value = min; value <= max; value += 1) {
        options.push({
            value: String(value),
            label: String(value)
        });
    }
    return options;
};

const lensOptions = () => Object.entries(LENS_COLORS).map(([value, color]) => ({
    value,
    label: color.label
}));

const loadCatalog = () => {
    const profile = readStoredStationProfile() || createDefaultStationProfile();
    const sectors = profileSectorValues(profile);
    const lenses = lensOptions();
    const definitions = {
        platform: {
            label: 'Nástupiště',
            boards: ['platform'],
            options: profile.platforms.map((value) => ({ value, label: value })),
            fallback: profile.platforms[0] || ''
        },
        track: {
            label: 'Kolej',
            boards: ['platform'],
            options: profile.tracks.map((value) => ({ value, label: value })),
            fallback: profile.tracks[0] || ''
        },
        sector: {
            label: 'Sektor',
            boards: ['platform'],
            options: sectors.map((value) => ({ value, label: value })),
            fallback: sectors[0] || ''
        },
        rows: {
            label: 'Počet řádků',
            boards: ['departure'],
            options: numberOptions(
                DEPARTURE_BOARD_ROW_COUNT_MIN,
                DEPARTURE_BOARD_ROW_COUNT_MAX
            ),
            fallback: String(DEPARTURE_BOARD_ROW_COUNT_DEFAULT)
        },
        volume: {
            label: 'Hlasitost',
            boards: ['departure', 'platform'],
            options: numberOptions(0, 100).map((option) => ({
                value: option.value,
                label: `${option.value} %`
            })),
            fallback: '100'
        },
        lenses: {
            label: 'Barva čoček',
            boards: ['departure', 'platform'],
            lenses: true,
            options: lenses,
            fallback: lenses[0]?.value || 'green'
        }
    };

    return Object.fromEntries(
        Object.entries(definitions).filter(([, definition]) =>
            definition.lenses || definition.options.length > 0)
    );
};

const appendOptions = (select, options, selected) => {
    options.forEach((option) => {
        const node = document.createElement('option');
        node.value = option.value;
        node.textContent = option.label;
        node.selected = option.value === selected;
        select.append(node);
    });
};

const createSelect = (options, selected, label) => {
    const select = document.createElement('select');
    select.setAttribute('aria-label', label);
    appendOptions(select, options, selected);
    return select;
};

export const mountManageSessionDenied = (documentRef = document) => {
    const guide = documentRef.querySelector('#manageSessionGuide');
    if (!guide || guide.dataset.ready === 'true') {
        return;
    }
    guide.dataset.ready = 'true';

    const catalog = loadCatalog();
    const selected = new Map();
    let kind = 'departure';

    const pageName = () => (
        kind === 'platform' ? 'platformTable.html' : 'departureBoard.html'
    );

    const availableKeys = () => PARAM_ORDER.filter((key) => {
        const definition = catalog[key];
        return definition
            && definition.boards.includes(kind)
            && !selected.has(key);
    });

    const currentHref = () => {
        const url = new URL(pageName(), documentRef.location?.href || window.location.href);
        url.search = '';
        PARAM_ORDER.forEach((key) => {
            if (!selected.has(key)) {
                return;
            }
            const value = selected.get(key);
            if (value) {
                url.searchParams.set(key, value);
            }
        });
        return url.href;
    };

    guide.replaceChildren();

    const intro = document.createElement('p');
    intro.className = 'manage-session-guide-intro';
    intro.textContent = 'Odtud jde otevřít odjezdovou nebo nástupištní tabuli. Parametr přidáte ze seznamu a hodnotu vyberete z možností, které tabule bere.';
    guide.append(intro);

    const choiceHeading = document.createElement('h2');
    choiceHeading.textContent = '1. Která tabule';
    const choices = document.createElement('div');
    choices.className = 'manage-session-choices';
    choices.setAttribute('role', 'radiogroup');
    choices.setAttribute('aria-label', 'Která tabule');

    const addChoice = (value, label, preview) => {
        const choice = document.createElement('label');
        const previewImage = document.createElement('img');
        previewImage.src = preview;
        previewImage.alt = '';
        const caption = document.createElement('span');
        caption.className = 'manage-session-choice-caption';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'manageSessionBoard';
        input.value = value;
        input.checked = value === kind;
        const text = document.createElement('span');
        text.textContent = label;
        input.addEventListener('change', () => {
            if (!input.checked) {
                return;
            }
            kind = value;
            [...selected.keys()].forEach((key) => {
                const definition = catalog[key];
                if (!definition?.boards.includes(kind)) {
                    selected.delete(key);
                }
            });
            renderParams();
            renderLink();
        });
        caption.append(input, text);
        choice.append(previewImage, caption);
        choices.append(choice);
    };
    addChoice(
        'departure',
        'Odjezdová tabule',
        'images/misc/preview-departureBoard.png'
    );
    addChoice(
        'platform',
        'Nástupištní tabule',
        'images/misc/preview-platformTable.png'
    );

    const paramHeading = document.createElement('h2');
    paramHeading.textContent = '2. Parametry adresy';
    const paramList = document.createElement('div');
    paramList.className = 'manage-session-params';
    const hint = document.createElement('p');
    hint.className = 'manage-session-hint';
    const addRow = document.createElement('div');
    addRow.className = 'manage-session-add';
    const addSelect = document.createElement('select');
    addSelect.setAttribute('aria-label', 'Parametr k přidání');
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = 'Přidat';
    addRow.append(addSelect, addButton);

    const linkHeading = document.createElement('h2');
    linkHeading.textContent = '3. Odkaz';
    const linkRow = document.createElement('div');
    linkRow.className = 'manage-session-link';
    const linkField = document.createElement('input');
    linkField.type = 'text';
    linkField.readOnly = true;
    linkField.setAttribute('aria-label', 'Odkaz na tabuli');
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Kopírovat odkaz';
    const openLink = document.createElement('a');
    openLink.className = 'manage-session-open';
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.textContent = 'Otevřít tabuli';
    linkRow.append(linkField, copyButton, openLink);

    guide.append(
        choiceHeading,
        choices,
        paramHeading,
        paramList,
        hint,
        addRow,
        linkHeading,
        linkRow
    );

    const renderAddSelect = () => {
        const keys = availableKeys();
        addSelect.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = keys.length
            ? 'Vyberte parametr…'
            : 'Všechny parametry jsou přidané';
        addSelect.append(placeholder);
        keys.forEach((key) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = catalog[key].label;
            addSelect.append(option);
        });
        addSelect.disabled = keys.length === 0;
        addButton.disabled = keys.length === 0 || addSelect.value === '';
    };

    const renderParams = () => {
        paramList.replaceChildren();
        const keys = PARAM_ORDER.filter((key) => selected.has(key));
        if (keys.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'manage-session-empty';
            empty.textContent = 'Zatím bez parametrů. Odkaz otevře tabuli ve výchozím stavu.';
            paramList.append(empty);
        }

        keys.forEach((key) => {
            const definition = catalog[key];
            const row = document.createElement('div');
            row.className = 'manage-session-param';
            const label = document.createElement('span');
            label.textContent = definition.label;

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.textContent = 'Odebrat';
            remove.addEventListener('click', () => {
                selected.delete(key);
                renderParams();
                renderLink();
            });

            if (definition.lenses) {
                const fields = document.createElement('div');
                fields.className = 'manage-session-lens-fields';
                const current = String(selected.get(key) || definition.fallback);
                const [first, second] = current.split(',');
                const firstSelect = createSelect(
                    definition.options,
                    definition.options.some((option) => option.value === first)
                        ? first
                        : definition.fallback,
                    'První čočka'
                );
                const secondOptions = [
                    { value: '', label: 'Stejná jako první' },
                    ...definition.options
                ];
                const secondSelect = createSelect(
                    secondOptions,
                    second && second !== first ? second : '',
                    'Druhá čočka'
                );
                const writeLenses = () => {
                    const primary = firstSelect.value || definition.fallback;
                    const extra = secondSelect.value;
                    selected.set(
                        key,
                        extra && extra !== primary ? `${primary},${extra}` : primary
                    );
                    renderLink();
                };
                firstSelect.addEventListener('change', writeLenses);
                secondSelect.addEventListener('change', writeLenses);
                fields.append(firstSelect, secondSelect);
                row.append(label, fields, remove);
            } else {
                const select = createSelect(
                    definition.options,
                    selected.get(key),
                    definition.label
                );
                select.addEventListener('change', () => {
                    selected.set(key, select.value);
                    renderLink();
                });
                row.append(label, select, remove);
            }
            paramList.append(row);
        });

        const missingIdentity = kind === 'platform'
            && (!selected.has('platform') || !selected.has('track'));
        hint.hidden = !missingIdentity;
        hint.textContent = missingIdentity
            ? 'Bez nástupiště a koleje se nástupištní tabule k odjezdům nepřipojí.'
            : '';
        renderAddSelect();
    };

    const renderLink = () => {
        const href = currentHref();
        linkField.value = href;
        openLink.href = href;
        openLink.textContent = kind === 'platform'
            ? 'Otevřít nástupištní tabuli'
            : 'Otevřít odjezdovou tabuli';
    };

    addSelect.addEventListener('change', () => {
        addButton.disabled = !addSelect.value;
    });
    addButton.addEventListener('click', () => {
        const key = addSelect.value;
        const definition = catalog[key];
        if (!definition || selected.has(key)) {
            return;
        }
        const fallback = definition.options.some((option) =>
            option.value === definition.fallback)
            ? definition.fallback
            : (definition.options[0]?.value || definition.fallback);
        selected.set(key, fallback);
        addSelect.value = '';
        renderParams();
        renderLink();
    });
    let copyFeedbackTimer = 0;
    const copyText = (text) => {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('aria-hidden', 'true');
        field.style.position = 'fixed';
        field.style.top = '0';
        field.style.left = '0';
        field.style.opacity = '0';
        document.body.append(field);
        field.focus();
        field.select();
        field.setSelectionRange(0, field.value.length);
        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch {
            copied = false;
        }
        field.remove();
        return copied;
    };
    copyButton.addEventListener('click', () => {
        const copied = copyText(linkField.value);
        copyButton.textContent = copied
            ? 'Zkopírováno'
            : 'Nepodařilo se zkopírovat';
        window.clearTimeout(copyFeedbackTimer);
        copyFeedbackTimer = window.setTimeout(() => {
            copyButton.textContent = 'Kopírovat odkaz';
        }, 1600);
    });

    renderParams();
    renderLink();
};
