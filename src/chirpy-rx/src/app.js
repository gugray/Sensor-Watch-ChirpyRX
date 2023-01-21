import {ToneStencil, Demodulator, Block, Decoder} from "./chirpy-rx.js";
import {runChirpyRxTests} from "./chirpy-rx-tests.js";
import {toBase64} from "./base64.js";

const gainVal = 10;
const toneRate = 64/3;
const baseFreq = 2500;
const freqStep = 250;
const nFreqs = 9;
const fftSize = 512;

let audioCtx, stream, gain, source, scriptNode, encoder;
let chunks, nSamples, sampleRate;
let spectra;
let dem, startMsec, tones;

const elms = {
  btnAudio: null, ctrlAudioTop: null, lblLength: null, lnkWav: null,
  ctrlDecoding: null, decodingWIP: null, decodingRes: null,
  lnkTones: null, lnkBlocks: null, lnkBase64: null, lnkContent: null,
  resTones: null, resBlocks: null, resBase64: null, resContent: null,
}

document.addEventListener('DOMContentLoaded', () => {

  initUI();
});

function initUI() {
  for (const key in elms)
    elms[key] = document.getElementById(key);
  elms.btnAudio.addEventListener("click", onBtnAudioClick);
}

function onBtnAudioClick() {
  if (elms.btnAudio.classList.contains("enable")) {
    navigator.mediaDevices.getUserMedia({audio: true}).then((s) => {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      stream = s;
      elms.btnAudio.classList.remove("enable");
      elms.btnAudio.classList.add("record");
      elms.ctrlAudioTop.innerText = "Press to record transmission";
    }).catch((err) => {
      elms.ctrlAudioTop.innerText = "Failed to enable microphone ;-(";
    });
  } else if (elms.btnAudio.classList.contains("record")) {
    source = audioCtx.createMediaStreamSource(stream);
    gain = audioCtx.createGain();
    source.connect(gain);
    scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
    source.connect(scriptNode);
    encoder = new WavAudioEncoder(audioCtx.sampleRate, 1);
    chunks = [];
    nSamples = 0;
    sampleRate = source.context.sampleRate;
    scriptNode.onaudioprocess = function(e) {
      // We may have retrieved WAV file from encoder already; some audio chunks arrive with a delay
      if (!encoder.canEncode()) return;
      const data = e.inputBuffer.getChannelData(0);
      chunks.push(data);
      nSamples += data.length;
      encoder.encode([data]);
    }
    elms.btnAudio.classList.remove("record");
    elms.btnAudio.classList.add("stop");
    elms.ctrlAudioTop.innerText = "Press to finish recording";
    const startTime = new Date();
    updateTime();
    function updateTime() {
      const elapsed = new Date() - startTime;
      let secs = Math.floor(elapsed / 1000);
      let mins = Math.floor(secs / 60);
      secs -= mins * 60;
      elms.lblLength.innerText = mins + ":" + secs.toString().padStart(2, '0');
      if (elms.btnAudio.classList.contains("stop")) {
        setTimeout(updateTime, 50);
      }
    }
  }
  else if (elms.btnAudio.classList.contains("stop")) {
    elms.btnAudio.classList.remove("stop");
    elms.btnAudio.classList.add("record");
    elms.ctrlAudioTop.innerText = "Recording finished";
    // Clean up
    source.disconnect();
    scriptNode.disconnect();
    audioCtx = null;
    // Prepare audio download
    const blob = encoder.finish();
    const url = window.URL.createObjectURL(blob);
    elms.lnkWav.href = url;
    elms.lnkWav.download = "chirpy.wav";
    elms.lnkWav.style.display = "inline";
    // Start decoding
    startDecoding();
  }
}

function startDecoding() {

  elms.decodingWIP.classList.add("visible");
  const fft = new FFT(fftSize, sampleRate);
  spectra = [];

  let chunkIx = 0, posInChunk = 0;
  const frame = new Float32Array(fftSize);
  const framePerIter = 128;
  decodeSome();

  function decodeSome() {

    let dataOver = false;

    // Process several FFT rounds
    for (let fc = 0; fc < framePerIter && !dataOver; ++fc) {
      // Gather data for this FFT round
      for (let i = 0; i < fftSize; ++i) {
        if (posInChunk == chunks[chunkIx].length) {
          posInChunk = 0;
          chunkIx += 1;
        }
        if (chunkIx == chunks.length) {
          dataOver = true;
          break;
        }
        frame[i] = chunks[chunkIx][posInChunk];
        ++posInChunk;
      }
      if (dataOver) break;
      // Do FFT; save spectrum
      fft.forward(frame);
      let s = new Float32Array(fft.spectrum.length);
      for (let i = 0; i < s.length; ++i) s[i] = fft.spectrum[i];
      spectra.push(s);
    }

    if (dataOver) startDemodulating();
    else {
      setTimeout(decodeSome, 0);
    }
  }
}

function startDemodulating() {
  elms.decodingWIP.classList.remove("visible");
  console.log("Spectra: " + spectra.length);
}
