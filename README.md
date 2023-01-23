# Chirpy RX decoder for the Sensor Watch

This is a browser-based app to receive and decode data transmissions
beeped out by faces like the `activity_face` or `chirpy_demo_face` on Joey Castillo's
[Sensor Watch](https://www.sensorwatch.net/).

You can use the live app here: https://jealousmarkup.xyz/off/chirpy/rx

![Chirpy transmission from the watch](doc/chirpy-transmission.mp4)

## Building and running

The app is in `src/chirpy-rx`.

To build it you will need Node.js. I'm using v16.13, but most
likely any nearby or newer version will work. To restore packages
you will need to use either yarn or npm. I recommend yarn.

To build and run the web app after a fresh checkout, go to `src/chirpy-rx`
and run:

```
yarn
node build.js --watch
```

This starts a local web server listening at `localhost:8080`. Open
this URL in your browser to run the app.

The second command above includes a folder watcher with live reload, so any files you change in
`src` will trigger a rebuild and automatically reload the app in the browser.

## Lab tools

There are two other experimental projects in the src folder. I've been using these to
empirically find the frequencies and transmission rates at which data chirping works
reliably with the watch's piezo buzzer.

`lab-arduino-tx` is a program for an Arduino Nano with
a watch's back side attached. I used it to quickly generate transmissions with
various settings without the need to take a watch apart every time. The program is built
with Platform.io.

`lab-webapp-rx` is the app I used to analyze audio from recorded transmissions. It
is a precursor to the final web app. It generate cool spectrograms like this:

