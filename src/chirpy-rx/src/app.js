import {ToneStencil, Demodulator, Block, Decoder} from "./chirpy-rx.js";
import {WAVEncoder} from "./wav-encoder.js";
import {FFT} from "./fft.js";
import {runChirpyRxTests} from "./chirpy-rx-tests.js";
import {toBase64} from "./base64.js";

// TODO: Fix day decode error for Activity

const showTest = false;
const testFileName = "data-03.wav";

const gainVal = 10;
const toneRate = 64/3;
const baseFreq = 2500;
const freqStep = 250;
const nFreqs = 9;
const fftSize = 512;

let audioCtx, stream, gain, source, scriptNode, wavEncoder;
let chunks, nSamples, sampleRate;
let spectra;
let demodulator, startMsec, tones, decoder;

const elms = {
  btnAudio: null, ctrlAudioTop: null, lblLength: null, lnkWav: null, lnkTest: null,
  ctrlDecoding: null, decodingStatus: null, decodingRes: null,
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
  if (showTest) {
    elms.lnkTest.classList.add("visible");
    elms.lnkTest.addEventListener("click", onTestClick);
  }
  elms.lnkTones.addEventListener("click", () => setCtrlDecodingTab("tones"));
  elms.lnkBlocks.addEventListener("click", () => setCtrlDecodingTab("blocks"));
  elms.lnkBase64.addEventListener("click", () => setCtrlDecodingTab("base64"));
  elms.lnkContent.addEventListener("click", () => setCtrlDecodingTab("content"));
}

function setCtrlDecodingTab(tab) {
  ["tones", "blocks", "base64", "content"].forEach(cls => elms.ctrlDecoding.classList.remove(cls));
  elms.ctrlDecoding.classList.add(tab);
}

function onTestClick() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);

  const req = new XMLHttpRequest();
  req.open('GET', testFileName, true);
  req.responseType = 'arraybuffer';
  req.onload = function () {
    const audioData = req.response;
    audioCtx.decodeAudioData(audioData).then(buf => {
      const data = buf.getChannelData(0);
      chunks = [];
      sampleRate = buf.sampleRate;
      nSamples = data.length;
      let pos = 0;
      while (pos < data.length) {
        const chunkSize = Math.min(4096, data.length - pos);
        const chunk = new Float32Array(chunkSize);
        for (let i = 0; i < chunkSize; ++i) {
          chunk[i] = data[pos + i];
        }
        chunks.push(chunk);
        pos += chunkSize;
      }
      setAutdioBtnClass("done");
      elms.lnkTest.classList.remove("visible");
      elms.ctrlAudioTop.innerText = "Loaded audio file";
      startProcessing();
    }).catch(err => {
      alert("Error decoding audio data: " + err.err);
    });
  }
  req.send();
}

function setAutdioBtnClass(cls) {
  ["enable", "record", "stop", "done"].forEach(cls => elms.btnAudio.classList.remove(cls));
  elms.btnAudio.classList.add(cls);
}

function onBtnAudioClick() {
  if (elms.btnAudio.classList.contains("enable")) {
    navigator.mediaDevices.getUserMedia({audio: true}).then((s) => {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      stream = s;
      setAutdioBtnClass("record");
      elms.ctrlAudioTop.innerText = "Press to record transmission";
    }).catch((err) => {
      elms.ctrlAudioTop.innerText = "Failed to enable microphone ;-(";
    });
  } else if (elms.btnAudio.classList.contains("record")) {
    elms.lnkTest.classList.remove("visible");
    source = audioCtx.createMediaStreamSource(stream);
    gain = audioCtx.createGain();
    source.connect(gain);
    scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
    source.connect(scriptNode);
    wavEncoder = new WAVEncoder(audioCtx.sampleRate, 1);
    chunks = [];
    nSamples = 0;
    sampleRate = source.context.sampleRate;
    scriptNode.onaudioprocess = function(e) {
      // We may have retrieved WAV file from encoder already; some audio chunks arrive with a delay
      if (!wavEncoder.canEncode()) return;
      const data = e.inputBuffer.getChannelData(0);
      chunks.push(data);
      nSamples += data.length;
      wavEncoder.encode([data]);
    }
    setAutdioBtnClass("stop");
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
    setAutdioBtnClass("done");
    elms.ctrlAudioTop.innerText = "Recording finished";
    // Clean up
    source.disconnect();
    scriptNode.disconnect();
    audioCtx = null;
    // Prepare audio download
    const blob = wavEncoder.finish();
    const url = window.URL.createObjectURL(blob);
    elms.lnkWav.href = url;
    elms.lnkWav.download = "chirpy.wav";
    elms.lnkWav.style.display = "inline";
    // Start processing
    startProcessing();
  }
}

