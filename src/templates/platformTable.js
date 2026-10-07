export const PLATFORM_TABLE_TEMPLATE = Object.freeze({
    id: 'pragotron-platform-table',
    rootSelector: '#tabule',
    slots: Object.freeze([
        Object.freeze({
            id: 'stationOne',
            type: 'split-flap',
            selector: '[data-board-slot="stationOne"]',
            statePath: Object.freeze(['stations', 0])
        }),
        Object.freeze({
            id: 'stationTwo',
            type: 'split-flap',
            selector: '[data-board-slot="stationTwo"]',
            statePath: Object.freeze(['stations', 1])
        }),
        Object.freeze({
            id: 'train',
            type: 'train-flap',
            selector: '[data-board-slot="train"]',
            statePath: 'train'
        }),
        Object.freeze({
            id: 'departureTime',
            type: 'departure-time',
            selector: '[data-board-slot="departureTime"]',
            statePath: 'departureTime'
        }),
        Object.freeze({
            id: 'delay',
            type: 'delay-flap',
            selector: '[data-board-slot="delay"]',
            statePath: 'delay'
        }),
        Object.freeze({
            id: 'lenses',
            type: 'lens-display',
            selector: '[data-board-slot="lenses"]',
            statePath: 'lenses',
            options: Object.freeze({
                count: 2
            })
        })
    ])
});
