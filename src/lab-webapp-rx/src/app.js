import {FFTAnalyzer} from "./fftAnalyzer.js";
import {ToneStencil, Demodulator, Block, Decoder} from "./chirpy-rx.js";
import {runChirpyRxTests} from "./chirpy-rx-tests.js";
import {toBase64} from "./base64.js";

const audioFile = "data-be-03.wav";
const stopAtEnd = true;
const gainVal = 10;
const toneRate = 64/3;
const baseFreq = 2500;
const freqStep = 250;
const nFreqs = 9;
const fftSize = 512;

// 2400 => 199

// 2200 -> 5600 => 3400 range
// 2200 + n * 375

let elmBtnRecord;
let elmDownloadRec;
let elmDownloadSamples;
let elmDecoded;
let elmCanvas;
let elmBtnPlay;
let elmBtnAnalyze;
let elmStencil;

let audioCtx, gain, buffer, source, scriptNode, encoder;
let isPlaying = false;
let fftAnalyzer;
let spectra;
let dem, startMsec, tones;


document.addEventListener('DOMContentLoaded', () => {

  // runChirpyRxTests();

  elmBtnRecord = document.getElementById("btnRecord");
  elmBtnRecord.addEventListener("click", () => toggleRecord());
  elmDownloadRec = document.getElementById("downloadRecording");

  document.getElementById("audioFileName").innerText = audioFile;
  document.getElementById("btnLoad").addEventListener("click", () => onLoadAudio());
  elmBtnAnalyze = document.getElementById("btnAnalyze");
  elmBtnAnalyze.addEventListener("click", () => onAnalyze());
  elmBtnPlay = document.getElementById("btnPlay");
  elmBtnPlay.addEventListener("click", () => onPlay());

  elmStencil = document.getElementById("cbStencil");
  elmStencil.checked = false;
  elmStencil.addEventListener("change", () => onStencilChanged());
  elmDecoded = document.getElementById("decoded");
  elmDownloadSamples = document.getElementById("downloadSample");
  elmCanvas = document.getElementById("sgCanvas");
});

function toggleRecord() {

  // Currently not recording
  if (!audioCtx) {
    navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
      elmBtnRecord.innerText = "Stop";
      elmDownloadRec.style.display = "none";
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      source = audioCtx.createMediaStreamSource(stream);
      gain = audioCtx.createGain();
      source.connect(gain);
      scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(scriptNode);
      encoder = new WavAudioEncoder(audioCtx.sampleRate, 1);
      scriptNode.onaudioprocess = function(e) {
        const data = e.inputBuffer.getChannelData(0);
        encoder.encode([data]);
      }
    }).catch((err) => {
      console.error(`Error from getUserMedia(): ${err}`);
    });
    return;
  }

  // Currently recording: stop; create download
  elmBtnRecord.innerText = "Record";
  source.disconnect();
  scriptNode.disconnect();
  audioCtx = null;
  const blob = encoder.finish();
  const url = window.URL.createObjectURL(blob);
  elmDownloadRec.href = url;
  elmDownloadRec.download = "data.wav";
  elmDownloadRec.style.display = "inline";
}

function createSamplesDownload(samples) {

  let downloadText = "";
  for (const line of samples) {
    if (downloadText.length > 0) downloadText += "\n";
    downloadText += line;
  }

  const fileName = "spectra.txt";
  const data = [downloadText];
  const properties = {type: "text/plain"};
  let file;
  try {
    file = new File(data, fileName, properties);
  } catch {
    file = new Blob(data, properties);
  }
  const url = URL.createObjectURL(file);

  elmDownloadSamples.href = url;
  elmDownloadSamples.download = fileName;
  elmDownloadSamples.style.display = "inline";
}

function onLoadAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);

  const req = new XMLHttpRequest();
  req.open('GET', audioFile, true);
  req.responseType = 'arraybuffer';
  req.onload = function () {
    const audioData = req.response;
    audioCtx.decodeAudioData(audioData).then(buf => {
      buffer = buf;
      elmBtnPlay.style.display = "inline";
      elmBtnAnalyze.style.display = "inline";
    }).catch(err => {
      console.log("Error decoding audio data: " + err.err);
    });
  }
  req.send();
}

function playOver() {
  elmBtnPlay.innerText = "Play";
  source.disconnect(gain);
  source.stop(audioCtx.currentTime);
  source = null;
  fftAnalyzer.disconnect();
  retrieveFFTSamples();
  fftAnalyzer = null;
  isPlaying = false;
}

