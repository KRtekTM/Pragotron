(() => {
    const script = document.createElement('script');

    if (window.location.protocol === 'file:') {
        script.src = 'src/demos/departureBoard.file.js';
        script.async = false;
    } else {
        script.type = 'module';
        script.src = 'src/demos/departureBoard.js';
    }

    document.body.appendChild(script);
})();
