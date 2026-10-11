import {
    TRAIN_TYPE_IMAGE_CUSTOM,
    TRAIN_TYPE_IMAGE_FILES,
    trainTypeImageChoice,
    trainTypeImageLabel,
    trainTypeImageSrc,
    trainTypeImageUrl
} from '../platform/data.js';
import {
    createDefaultStationProfile,
    getActiveStationProfile,
    normalizeStationProfile,
    setActiveStationProfile
} from '../platform/station-profile.js';

const lines = (values) => values.join('\n');

const fieldValue = (row, name) =>
    row.querySelector(`[data-field="${name}"]`)?.value || '';

const textInput = (documentRef, value, label, name) => {
    const input = documentRef.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.dataset.field = name;
    input.setAttribute('aria-label', label);
    input.autocomplete = 'off';
    return input;
};

const labeledField = (documentRef, label, control, hint = '', wide = false) => {
    const wrapper = documentRef.createElement('label');
    wrapper.className = wide
        ? 'board-form-field station-profile-wide'
        : 'board-form-field';
    wrapper.append(documentRef.createTextNode(label), control);
    if (hint) {
        const note = documentRef.createElement('small');
        note.textContent = hint;
        wrapper.append(note);
    }
    return wrapper;
};

const actionButton = (documentRef, text) => {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = 'station-profile-button';
    button.textContent = text;
    return button;
};