function startProcessing() {

  elms.ctrlDecoding.classList.add("visible");
  const fft = new FFT(fftSize, sampleRate);
  spectra = [];

  let chunkIx = 0, posInChunk = 0;
  const frame = new Float32Array(fftSize);
  const framesPerIter = 1000;
  decodeSome();

  function decodeSome() {

    let dataOver = false;

    // Process several FFT rounds
    for (let fc = 0; fc < framesPerIter && !dataOver; ++fc) {
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
      setTimeout(decodeSome, 10);
    }
  }
}

function startDemodulating() {

  demodulator = new Demodulator({
    sampleRate,
    fftSize,
    toneRate,
    baseFreq,
    freqStep,
    nFreqs});

  startMsec = demodulator.findStartMsec(spectra);
  if (startMsec == -1) {
    elms.decodingStatus.innerText = "No message found.";
    elms.resTones.innerHTML += "<p>No Start-Of-Message sequence detected. Cannot decode transmission.</p>";
    return;
  }

  tones = [];
  let tonePos = 0;
  const tonesPerIter = 500;
  const recLenMsec = Math.round(nSamples / sampleRate * 1000);
  demodulateSome();

  function demodulateSome() {
    for (let tc = 0; tc < tonesPerIter; ++tc) {
      const msec = startMsec + tonePos * demodulator.toneLenMsec;
      if (msec + 200 > recLenMsec) {
        startDecoding(startMsec, null);
        return;
      }
      const tone = demodulator.detecToneAt(spectra, msec);
      tones.push(tone);
      if (doesEndInEOM(tones, demodulator.symFreqs.length - 1)) {
        startDecoding(startMsec, msec);
        return;
      }
      ++tonePos;
    }
    setTimeout(demodulateSome, 10);
  }

  function doesEndInEOM(tones, signalToneIx) {
    if (tones.length < 3) return false;
    for (let i = 0; i < 3; ++i) {
      if (tones[tones.length - i - 1] != signalToneIx) return false;
    }
    return true;
  }
}

function startDecoding(startMsec, endMsec) {
  const startSecStr = (startMsec / 1000).toFixed(2);
  if (!endMsec) {
    elms.resTones.innerHTML += `<p>Start of message: ${startSecStr}<br/>No End-Of-Message sequence detected</p>`;
  }
  else {
    const endSecStr = (endMsec / 1000).toFixed(2);
    elms.resTones.innerHTML += `<p>Start of message: ${startSecStr}<br/>End of message: ${endSecStr}</p>`;
  }
  // Display tones
  let tonesStr = "";
  for (const t of tones) {
    if (tonesStr != "") tonesStr += " ";
    tonesStr += t;
  }
  elms.resTones.innerHTML += `<pre>${tonesStr}</pre>`;

  // Decode, and display decoded blocks
  decoder = new Decoder(tones);
  let blocksHtml = "";
  for (let i = 0; i < decoder.blocks.length; ++i) {
    const block = decoder.blocks[i];
    if (block.valid) blocksHtml += `<span class='valid'>Block ${i} VALID</span>`;
    else blocksHtml += `<span class='invalid'>Block ${i} INVALID</span>`;
    blocksHtml += "\nTones:";
    for (let j = block.startTonePos; j < block.startTonePos + block.nTones; ++j)
      blocksHtml += " " + tones[j];
    blocksHtml += "\nBytes:";
    for (const b of block.bytes)
      blocksHtml += " 0x" + b.toString(16).padStart(2, "0");
    blocksHtml += "\nCRC: 0x" + block.crc.toString(16).padStart(2, "0") + "\n\n";
  }
  elms.resBlocks.innerHTML = `<pre>${blocksHtml}</pre>`;
  elms.lnkBlocks.classList.add("visible");
  setCtrlDecodingTab("blocks");

  if (!decoder.valid) {
    elms.decodingStatus.innerText = "Message cannot be reconstructed: invalid CRC in one or more blocks.";
    return;
  }

  // Display decoded binary as Base64
  const base64 = toBase64(decoder.bytes);
  elms.resBase64.innerHTML = `
<p>
  This is the transmission's data content encoded in Base64. If you're not sure how to decode it,
  you can use an online tool like
  <a href="https://base64.guru/converter/decode" target="_blank" rel="noreferrer">Base64.guru</a>.
</p>
<pre>${base64}</pre>`;
  elms.lnkBase64.classList.add("visible");
  setCtrlDecodingTab("base64");
  elms.decodingStatus.innerText = "Message successfully decoded.";
  interpretContent();
}

