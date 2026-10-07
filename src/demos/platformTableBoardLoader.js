(() => {
    const script = document.createElement('script');

    if (window.location.protocol === 'file:') {
        script.src = 'src/demos/platformTableBoard.file.js';
        script.async = false;
    } else {
        script.type = 'module';
        script.src = 'src/demos/platformTableBoard.js';
    }

    document.body.appendChild(script);
})();
