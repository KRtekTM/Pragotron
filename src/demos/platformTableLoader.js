(() => {
    const script = document.createElement('script');

    if (window.location.protocol === 'file:') {
        script.src = 'src/demos/platformTableDemo.file.js';
        script.async = false;
    } else {
        script.type = 'module';
        script.src = 'src/demos/platformTableDemo.js';
    }

    document.body.appendChild(script);
})();