export const mountStationProfileEditor = ({
    documentRef,
    onApply,
    onSectionExpanded
}) => {
    const nameInput = documentRef.querySelector('#stationProfileName');
    const platformsInput = documentRef.querySelector('#stationProfilePlatforms');
    const tracksInput = documentRef.querySelector('#stationProfileTracks');
    const sectorsInput = documentRef.querySelector('#stationProfileSectors');
    const rangesInput = documentRef.querySelector('#stationProfileSectorRanges');
    const stylesRoot = documentRef.querySelector('#stationProfileNumberStyles');
    const typesRoot = documentRef.querySelector('#stationProfileTrainTypeList');
    const searchInput = documentRef.querySelector('#stationProfileTypeSearch');
    const applyButton = documentRef.querySelector('#stationProfileApply');
    const exportButton = documentRef.querySelector('#stationProfileExport');
    const importButton = documentRef.querySelector('#stationProfileImport');
    const resetButton = documentRef.querySelector('#stationProfileReset');
    const fileInput = documentRef.querySelector('#stationProfileFile');

    if (!nameInput || !stylesRoot || !typesRoot) {
        return;
    }

    const typePainters = new Set();

    const styleChoices = () => [...stylesRoot.querySelectorAll('.station-profile-style')]
        .map((row) => fieldValue(row, 'id').trim())
        .filter(Boolean);

    const fillStyleSelect = (select, selected) => {
        const current = selected || select.value || 'default';
        select.replaceChildren();
        const choices = styleChoices();
        if (!choices.includes('default')) {
            choices.unshift('default');
        }
        choices.forEach((id) => {
            const option = documentRef.createElement('option');
            option.value = id;
            option.textContent = id;
            select.appendChild(option);
        });
        select.value = choices.includes(current) ? current : 'default';
    };

    const refreshOrder = (root) => {
        const searchLocked = root === typesRoot
            && String(searchInput?.value || '').trim() !== '';
        const rows = [...root.children];
        rows.forEach((row, index) => {
            const up = row.querySelector('[data-move="up"]');
            const down = row.querySelector('[data-move="down"]');
            if (!up || !down) {
                return;
            }
            up.disabled = searchLocked || index === 0;
            down.disabled = searchLocked || index === rows.length - 1;
            const lockedTitle = 'Nejdřív zrušte hledání.';
            up.title = searchLocked ? lockedTitle : 'Posunout výš';
            down.title = searchLocked ? lockedTitle : 'Posunout níž';
        });
    };

    const moveRow = (row, direction) => {
        const parent = row.parentElement;
        const sibling = direction < 0
            ? row.previousElementSibling
            : row.nextElementSibling;
        if (!parent || !sibling) {
            return;
        }
        if (direction < 0) {
            parent.insertBefore(row, sibling);
        } else {
            parent.insertBefore(sibling, row);
        }
        refreshOrder(parent);
        if (parent === stylesRoot) {
            refreshTypeStyles();
        }
    };

    const iconButton = (label, src) => {
        const control = actionButton(documentRef, '');
        control.classList.add('station-profile-icon-button');
        control.setAttribute('aria-label', label);
        control.title = label;
        const image = documentRef.createElement('img');
        image.src = src;
        image.alt = '';
        image.width = 16;
        image.height = 16;
        control.append(image);
        return control;
    };

    const orderButtons = (row) => {
        const up = iconButton('Posunout výš', 'images/buttons/MoveItemUp.svg');
        const down = iconButton('Posunout níž', 'images/buttons/MoveItemDown.svg');
        up.dataset.move = 'up';
        down.dataset.move = 'down';
        up.addEventListener('click', () => moveRow(row, -1));
        down.addEventListener('click', () => moveRow(row, 1));
        return [up, down];
    };

    const refreshTypeStyles = (renamed) => {
        typesRoot.querySelectorAll('[data-number-style]').forEach((select) => {
            const next = renamed && select.value === renamed.previous
                ? renamed.next
                : select.value;
            fillStyleSelect(select, next);
        });
        typePainters.forEach((paint) => paint());
    };

    const addStyleRow = (style = {}) => {
        const row = documentRef.createElement('div');
        row.className = 'station-profile-style';
        const id = textInput(documentRef, style.id || '', 'Název barvy', 'id');
        const background = textInput(
            documentRef,
            style.background || '#111111',
            'Pozadí čísla',
            'background'
        );
        const foreground = textInput(
            documentRef,
            style.foreground || '#ffffff',
            'Barva číslic',
            'foreground'
        );
        const swatch = documentRef.createElement('span');
        swatch.className = 'station-profile-swatch';
        swatch.setAttribute('aria-hidden', 'true');
        swatch.textContent = '1234';
        const paint = () => {
            swatch.style.background = background.value;
            swatch.style.color = foreground.value;
        };
        background.addEventListener('input', paint);
        foreground.addEventListener('input', paint);
        paint();

        const remove = iconButton('Odebrat', 'images/buttons/Delete.svg');
        const syncDefault = () => {
            const locked = id.value.trim().toLocaleLowerCase('cs-CZ') === 'default';
            id.readOnly = locked;
            remove.disabled = locked;
            remove.title = locked ? 'Výchozí barva musí zůstat.' : '';
        };
        remove.addEventListener('click', () => {
            row.remove();
            refreshOrder(stylesRoot);
            refreshTypeStyles();
        });
        let lastId = id.value.trim();
        id.addEventListener('input', () => {
            const next = id.value.trim();
            refreshTypeStyles({ previous: lastId, next });
            lastId = next;
            syncDefault();
        });
        syncDefault();

        const fields = documentRef.createElement('div');
        fields.className = 'board-form-grid';
        fields.append(
            labeledField(documentRef, 'Název', id, '', true),
            labeledField(documentRef, 'Pozadí', background),
            labeledField(documentRef, 'Barva číslic', foreground)
        );
        const actions = documentRef.createElement('div');
        actions.className = 'station-profile-row-actions';
        actions.append(...orderButtons(row), remove);
        const side = documentRef.createElement('div');
        side.className = 'station-profile-style-side';
        side.append(swatch, actions);
        row.append(side, fields);
        stylesRoot.appendChild(row);
        refreshOrder(stylesRoot);
        return row;
    };

    const addTypeRow = (type = {}, { open = false } = {}) => {
        const row = documentRef.createElement('article');
        row.className = 'station-profile-type';
        const name = textInput(documentRef, type.name || '', 'Název typu', 'name');
        const label = textInput(documentRef, type.label || '', 'Text v seznamu', 'label');
        const text = textInput(documentRef, type.text || '', 'Text na flapu', 'text');
        const suffix = textInput(documentRef, type.suffix || '', 'Doplněk na flapu', 'suffix');
        const imageChoice = trainTypeImageChoice(type.source);
        const source = documentRef.createElement('select');
        source.dataset.field = 'sourceChoice';
        source.setAttribute('aria-label', 'Obrázek místo textu');
        const blankImage = documentRef.createElement('option');
        blankImage.value = '';
        blankImage.textContent = 'Nepoužít obrázek';
        source.append(blankImage);
        TRAIN_TYPE_IMAGE_FILES.forEach((file) => {
            const option = documentRef.createElement('option');
            option.value = trainTypeImageSrc(file);
            option.textContent = trainTypeImageLabel(file);
            source.append(option);
        });
        const customImage = documentRef.createElement('option');
        customImage.value = TRAIN_TYPE_IMAGE_CUSTOM;
        customImage.textContent = 'Vlastní';
        source.append(customImage);
        source.value = imageChoice.choice;
        const sourceSvg = documentRef.createElement('textarea');
        sourceSvg.dataset.field = 'sourceSvg';
        sourceSvg.value = imageChoice.svg;
        sourceSvg.rows = 5;
        sourceSvg.spellcheck = false;
        sourceSvg.placeholder = '<svg viewBox="0 0 100 40"></svg>';
        sourceSvg.setAttribute('aria-label', 'Vlastní SVG');
        const sourceSvgField = labeledField(
            documentRef,
            'Vlastní SVG',
            sourceSvg,
            'Vložte celou značku <svg>…</svg>.',
            true
        );
        sourceSvgField.classList.add('station-profile-svg-field');
        const syncCustomSvgField = () => {
            const custom = source.value === TRAIN_TYPE_IMAGE_CUSTOM;
            sourceSvgField.hidden = !custom;
            sourceSvgField.classList.toggle('is-visible', custom);
        };
        syncCustomSvgField();
        const currentImageSource = () => (
            source.value === TRAIN_TYPE_IMAGE_CUSTOM
                ? sourceSvg.value
                : source.value
        );
        const background = textInput(
            documentRef,
            type.background || 'var(--flap-background)',
            'Pozadí flapu',
            'background'
        );
        const foreground = textInput(
            documentRef,
            type.foreground || 'var(--flap-foreground)',
            'Barva písma',
            'foreground'
        );
        const aliases = textInput(
            documentRef,
            (type.aliases || []).join(', '),
            'Zkratky',
            'aliases'
        );
        const numberStyle = documentRef.createElement('select');
        numberStyle.dataset.numberStyle = 'true';
        numberStyle.setAttribute('aria-label', 'Barva čísla vlaku');
        fillStyleSelect(numberStyle, type.numberStyle || 'default');

        const flap = documentRef.createElement('span');
        flap.className = 'station-profile-flap';
        flap.setAttribute('aria-hidden', 'true');
        const title = documentRef.createElement('strong');
        const meta = documentRef.createElement('span');
        const paint = () => {
            const imageUrl = trainTypeImageUrl(currentImageSource());
            flap.style.background = background.value;
            flap.style.color = foreground.value;
            flap.replaceChildren();
            if (imageUrl) {
                const image = documentRef.createElement('img');
                image.alt = '';
                image.src = imageUrl;
                flap.append(image);
            } else {
                flap.append(documentRef.createTextNode(text.value.trim() || '—'));
                if (suffix.value.trim()) {
                    const extra = documentRef.createElement('small');
                    extra.textContent = suffix.value.trim();
                    flap.append(extra);
                }
            }
            title.textContent = name.value.trim() || 'Nový typ';
            const styleLabel = numberStyle.selectedOptions[0]?.textContent || 'Výchozí';
            const aliasText = aliases.value.trim();
            meta.textContent = [
                imageUrl
                    ? 'obrázek'
                    : (text.value.trim() ? `flap ${text.value.trim()}` : 'prázdný flap'),
                `číslo ${styleLabel}`,
                aliasText ? `zkratky ${aliasText}` : ''
            ].filter(Boolean).join(' · ');
        };
        typePainters.add(paint);
        [name, label, text, suffix, background, foreground, aliases, sourceSvg]
            .forEach((input) => input.addEventListener('input', paint));
        source.addEventListener('change', () => {
            syncCustomSvgField();
            paint();
        });
        numberStyle.addEventListener('change', paint);

        const body = documentRef.createElement('div');
        body.className = 'station-profile-type-body board-form-grid';
        body.append(
            labeledField(documentRef, 'Název', name, 'Hodnota uložená u odjezdu.'),
            labeledField(
                documentRef,
                'Text v seznamu',
                label,
                'Když je prázdný, použije se název.'
            ),
            labeledField(documentRef, 'Text na flapu', text),
            labeledField(documentRef, 'Doplněk na flapu', suffix, 'Třeba lôžk. za Ex.'),
            labeledField(
                documentRef,
                'Obrázek místo textu',
                source,
                'Prázdná volba nechá na flapu text. Obrázek má přednost.',
                true
            ),
            sourceSvgField,
            labeledField(documentRef, 'Pozadí flapu', background),
            labeledField(documentRef, 'Barva písma', foreground),
            labeledField(documentRef, 'Barva čísla vlaku', numberStyle),
            labeledField(
                documentRef,
                'Zkratky z tabule SŽ',
                aliases,
                'Oddělte čárkou. Třeba IC, ic.',
                true
            )
        );

        const toggle = iconButton(
            open ? 'Skrýt' : 'Upravit',
            'images/buttons/Edit.svg'
        );
        const setOpen = (next) => {
            row.classList.toggle('is-open', next);
            const label = next ? 'Skrýt' : 'Upravit';
            toggle.setAttribute('aria-label', label);
            toggle.title = label;
            toggle.setAttribute('aria-expanded', String(next));
        };
        setOpen(open);
        toggle.addEventListener('click', () => setOpen(!row.classList.contains('is-open')));

        const remove = iconButton('Odebrat', 'images/buttons/Delete.svg');
        remove.addEventListener('click', () => {
            typePainters.delete(paint);
            row.remove();
            filterTypes();
        });

        const identity = documentRef.createElement('div');
        identity.className = 'station-profile-type-identity';
        identity.append(title, meta);
        const actions = documentRef.createElement('div');
        actions.className = 'station-profile-row-actions';
        actions.append(...orderButtons(row), toggle, remove);
        const summary = documentRef.createElement('div');
        summary.className = 'station-profile-type-summary';
        summary.append(flap, identity, actions);
        summary.addEventListener('click', (event) => {
            if (event.target.closest('button')) {
                return;
            }
            setOpen(!row.classList.contains('is-open'));
        });
        row.append(summary, body);
        typesRoot.appendChild(row);
        refreshOrder(typesRoot);
        paint();
        return row;
    };

    const filterTypes = () => {
        const query = String(searchInput?.value || '')
            .trim()
            .toLocaleLowerCase('cs-CZ');
        typesRoot.querySelectorAll('.station-profile-type').forEach((row) => {
            const haystack = [...row.querySelectorAll('input, select, textarea')]
                .map((control) => [
                    control.value,
                    control.selectedOptions?.[0]?.textContent || ''
                ].join(' '))
                .join(' ')
                .toLocaleLowerCase('cs-CZ');
            row.classList.toggle('is-filtered', Boolean(query) && !haystack.includes(query));
        });
        refreshOrder(typesRoot);
    };

    const readStyles = () => [...stylesRoot.querySelectorAll('.station-profile-style')]
        .map((row) => ({
            id: fieldValue(row, 'id'),
            background: fieldValue(row, 'background'),
            foreground: fieldValue(row, 'foreground')
        }));

    const readTypes = () => [...typesRoot.querySelectorAll('.station-profile-type')]
        .map((row) => ({
            name: fieldValue(row, 'name'),
            label: fieldValue(row, 'label'),
            text: fieldValue(row, 'text'),
            suffix: fieldValue(row, 'suffix'),
            source: fieldValue(row, 'sourceChoice') === TRAIN_TYPE_IMAGE_CUSTOM
                ? fieldValue(row, 'sourceSvg')
                : fieldValue(row, 'sourceChoice'),
            background: fieldValue(row, 'background'),
            foreground: fieldValue(row, 'foreground'),
            numberStyle: row.querySelector('[data-number-style]')?.value || 'default',
            aliases: fieldValue(row, 'aliases')
        }));

    const read = () => normalizeStationProfile({
        name: nameInput.value,
        platforms: platformsInput.value,
        tracks: tracksInput.value,
        sectors: sectorsInput.value,
        sectorRanges: rangesInput.value,
        numberStyles: readStyles(),
        trainTypes: readTypes()
    });

    const fill = (profile) => {
        const next = profile || getActiveStationProfile();
        nameInput.value = next.name;
        platformsInput.value = lines(next.platforms);
        tracksInput.value = lines(next.tracks);
        sectorsInput.value = lines(next.sectors);
        rangesInput.value = lines(next.sectorRanges);
        typePainters.clear();
        stylesRoot.replaceChildren();
        typesRoot.replaceChildren();
        next.numberStyles.forEach((style) => addStyleRow(style));
        next.trainTypes
            .filter((type) => type.name)
            .forEach((type) => addTypeRow(type));
        if (searchInput) {
            searchInput.value = '';
        }
        filterTypes();
    };

    const apply = () => {
        const profile = read();
        if (!profile) {
            onApply?.(null);
            return null;
        }
        setActiveStationProfile(profile);
        fill(getActiveStationProfile());
        onApply?.(getActiveStationProfile());
        return getActiveStationProfile();
    };

    const expandSection = (element) => {
        const section = element?.closest('.station-profile-section');
        if (!section) {
            return;
        }
        section.classList.remove('is-collapsed');
        section.querySelector('.manage-block-toggle')
            ?.setAttribute('aria-expanded', 'true');
        onSectionExpanded?.(section);
    };

    documentRef.querySelector('#stationProfileAddStyle')
        ?.addEventListener('click', () => {
            expandSection(stylesRoot);
            const row = addStyleRow({
                id: '',
                background: '#111111',
                foreground: '#ffffff'
            });
            row.querySelector('[data-field="id"]')?.focus();
        });
    documentRef.querySelector('#stationProfileAddType')
        ?.addEventListener('click', () => {
            expandSection(typesRoot);
            if (searchInput) {
                searchInput.value = '';
                filterTypes();
            }
            const row = addTypeRow({}, { open: true });
            row.querySelector('[data-field="name"]')?.focus();
            row.scrollIntoView({ block: 'nearest' });
        });
    searchInput?.addEventListener('input', filterTypes);
    applyButton?.addEventListener('click', apply);
    exportButton?.addEventListener('click', () => {
        const profile = apply();
        if (!profile) {
            return;
        }
        const blob = new Blob(
            [JSON.stringify(profile, null, 2)],
            { type: 'application/json' }
        );
        const link = documentRef.createElement('a');
        const slug = profile.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('cs-CZ')
            .replace(/[^a-z0-9]+/gi, '-')
            .replace(/^-|-$/g, '')
            || 'profil-stanice';
        link.href = URL.createObjectURL(blob);
        link.download = `${slug}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    importButton?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            try {
                const profile = normalizeStationProfile(JSON.parse(String(reader.result || '')));
                if (!profile) {
                    onApply?.(null);
                    return;
                }
                fill(profile);
                apply();
            } catch {
                onApply?.(null);
            }
        });
        reader.readAsText(file);
    });
    resetButton?.addEventListener('click', () => {
        if (!window.confirm(
            'Obnovit výchozí profil Brno hlavní nádraží? Rozpracované úpravy se nahradí.'
        )) {
            return;
        }
        fill(createDefaultStationProfile());
        apply();
    });

    fill(getActiveStationProfile());
};