function retrieveFFTSamples() {
  spectra = fftAnalyzer.spectra;
  const fftSamples = fftAnalyzer.getSamples();
  createSamplesDownload(fftSamples);

  dem = new Demodulator({
    sampleRate: buffer.sampleRate,
    fftSize,
    toneRate,
    baseFreq,
    freqStep,
    nFreqs});
  startMsec = dem.findStartMsec(spectra);
  const recLen = Math.round(buffer.length / buffer.sampleRate * 1000);
  elmDecoded.innerText = "Start detected at " + startMsec + " (total length: " + recLen + ")\n";

  tones = [];
  let endDetected = false;
  if (startMsec != -1) {
    for (let i = 0; !stopAtEnd || !endDetected; ++i) {
      const msec = startMsec + dem.toneLenMsec * i;
      if (msec + 200 > recLen) break;
      const tone = dem.detecToneAt(spectra, msec);
      tones.push(tone);
      if (doesEndInEOM(tones, dem.symFreqs.length - 1))
        endDetected = true;
      // if (tone == dec.symFreqs.length - 1 && tones.length >= 2 && tones[tones.length-2] == 0) {
      //   endDetected = true;
      // }
    }
    if (!endDetected) {
      elmDecoded.innerText += "No EOM found\n";
    }
    elmDecoded.innerText += "======================================================\n";
    for (let i = 0; i < tones.length; ++i) {
      if (i == 4) elmDecoded.innerText += ",\n";
      else if (((i - 4) % 45) == 0) elmDecoded.innerText += ",\n";
      else if (i > 0) elmDecoded.innerText += ", ";
      // if ((i % 16) != 0) elmDecoded.innerText += " ";
      // else if (i > 0) elmDecoded.innerText += "\n";
      elmDecoded.innerText += tones[i];
    }
  }
  const dec = new Decoder(tones);
  elmDecoded.innerText += "\n======================================================\n";
  elmDecoded.innerText += toBase64(dec.bytes);
  elmDecoded.innerText += "\n======================================================\n";
  elmDecoded.innerText += dec.ascii;

  drawOutput();
}

function doesEndInEOM(tones, signaToneIx) {
  if (tones.length < 3) return false;
  for (let i = 0; i < 3; ++i) {
    if (tones[tones.length - i - 1] != signaToneIx) return false;
  }
  return true;
}

function onPlay() {

  if (isPlaying) {
    playOver();
    return;
  }

  source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  source.start();
  source.addEventListener("ended", () => {
    if (isPlaying) playOver();
  });

  if (fftAnalyzer) fftAnalyzer.disconnect();
  fftAnalyzer = new FFTAnalyzer(buffer.sampleRate, fftSize);
  fftAnalyzer.connect(audioCtx, gain);

  elmBtnPlay.innerText = "Stop";
  isPlaying = true;
}

function onAnalyze() {
  if (fftAnalyzer) fftAnalyzer.disconnect();
  fftAnalyzer = new FFTAnalyzer(buffer.sampleRate, fftSize);
  const data = buffer.getChannelData(0);
  const frame = new Float32Array(fftSize);
  for (let ix = 0; ix + fftSize <= data.length; ix += fftSize) {
    for (let i = 0; i < fftSize; ++i)
      frame[i] = data[ix + i] * gainVal;
    fftAnalyzer.processData(frame);
  }
  retrieveFFTSamples();
  fftAnalyzer = null;
}

function drawOutput() {

  const w = spectra.length;
  const h = fftSize / 2;

  elmCanvas.height = h;
  elmCanvas.width = w;
  elmCanvas.style.width = w + "px";
  elmCanvas.style.height = h + "px";
  const ctx = elmCanvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, w, h);

  for (let x = 0; x < w; ++x) {
    const s = spectra[x];
    for (let i = 0; i < s.length; ++i) {
      const y = h - i - 1;
      let val = Math.floor(s[i] * 2048);
      setPixel(imgData, x, y, val, val * 0.25, val * 0.25);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  elmStencil.disabled = false;
}

function onStencilChanged() {
  if (!spectra) return;
  drawOutput();
  if (elmStencil.checked) drawStencil(dem, tones, startMsec);
}

function drawStencil(dec, tones, startMsec) {

  const w = spectra.length;
  const h = dec.fftSize / 2;
  const ctx = elmCanvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, w, h);

  for (let i = 0; i < tones.length; ++i) {

    const x1 = Math.round((startMsec + dec.toneLenMsec * (i-0.5)) / dec.sampleLenMsec);
    const x2 = Math.round((startMsec + dec.toneLenMsec * (i+0.5)) / dec.sampleLenMsec);

    const toneIx = tones[i];

    if (toneIx == -1) {
      drawRect(x1, 0, x2 - x1, h);
      continue;
    }

    let y1 = dec.stencils[toneIx].bins[0];
    let y2 = dec.stencils[toneIx].bins[dec.stencils[toneIx].bins.length - 1];
    let rh = Math.abs(y2 - y1) + 1;
    let y = Math.min(y1, y2);
    drawRect(x1, h - y - 1, x2 - x1, rh);
  }
  ctx.putImageData(imgData, 0, 0);

  function drawRect(x, y, w, h) {
    for (let i = x; i < x + w; ++i) {
      setPixel(imgData, i, y, 128, 128, 255);
      setPixel(imgData, i, y + h - 1, 128, 128, 255);
    }
    for (let i = y; i < y + h; ++i) {
      setPixel(imgData, x, i, 128, 128, 255);
      setPixel(imgData, x + w - 1, i, 128, 128, 255);
    }
  }
}

function setPixel(imgd, x, y, r, g, b, a = 255) {
  const w = imgd.width;
  imgd.data[(y * w + x) * 4] = r;
  imgd.data[(y * w + x) * 4 + 1] = g;
  imgd.data[(y * w + x) * 4 + 2] = b;
  imgd.data[(y * w + x) * 4 + 3] = a;
}
