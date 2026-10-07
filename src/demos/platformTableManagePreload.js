(() => {
    const STORAGE_KEY = 'pragotron.platformTable.state.v1';

    try {
        const state = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) || 'null'
        );
        if (state?.nightMode === true) {
            document.body.classList.add('manage-night-mode');
        }
    } catch {
        // A corrupted or unavailable preference must not block the form.
    }
})();
