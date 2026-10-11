(() => {
    const STORAGE_KEY = 'pragotron.platformTable.state.v2';
    const LEGACY_STORAGE_KEY = 'pragotron.platformTable.state.v1';

    try {
        const parse = (value) => {
            try {
                return value ? JSON.parse(value) : null;
            } catch {
                return null;
            }
        };
        const currentState = parse(
            window.localStorage.getItem(STORAGE_KEY)
        );
        const legacyState = currentState
            ? null
            : parse(window.localStorage.getItem(LEGACY_STORAGE_KEY));
        const state = currentState || legacyState;
        if (!currentState && legacyState) {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ ...legacyState, version: 2 })
            );
        }
        const settings = state?.settings || state;
        if (settings?.nightMode === true) {
            document.body.classList.add('manage-night-mode');
        }
        if (window.localStorage.getItem('pragotron.manage.layout.v1')) {
            document.documentElement.classList.add('manage-layout-pending');
            window.setTimeout(() => {
                document.documentElement.classList.remove('manage-layout-pending');
            }, 4000);
        }
    } catch {
        // A corrupted or unavailable preference must not block the form.
    }
})();
