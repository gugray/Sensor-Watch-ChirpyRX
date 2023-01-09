# Chirpy RX decoder for the Sensor Watch

This is a browser-based app to receive and decode data transmissions
beeped out by the chirpy_tx face on Joey Castillo's Sensor Watch.

The chirpy_tx face is currently work in progress. You can find it on
the chirp-tx branch of my fork of the Sensor Watch repository:
https://github.com/gugray/Sensor-Watch/tree/chirpy-tx

## Building and running

To build the web app you will need Node.js. I'm using v16.13, but most
likely any nearby or newer version will work. To restore packages
you will need to use either yarn or npm. I recommend yarn.

To build and run the web app after a fresh checkout, go to `src/webapp`
and run:

```
yarn
node build.js --watch
```

This starts a local web server listening at `localhost:8080`. Open
this URL in your browser to run the app.

The second command above includes a folder watcher with live reload, so any files you change in
`src` will trigger a rebuild and automatically reload the app in the browser.