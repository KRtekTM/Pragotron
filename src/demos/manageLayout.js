const LAYOUT_STORAGE_KEY = 'pragotron.manage.layout.v1';
const MIN_WEIGHT = 12;
const MAX_COLUMNS = 4;
const BLOCK_ORDER = [
    'stationProfilePanel',
    'boardForm',
    'liveDeparturesPanel',
    'departureBoardLogoPanel',
    'departureDelayOffsetPanel',
    'departuresPanel',
    'activeBoardsPanel',
    'logPanel'
];

const DEFAULT_MANAGE_LAYOUT = {
    columns: [
        {
            weight: 40,
            blocks: [
                'stationProfilePanel',
                'boardForm',
                'liveDeparturesPanel',
                'departureBoardLogoPanel',
                'departureDelayOffsetPanel'
            ]
        },
        {
            weight: 60,
            blocks: [
                'departuresPanel',
                'activeBoardsPanel',
                'logPanel'
            ]
        }
    ]
};

const COLUMN_COUNT_LABELS = [
    'Jeden sloupec',
    'Dva sloupce',
    'Tři sloupce',
    'Čtyři sloupce'
];

export const balanceLayoutWeights = (weights) => {
    const count = weights.length;
    if (count === 0) {
        return [];
    }
    if (MIN_WEIGHT * count >= 100) {
        const base = Math.floor(100 / count);
        const next = Array(count).fill(base);
        next[count - 1] += 100 - (base * count);
        return next;
    }

    let raw = weights.map((weight) => {
        const value = Number(weight);
        return Number.isFinite(value) && value > 0 ? value : 0;
    });
    let sum = raw.reduce((total, weight) => total + weight, 0);
    if (sum <= 0) {
        raw = Array(count).fill(1);
        sum = count;
    }

    const next = raw.map((weight) => Math.max(
        MIN_WEIGHT,
        Math.round((weight / sum) * 100)
    ));
    let total = next.reduce((acc, weight) => acc + weight, 0);
    let guard = 0;
    while (total !== 100 && guard < 300) {
        guard += 1;
        if (total > 100) {
            let index = -1;
            next.forEach((weight, position) => {
                if (weight <= MIN_WEIGHT) {
                    return;
                }
                if (index === -1 || weight > next[index]) {
                    index = position;
                }
            });
            if (index === -1) {
                break;
            }
            next[index] -= 1;
            total -= 1;
        } else {
            let index = 0;
            next.forEach((weight, position) => {
                if (weight < next[index]) {
                    index = position;
                }
            });
            next[index] += 1;
            total += 1;
        }
    }
    return next;
};

export const normalizeManageLayout = (input, knownIds) => {
    const known = [...knownIds];
    const fallback = DEFAULT_MANAGE_LAYOUT.columns.map((column) => ({
        weight: column.weight,
        blocks: [...column.blocks]
    }));
    const source = Array.isArray(input?.columns) && input.columns.length > 0
        ? input.columns.slice(0, MAX_COLUMNS)
        : fallback;
    const columns = source.map((column) => ({
        weight: Number(column?.weight),
        blocks: []
    }));
    const seen = new Set();
    source.forEach((column, index) => {
        const blocks = Array.isArray(column?.blocks) ? column.blocks : [];
        blocks.forEach((id) => {
            if (typeof id !== 'string' || !known.includes(id) || seen.has(id)) {
                return;
            }
            seen.add(id);
            columns[index].blocks.push(id);
        });
    });
    known.forEach((id) => {
        if (!seen.has(id)) {
            columns[0].blocks.push(id);
        }
    });
    const weights = balanceLayoutWeights(columns.map((column) => column.weight));
    columns.forEach((column, index) => {
        column.weight = weights[index];
    });
    return { columns };
};

