import {FFTAnalyzer} from "./fftAnalyzer.js";
import {symFreqs} from "./freqConsts.js";
import {ToneStencil, Decoder} from "./decoder.js"

const audioFile = "data-w5-20.wav";
const gainVal = 10;
const toneRate = 20;
const fftSize = 512;

// 2400 => 199

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


document.addEventListener('DOMContentLoaded', () => {

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

  const dec = new Decoder(buffer.sampleRate, fftSize, toneRate);
  const startMsec = dec.findStartMsec(spectra);
  const recLen = Math.round(buffer.length / buffer.sampleRate * 1000);
  elmDecoded.innerText = "Start detected at " + startMsec + " (total length: " + recLen + ")\n";

  const tones = [];
  let endDetected = false;
  if (startMsec != -1) {
    for (let i = 3; ++i; true) {
      const msec = startMsec + dec.toneLenMsec * i;
      if (msec + 200 > recLen) break;
      const tone = dec.detecToneAt(spectra, msec);
      tones.push(tone);
      if (tone == 17 && tones.length >= 2 && tones[tones.length-2] == 16) {
        endDetected = true;
        break;
      }
    }
    if (!endDetected) {
      elmDecoded.innerText += "No EOM found\n";
    }
    elmDecoded.innerText += "======================================================\n";
    for (let i = 0; i < tones.length; ++i) {
      if ((i % 16) != 0) elmDecoded.innerText += " ";
      else if (i > 0) elmDecoded.innerText += "\n";
      elmDecoded.innerText += tones[i];
    }
  }

  drawOutput();
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
  for (ix = 0; ix + fftSize <= data.length; ix += fftSize) {
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
      imgData.data[(y * w + x) * 4] = val;
      imgData.data[(y * w + x) * 4 + 1] = val * 0.25;
      imgData.data[(y * w + x) * 4 + 2] = val * 0.25;
      imgData.data[(y * w + x) * 4 + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  elmStencil.disabled = false;
}

function onStencilChanged() {
  if (!spectra) return;
  drawOutput();
  if (elmStencil.checked) drawStencil();
}

function drawStencil() {

  const symIxs = [17, 16, 17, 16, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const freqs = [];
  symIxs.forEach(ix => freqs.push(symFreqs[ix]));
  const tss = [];
  freqs.forEach(freq => tss.push(new ToneStencil(freq, buffer.sampleRate, fftSize)));

  const w = spectra.length;
  const h = 512;
  const ctx = elmCanvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, w, h);

  const ofsMsec = 4342;
  const sampleLenMsec = fftSize / buffer.sampleRate * 1000;
  for (let i = 0; i < tss.length; ++i) {
    const ts = ofsMsec + (i + 0.5) * (1000 / toneRate);
    const frameIx = Math.round(ts / sampleLenMsec);
    drawBins(tss[i], frameIx);
  }
  ctx.putImageData(imgData, 0, 0);

  function drawBins(stencil, x) {
    for (const binIx of stencil.bins) {
      setPixel(x, h - binIx - 1, 32, 32, 255);
    }
  }

  function setPixel(x, y, r, g, b) {
    imgData.data[(y * w + x) * 4] = r;
    imgData.data[(y * w + x) * 4 + 1] = g;
    imgData.data[(y * w + x) * 4 + 2] = b;
    imgData.data[(y * w + x) * 4 + 3] = 255;
  }
}