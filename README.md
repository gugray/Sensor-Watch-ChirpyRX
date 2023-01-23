# Chirpy RX decoder for the Sensor Watch

This is a browser-based app to receive and decode data transmissions
beeped out by faces like the `activity_face` or `chirpy_demo_face` on Joey Castillo's
[Sensor Watch](https://www.sensorwatch.net/).

You can use the live app here: https://jealousmarkup.xyz/off/chirpy/rx

This is what a Chirpy data transmission looks and sounds like:

https://user-images.githubusercontent.com/22029901/214139415-388a9de6-160e-4004-a579-6b523cd4701a.mp4

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

In practice the setup looks like this:

![Arduino Nano with the piezo buzzer from a Casio watch](https://user-images.githubusercontent.com/22029901/214140329-b893ca5e-d72c-460c-9a03-eeb7304ecac4.jpg)

`lab-webapp-rx` is the app I used to analyze audio from recorded transmissions. It
is a precursor to the final web app. It generates cool spectrograms like this:

![chirpy-spectrogram](https://user-images.githubusercontent.com/22029901/214140657-b1e70b20-48a3-4060-9e47-8b6bf2ef0261.jpg)