function interpretContent() {
  // Does prefix indicate a known format?
  if (decoder.bytes.length > 2 && decoder.bytes[0] == 0x27 && decoder.bytes[1] == 0x00) {
    interpretAsActivity();
  }
  // Can it still be ASCII?
  else {
    let canBeAscii = true;
    for (const b of decoder.bytes)
      if (b == 0 || b > 127) canBeAscii = false;
    if (!canBeAscii) return;
    elms.resContent.innerHTML = "<pre></pre>";
    elms.resContent.querySelector("pre").innerText = decoder.ascii;
    elms.lnkContent.classList.add("visible");
    elms.lnkContent.innerText = "ASCII";
    setCtrlDecodingTab("content");
  }
}

class DecodedActivity {
  constructor(bytes) {
    // watch_date_time start_time;
    // --
    // uint32_t second : 6;    // 0-59
    // uint32_t minute : 6;    // 0-59
    // uint32_t hour : 5;      // 0-23
    // uint32_t day : 5;       // 1-31
    // uint32_t month : 4;     // 1-12
    // uint32_t year : 6;      // 0-63 (representing 2020-2083)
    // --
    // uint16_t total_sec;
    // uint16_t pause_sec;
    // uint8_t activity_type;

    let year = (bytes[0] & 0b11111100) >> 2;
    year += 2020;
    let month = ((bytes[0] & 0b00000011) << 2) + ((bytes[1] & 0b11000000) >> 6);
    let day = (bytes[1] & 0b00111110) >> 1;
    let hour = ((bytes[1] & 0b00000001) << 4) + ((bytes[2] & 0b11110000) >> 4);
    let minute = ((bytes[2] & 0b00001111) << 2) + ((bytes[3] & 0b11000000) >> 6);
    let second = (bytes[3] & 0b00111111);
    this.start = new Date(year, month - 1, day, hour, minute, second);
    this.totalSec = bytes[4] * 256 + bytes[5];
    this.pauseSec = bytes[6] * 256 + bytes[7];
    this.typeNum = bytes[8];
    this.type = "UNKNOWN";
    const activities = ["BIKE", "WALK", "RUN", "DANCE", "YOGA", "CROSSFIT", "SWIM",
      "ELLIPTICAL", "GYM", "ROW", "SOCCER", "FOOTBALL", "BALLGAME", "SKI",
    ];
    if (this.typeNum < activities.length)
      this.type = activities[this.typeNum];
  }
}

function dateToIso(date) {
  // 2012-01-01T00:00:00
  let res = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-";
  res += (date.getDay() + 1).toString().padStart(2, "0") + "T";
  res += date.getHours().toString().padStart(2, "0") + ":";
  res += date.getMinutes().toString().padStart(2, "0") + ":";
  res += date.getSeconds().toString().padStart(2, "0");
  return res;
}

function secsToDuration(val) {
  let secs = val % 60;
  val -= secs;
  val /= 60;
  let mins = val % 60;
  val -= mins;
  let hours = val / 60;
  let res = mins.toString().padStart(2, "0") + ":" + secs.toString().padStart(2, "0");
  if (hours == 0) return res;
  res = hours.toString() + ":" + res;
  return res;
}

function interpretAsActivity() {
  const itmLen = 9;
  const items = [];
  for (let ix = 2; ix < decoder.bytes.length; ix += itmLen) {
    const itmBytes = decoder.bytes.slice(ix, ix + itmLen);
    items.push(new DecodedActivity(itmBytes));
  }
  let tableTxt = "time\tactivity_code\tactivity_name\ttotal_duration\tpause_duration\n";
  for (const itm of items) {
    tableTxt += dateToIso(itm.start) + "\t" + itm.typeNum + "\t" + itm.type + "\t";
    tableTxt += secsToDuration(itm.totalSec) + "\t" + secsToDuration(itm.pauseSec);
    tableTxt += "\n";
  }
  elms.resContent.innerHTML = "<pre></pre>";
  elms.resContent.querySelector("pre").innerText = tableTxt;
  elms.lnkContent.classList.add("visible");
  elms.lnkContent.innerText = "Activity";
  setCtrlDecodingTab("content");

}