const readStoredLayout = () => {
    try {
        const parsed = JSON.parse(
            window.localStorage.getItem(LAYOUT_STORAGE_KEY) || ''
        );
        if (!parsed || !Array.isArray(parsed.columns) || parsed.columns.length === 0) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

export const mountManageLayout = (documentRef) => {
    const root = documentRef.querySelector('#manage');
    if (!root || root.dataset.layoutReady === 'true') {
        documentRef.documentElement.classList.remove('manage-layout-pending');
        return;
    }
    root.dataset.layoutReady = 'true';

    const layoutButton = documentRef.querySelector('#manageLayoutButton');
    const layoutBar = documentRef.querySelector('#manageLayoutBar');
    const countHost = documentRef.querySelector('.manage-layout-count');
    const splitHost = documentRef.querySelector('#manageLayoutSplit');
    const resetButton = documentRef.querySelector('#manageLayoutReset');
    const doneButton = documentRef.querySelector('#manageLayoutDone');
    let editing = false;

    const knownIds = () => {
        const present = new Set(
            [...root.querySelectorAll('[data-layout-block]')]
                .map((block) => block.id)
                .filter(Boolean)
        );
        const ordered = BLOCK_ORDER.filter((id) => present.has(id));
        present.forEach((id) => {
            if (!BLOCK_ORDER.includes(id)) {
                ordered.push(id);
            }
        });
        return ordered;
    };

    const columnNodes = () => [
        ...root.querySelectorAll(':scope > .manage-layout-column')
    ];

    const paintWeights = (columns) => {
        const nodes = columnNodes();
        columns.forEach((column, index) => {
            if (nodes[index]) {
                nodes[index].dataset.layoutWeight = String(column.weight);
            }
        });
        root.style.setProperty(
            '--manage-columns',
            columns.map((column) => `minmax(0, ${column.weight}fr)`).join(' ')
        );
    };

    const syncLabels = (layout) => {
        if (!editing) {
            return;
        }
        columnNodes().forEach((column, index) => {
            let label = column.querySelector(':scope > .manage-layout-column-label');
            if (!label) {
                label = documentRef.createElement('div');
                label.className = 'manage-layout-column-label';
                column.prepend(label);
            }
            const weight = layout.columns[index]?.weight
                ?? column.dataset.layoutWeight;
            label.textContent = `Sloupec ${index + 1} · ${weight} %`;
        });
    };

    const syncCountPressed = (count) => {
        countHost?.querySelectorAll('button').forEach((button) => {
            button.setAttribute(
                'aria-pressed',
                String(Number(button.dataset.columnCount) === count)
            );
        });
    };

    const readDomLayout = () => normalizeManageLayout({
        columns: columnNodes().map((column) => ({
            weight: Number(column.dataset.layoutWeight),
            blocks: [...column.querySelectorAll(':scope > [data-layout-block]')]
                .map((block) => block.id)
        }))
    }, knownIds());

    const saveLayout = (layout) => {
        try {
            window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({
                columns: layout.columns.map((column) => ({
                    weight: column.weight,
                    blocks: [...column.blocks]
                }))
            }));
        } catch {
            // The arrangement still stays for this page view.
        }
    };

    const paintStructure = (layout) => {
        const nodes = columnNodes();
        while (nodes.length < layout.columns.length) {
            const column = documentRef.createElement('div');
            column.className = 'manage-layout-column';
            column.dataset.layoutColumn = '';
            root.append(column);
            nodes.push(column);
        }
        while (nodes.length > layout.columns.length) {
            const extra = nodes.pop();
            const keep = nodes[nodes.length - 1];
            [...extra.querySelectorAll(':scope > [data-layout-block]')]
                .forEach((block) => keep.append(block));
            extra.remove();
        }
        layout.columns.forEach((column, index) => {
            const node = nodes[index];
            node.dataset.layoutWeight = String(column.weight);
            column.blocks.forEach((id) => {
                const block = documentRef.getElementById(id);
                if (block) {
                    node.append(block);
                }
            });
        });
        paintWeights(layout.columns);
        syncLabels(layout);
    };

    const renderSplit = () => {
        if (!splitHost) {
            return;
        }
        const layout = readDomLayout();
        splitHost.replaceChildren();
        layout.columns.forEach((column, index) => {
            const part = documentRef.createElement('span');
            part.className = 'manage-layout-split-part';
            part.style.flex = `${column.weight} 1 0`;
            part.textContent = `${column.weight} %`;
            splitHost.append(part);
            if (index >= layout.columns.length - 1) {
                return;
            }
            const splitter = documentRef.createElement('button');
            splitter.type = 'button';
            splitter.className = 'manage-layout-splitter';
            splitter.dataset.splitBoundary = String(index);
            splitter.setAttribute(
                'aria-label',
                `Posunout hranici mezi sloupcem ${index + 1} a ${index + 2}`
            );
            splitter.setAttribute('role', 'separator');
            splitter.setAttribute('aria-orientation', 'vertical');
            splitter.setAttribute('aria-valuemin', String(MIN_WEIGHT));
            splitter.setAttribute(
                'aria-valuemax',
                String(column.weight + layout.columns[index + 1].weight - MIN_WEIGHT)
            );
            splitter.setAttribute('aria-valuenow', String(column.weight));
            splitHost.append(splitter);
        });
        syncLabels(layout);
        syncCountPressed(layout.columns.length);
    };

    const updateSplitVisual = (columns) => {
        if (!splitHost) {
            return;
        }
        const parts = [...splitHost.querySelectorAll('.manage-layout-split-part')];
        if (parts.length !== columns.length) {
            renderSplit();
            return;
        }
        columns.forEach((column, index) => {
            parts[index].style.flex = `${column.weight} 1 0`;
            parts[index].textContent = `${column.weight} %`;
        });
        [...splitHost.querySelectorAll('.manage-layout-splitter')]
            .forEach((splitter, index) => {
                const pair = columns[index].weight + columns[index + 1].weight;
                splitter.setAttribute('aria-valuemax', String(pair - MIN_WEIGHT));
                splitter.setAttribute('aria-valuenow', String(columns[index].weight));
            });
        syncLabels({ columns });
        syncCountPressed(columns.length);
    };

    const setColumnCount = (count) => {
        const nextCount = Math.min(MAX_COLUMNS, Math.max(1, count));
        const current = readDomLayout();
        if (nextCount === current.columns.length) {
            return;
        }
        if (nextCount > current.columns.length) {
            const added = nextCount - current.columns.length;
            const share = Math.max(MIN_WEIGHT, Math.round(100 / nextCount));
            const rest = 100 - (share * added);
            const oldSum = current.columns.reduce(
                (total, column) => total + column.weight,
                0
            ) || 1;
            current.columns.forEach((column) => {
                column.weight = (column.weight / oldSum) * rest;
            });
            for (let index = 0; index < added; index += 1) {
                current.columns.push({ weight: share, blocks: [] });
            }
        } else {
            const removed = current.columns.splice(nextCount);
            const target = current.columns[current.columns.length - 1];
            removed.forEach((column) => {
                target.blocks.push(...column.blocks);
            });
        }
        const layout = normalizeManageLayout(current, knownIds());
        paintStructure(layout);
        saveLayout(layout);
        if (editing) {
            renderSplit();
        }
    };

    const resetLayout = () => {
        const layout = normalizeManageLayout(DEFAULT_MANAGE_LAYOUT, knownIds());
        paintStructure(layout);
        saveLayout(layout);
        if (editing) {
            renderSplit();
        }
    };

    const installHandles = () => {
        root.querySelectorAll('[data-layout-block]').forEach((block) => {
            if (block.querySelector('.manage-layout-handle')) {
                return;
            }
            const heading = block.id === 'boardForm'
                ? block.querySelector('#departureEditorPanel > div')
                : block.querySelector(':scope > div');
            const title = block.querySelector('legend')?.textContent?.trim() || 'blok';
            const handle = documentRef.createElement('button');
            handle.type = 'button';
            handle.className = 'manage-layout-handle';
            handle.dataset.layoutHandle = '';
            handle.setAttribute('aria-label', `Přesunout blok ${title}`);
            handle.title = 'Táhněte myší nebo použijte šipky';
            const grip = documentRef.createElement('span');
            grip.className = 'manage-layout-grip';
            grip.setAttribute('aria-hidden', 'true');
            handle.append(grip);
            (heading || block).prepend(handle);
        });
    };

    const clearDropTargets = () => {
        columnNodes().forEach((column) => {
            column.classList.remove('is-drop-target');
        });
    };

    const columnAt = (x, y) => {
        const columns = columnNodes();
        const direct = columns.find((column) => {
            const rect = column.getBoundingClientRect();
            return x >= rect.left && x <= rect.right
                && y >= rect.top && y <= rect.bottom;
        });
        if (direct) {
            return direct;
        }
        let best = columns[0] || null;
        let bestDistance = Infinity;
        columns.forEach((column) => {
            const rect = column.getBoundingClientRect();
            const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
            const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
            const distance = (dx * dx) + (dy * dy);
            if (distance < bestDistance) {
                best = column;
                bestDistance = distance;
            }
        });
        return best;
    };

    const placeBlock = (block, column, clientY) => {
        const siblings = [...column.querySelectorAll(':scope > [data-layout-block]')]
            .filter((item) => item !== block);
        let before = null;
        siblings.some((sibling) => {
            const rect = sibling.getBoundingClientRect();
            if (clientY < rect.top + (rect.height / 2)) {
                before = sibling;
                return true;
            }
            return false;
        });
        if (before) {
            if (block.parentElement === column && block.nextElementSibling === before) {
                return;
            }
            column.insertBefore(block, before);
            return;
        }
        if (block.parentElement === column && column.lastElementChild === block) {
            return;
        }
        column.append(block);
    };

    const scrollWithPointer = (clientY) => {
        const edge = 72;
        if (clientY < edge) {
            window.scrollBy(0, -Math.ceil((edge - clientY) / 3));
        } else if (clientY > window.innerHeight - edge) {
            window.scrollBy(0, Math.ceil((clientY - (window.innerHeight - edge)) / 3));
        }
    };

    let drag = null;
    let dragCleanup = null;

    const endBlockDrag = () => {
        dragCleanup?.();
        dragCleanup = null;
        if (!drag) {
            return;
        }
        drag.block.classList.remove('is-layout-dragging');
        root.classList.remove('is-layout-dragging');
        clearDropTargets();
        drag = null;
        saveLayout(readDomLayout());
    };

    const onHandlePointerDown = (event) => {
        const handle = event.target.closest?.('[data-layout-handle]');
        if (!editing || !handle || event.button !== 0 || drag) {
            return;
        }
        const block = handle.closest('[data-layout-block]');
        if (!block) {
            return;
        }
        event.preventDefault();
        handle.focus({ preventScroll: true });
        handle.setPointerCapture(event.pointerId);
        block.classList.add('is-layout-dragging');
        root.classList.add('is-layout-dragging');
        drag = { pointerId: event.pointerId, block, handle };
        const move = (pointerEvent) => {
            if (!drag || pointerEvent.pointerId !== drag.pointerId) {
                return;
            }
            const column = columnAt(pointerEvent.clientX, pointerEvent.clientY);
            if (!column) {
                return;
            }
            columnNodes().forEach((item) => {
                item.classList.toggle('is-drop-target', item === column);
            });
            placeBlock(drag.block, column, pointerEvent.clientY);
            scrollWithPointer(pointerEvent.clientY);
        };
        const end = (pointerEvent) => {
            if (!drag || pointerEvent.pointerId !== drag.pointerId) {
                return;
            }
            endBlockDrag();
        };
        dragCleanup = () => {
            documentRef.removeEventListener('pointermove', move);
            documentRef.removeEventListener('pointerup', end);
            documentRef.removeEventListener('pointercancel', end);
        };
        documentRef.addEventListener('pointermove', move);
        documentRef.addEventListener('pointerup', end);
        documentRef.addEventListener('pointercancel', end);
    };

    const moveBlockByKey = (block, key) => {
        const column = block.parentElement;
        if (!column) {
            return;
        }
        if (key === 'ArrowUp' || key === 'ArrowDown') {
            const siblings = [
                ...column.querySelectorAll(':scope > [data-layout-block]')
            ];
            const index = siblings.indexOf(block);
            const target = siblings[key === 'ArrowUp' ? index - 1 : index + 1];
            if (!target) {
                return;
            }
            if (key === 'ArrowUp') {
                column.insertBefore(block, target);
            } else {
                column.insertBefore(block, target.nextSibling);
            }
        } else {
            const columns = columnNodes();
            const columnIndex = columns.indexOf(column);
            const nextColumn = columns[columnIndex + (key === 'ArrowLeft' ? -1 : 1)];
            if (!nextColumn) {
                return;
            }
            const index = [
                ...column.querySelectorAll(':scope > [data-layout-block]')
            ].indexOf(block);
            const destination = [
                ...nextColumn.querySelectorAll(':scope > [data-layout-block]')
            ];
            nextColumn.insertBefore(block, destination[index] || null);
        }
        block.scrollIntoView({ block: 'nearest' });
        saveLayout(readDomLayout());
    };

    const onHandleKeyDown = (event) => {
        const handle = event.target.closest?.('[data-layout-handle]');
        if (!editing || !handle) {
            return;
        }
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            return;
        }
        const block = handle.closest('[data-layout-block]');
        if (!block) {
            return;
        }
        event.preventDefault();
        moveBlockByKey(block, event.key);
    };

    const adjustBoundary = (index, nextLeft) => {
        const layout = readDomLayout();
        const left = layout.columns[index];
        const right = layout.columns[index + 1];
        if (!left || !right) {
            return null;
        }
        const pair = left.weight + right.weight;
        const weight = Math.min(
            pair - MIN_WEIGHT,
            Math.max(MIN_WEIGHT, Math.round(nextLeft))
        );
        left.weight = weight;
        right.weight = pair - weight;
        paintWeights(layout.columns);
        updateSplitVisual(layout.columns);
        return layout;
    };

    const onSplitterPointerDown = (event) => {
        const splitter = event.target.closest?.('.manage-layout-splitter');
        if (!splitter || event.button !== 0) {
            return;
        }
        const index = Number(splitter.dataset.splitBoundary);
        const layout = readDomLayout();
        const left = layout.columns[index];
        const right = layout.columns[index + 1];
        if (!left || !right) {
            return;
        }
        event.preventDefault();
        const startX = event.clientX;
        const startLeft = left.weight;
        const pair = startLeft + right.weight;
        const width = splitHost.getBoundingClientRect().width || 1;
        splitter.setPointerCapture(event.pointerId);
        let latest = null;
        const move = (pointerEvent) => {
            if (pointerEvent.pointerId !== event.pointerId) {
                return;
            }
            const delta = ((pointerEvent.clientX - startX) / width) * 100;
            latest = adjustBoundary(index, startLeft + delta);
        };
        const end = (pointerEvent) => {
            if (pointerEvent.pointerId !== event.pointerId) {
                return;
            }
            splitter.removeEventListener('pointermove', move);
            splitter.removeEventListener('pointerup', end);
            splitter.removeEventListener('pointercancel', end);
            if (latest) {
                saveLayout(latest);
            }
        };
        splitter.addEventListener('pointermove', move);
        splitter.addEventListener('pointerup', end);
        splitter.addEventListener('pointercancel', end);
    };

    const onSplitterKeyDown = (event) => {
        const splitter = event.target.closest?.('.manage-layout-splitter');
        if (!splitter) {
            return;
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
        }
        event.preventDefault();
        const index = Number(splitter.dataset.splitBoundary);
        const layout = readDomLayout();
        const delta = event.key === 'ArrowLeft' ? -2 : 2;
        const next = adjustBoundary(index, layout.columns[index].weight + delta);
        if (next) {
            saveLayout(next);
        }
    };

    const setEditing = (next) => {
        editing = next;
        root.classList.toggle('is-layout-editing', editing);
        layoutButton?.setAttribute('aria-pressed', String(editing));
        if (layoutBar) {
            layoutBar.hidden = !editing;
        }
        if (editing) {
            renderSplit();
        } else {
            root.querySelectorAll('.manage-layout-column-label').forEach((label) => {
                label.remove();
            });
            clearDropTargets();
            endBlockDrag();
        }
    };

    try {
        const stored = readStoredLayout();
        if (stored) {
            paintStructure(normalizeManageLayout(stored, knownIds()));
        } else {
            const nodes = columnNodes();
            const weights = nodes.length === DEFAULT_MANAGE_LAYOUT.columns.length
                ? DEFAULT_MANAGE_LAYOUT.columns.map((column) => column.weight)
                : balanceLayoutWeights(nodes.map(() => 1));
            paintWeights(weights.map((weight) => ({ weight })));
        }
        installHandles();

        for (let count = 1; count <= MAX_COLUMNS; count += 1) {
            const button = documentRef.createElement('button');
            button.type = 'button';
            button.dataset.columnCount = String(count);
            button.textContent = String(count);
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute(
                'aria-label',
                COLUMN_COUNT_LABELS[count - 1] || `${count} sloupců`
            );
            button.addEventListener('click', () => setColumnCount(count));
            countHost?.append(button);
        }

        layoutButton?.addEventListener('click', () => setEditing(!editing));
        doneButton?.addEventListener('click', () => setEditing(false));
        resetButton?.addEventListener('click', resetLayout);
        splitHost?.addEventListener('pointerdown', onSplitterPointerDown);
        splitHost?.addEventListener('keydown', onSplitterKeyDown);
        root.addEventListener('pointerdown', onHandlePointerDown);
        root.addEventListener('keydown', onHandleKeyDown);
    } finally {
        documentRef.documentElement.classList.remove('manage-layout-pending');
    }
};
