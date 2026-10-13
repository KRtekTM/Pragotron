(() => {
    const TOKEN_KEY = 'pragotron.manage.session.v1';
    const EPOCH_KEY = 'pragotron.manage.session.epoch.v1';
    const ADDRESS_KEY = 'pragotron.manage.session.address.v1';
    const TOKEN_PATTERN = /^[A-Za-z0-9-]{16,80}$/;

    const loadManageScript = () => {
        document.documentElement.classList.remove('manage-session-pending');
        const script = document.createElement('script');
        if (window.location.protocol === 'file:') {
            script.src = 'src/demos/platformTableManage.file.js';
            script.async = false;
        } else {
            script.type = 'module';
            script.src = 'src/demos/platformTableManage.js';
        }
        document.body.appendChild(script);
    };

    const sessionUrl = () => {
        const protocol = window.location.protocol;
        if (protocol !== 'http:' && protocol !== 'https:') {
            return '';
        }
        return `${window.location.origin}/api/manage/session`;
    };

    const readToken = () => {
        try {
            const existing = window.sessionStorage.getItem(TOKEN_KEY) || '';
            if (TOKEN_PATTERN.test(existing)) {
                return existing;
            }
            const token = window.crypto?.randomUUID?.()
                || `manage-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
            window.sessionStorage.setItem(TOKEN_KEY, token);
            return token;
        } catch {
            return '';
        }
    };

    const showDenied = async (address) => {
        const addressNode = document.querySelector('#manageSessionAddress');
        if (addressNode) {
            addressNode.textContent = address || 'neznámá adresa';
        }
        document.title = 'Nejvyšší pan železničář je přítomen. – PRAGOTRON';
        document.documentElement.classList.add('manage-session-denied');
        document.documentElement.classList.remove('manage-session-pending');
        try {
            const module = await import('./manageSessionDenied.js');
            module.mountManageSessionDenied(document);
        } catch (error) {
            console.error(error);
        }
    };

    document.querySelector('#manageSessionRetry')?.addEventListener('click', () => {
        window.location.reload();
    });

    const endpoint = sessionUrl();
    const token = endpoint ? readToken() : '';
    if (!endpoint || !token) {
        loadManageScript();
        return;
    }

    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    }).then(async (response) => {
        let payload = {};
        try {
            payload = await response.json();
        } catch {
            payload = {};
        }
        if (response.status === 409 && !payload.expired) {
            await showDenied(payload.address);
            return;
        }
        if (response.ok && Number.isInteger(payload.epoch)) {
            try {
                window.sessionStorage.setItem(EPOCH_KEY, String(payload.epoch));
                window.sessionStorage.setItem(
                    ADDRESS_KEY,
                    String(payload.address || '')
                );
            } catch {
                // The page can still open, but it will not refresh the lease.
            }
        }
        loadManageScript();
    }).catch(() => {
        loadManageScript();
    });
})();
