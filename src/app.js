import {FFTAnalyzer} from "./fftAnalyzer.js";

const audioFile = "data-w4-20.wav";

let elmBtnRecord;
let elmDownload;
let elmCanvas;
let elmBtnPlay;
let elmPlayState;

let audioCtx, gain, buffer, source, scriptNode, encoder;
let isPlaying = false;
let fftAnalyzer;

// 229

document.addEventListener('DOMContentLoaded', () => {

  elmBtnRecord = document.getElementById("btnRecord");
  elmBtnRecord.addEventListener("click", () => toggleRecord());
  elmDownload = document.getElementById("downloadSample");
  elmCanvas = document.getElementById("sgCanvas");

  document.getElementById("btnLoad").addEventListener("click", () => onLoadAudio());
  elmBtnPlay = document.getElementById("btnPlay");
  elmBtnPlay.addEventListener("click", () => onPlay());
  elmPlayState = document.getElementById("playState");
});

function toggleRecord() {

  // Currently not recording
  if (!audioCtx) {
    navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
      elmBtnRecord.innerText = "Stop";
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
  const blob = encoder.finish();
  const url = window.URL.createObjectURL(blob);
  elmDownload.href = url;
  elmDownload.download = "data.wav";
  elmDownload.style.display = "inline";
}

function createSamplesDownload(samples) {

  let downloadText = "";
  for (const line of samples) {
    if (downloadText.length > 0) downloadText += "\n";
    downloadText += line;
  }

  const fileName = "samples.txt";
  const data = [downloadText];
  const properties = {type: "text/plain"};
  let file;
  try {
    file = new File(data, fileName, properties);
  } catch {
    file = new Blob(data, properties);
  }
  const url = URL.createObjectURL(file);

  elmDownload.href = url;
  elmDownload.download = fileName;
  elmDownload.style.display = "inline";
}

function onLoadAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  console.log(gain.gain);
  gain.gain.setValueAtTime(10, audioCtx.currentTime);

  const req = new XMLHttpRequest();
  req.open('GET', audioFile, true);
  req.responseType = 'arraybuffer';
  req.onload = function () {
    const audioData = req.response;
    audioCtx.decodeAudioData(audioData).then(buf => {
      buffer = buf;
      elmBtnPlay.style.display = "inline";
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
  const fftSamples = fftAnalyzer.getSamples();
  createSamplesDownload(fftSamples);
  drawOutput(fftAnalyzer.spectra);
  fftAnalyzer = null;
  isPlaying = false;
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
  fftAnalyzer = new FFTAnalyzer(audioCtx, gain, buffer.sampleRate);

  elmBtnPlay.innerText = "Stop";
  isPlaying = true;
}

function drawOutput(spectra) {

  const w = spectra.length;
  const h = 512;

  elmCanvas.height = h;
  elmCanvas.width = w;
  elmCanvas.style.width = w;
  elmCanvas.style.height = h;
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
}
