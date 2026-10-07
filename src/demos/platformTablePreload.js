(() => {
    const STORAGE_KEY = 'pragotron.platformTable.state.v1';

    try {
        const state = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
        if (state?.nightMode === true) {
            document.getElementById('skrin')?.classList.add('night-mode');
        }
    } catch {
        // A corrupted or unavailable preference must not block the board render.
    }
})();
