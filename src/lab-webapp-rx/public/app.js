(() => {
  // src/fftAnalyzer.js
  var FFTAnalyzer = class {
    constructor(sampleRate, fftSize2) {
      this.fftSize = fftSize2;
      this.sampleRate = sampleRate;
      this.fft = new FFT(fftSize2, sampleRate);
      this.spectra = [];
    }
    connect(audioCtx2, inputNode) {
      this.audioCtx = audioCtx2;
      this.inputNode = inputNode;
      this.procFun = (evt) => this.processEvent(evt);
      this.processor = audioCtx2.createScriptProcessor(this.fftSize, 1, 1);
      this.processor.addEventListener("audioprocess", this.procFun);
      inputNode.connect(this.processor);
    }
    disconnect() {
      this.processor.removeEventListener("audioprocess", this.procFun);
      this.inputNode.disconnect(this.proc);
    }
    processEvent(evt) {
      this.processData(evt.inputBuffer.getChannelData(0));
    }
    processData(data) {
      this.fft.forward(data);
      let s = new Float32Array(this.fft.spectrum.length);
      for (let i = 0; i < s.length; ++i)
        s[i] = this.fft.spectrum[i];
      this.spectra.push(s);
    }
    getSamples() {
      let samples = [];
      let msec = 0;
      for (const s of this.spectra) {
        let sample = msec.toFixed(1);
        sample = sample.padStart(8, " ");
        for (const val of s) {
          sample += " ";
          sample += val.toFixed(4);
        }
        msec += this.fftSize / this.sampleRate * 1e3;
        samples.push(sample);
      }
      return samples;
    }
  };

  // src/chirpy-rx.js
  var ToneStencil = class {
    constructor(freq, sampleRate, fftSize2) {
      this.freq = freq;
      this.bins = getBins(freq, sampleRate, fftSize2, true);
    }
  };
  function getBins(freq, sampleRate, fftSize2, multiple = false) {
    const bandwidth = sampleRate / fftSize2;
    let midIx = -1;
    for (let i = 0; i < fftSize2 / 2; ++i) {
      if (freq > i * bandwidth && freq <= (i + 1) * bandwidth) {
        midIx = i;
        break;
      }
    }
    if (multiple)
      return [midIx - 1, midIx, midIx + 1];
    else
      return [midIx];
  }
  var Demodulator = class {
    constructor({ sampleRate, fftSize: fftSize2, toneRate: toneRate2, baseFreq: baseFreq2, freqStep: freqStep2, nFreqs: nFreqs2 }) {
      const bitSize = Math.log(nFreqs2 - 1) / Math.log(2);
      if (bitSize != Math.round(bitSize))
        throw "nFreqs must be 2^x+1, e.g., 5, 9 or 17";
      this.bitSize = bitSize;
      this.sampleRate = sampleRate;
      this.fftSize = fftSize2;
      this.toneRate = toneRate2;
      this.sampleLenMsec = this.fftSize / this.sampleRate * 1e3;
      this.toneLenMsec = 1e3 / this.toneRate;
      this.symFreqs = [];
      for (let i = 0; i < nFreqs2; ++i)
        this.symFreqs.push(baseFreq2 + freqStep2 * i);
      this.stencils = [];
      for (const freq of this.symFreqs)
        this.stencils.push(new ToneStencil(freq, sampleRate, fftSize2));
    }
    detecToneAt(spectra2, msec) {
      const ixAt = Math.round(msec / this.sampleLenMsec);
      const tone0 = detectTone(spectra2[ixAt - 1], this.stencils);
      const tone1 = detectTone(spectra2[ixAt], this.stencils);
      const tone2 = detectTone(spectra2[ixAt + 1], this.stencils);
      if (tone0 == tone1 || tone0 == tone2)
        return tone0;
      if (tone1 == tone2)
        return tone1;
      return -1;
    }
    findStartMsec(spectra2) {
      let firstMatchIx = -1, lastMatchIx = -1;
      for (let ix0 = 0; ix0 < spectra2.length; ++ix0) {
        const msec0 = ix0 * this.sampleLenMsec;
        const ix1 = Math.round((msec0 + this.toneLenMsec) / this.sampleLenMsec);
        const ix2 = Math.round((msec0 + 2 * this.toneLenMsec) / this.sampleLenMsec);
        const ix3 = Math.round((msec0 + 3 * this.toneLenMsec) / this.sampleLenMsec);
        if (ix3 > spectra2.length - 1)
          break;
        const tone0 = detectTone(spectra2[ix0], this.stencils);
        const tone1 = detectTone(spectra2[ix1], this.stencils);
        const tone2 = detectTone(spectra2[ix2], this.stencils);
        const tone3 = detectTone(spectra2[ix3], this.stencils);
        if (tone0 == this.symFreqs.length - 1 && tone1 == 0 && tone2 == this.symFreqs.length - 1 && tone3 == 0) {
          if (firstMatchIx == -1) {
            firstMatchIx = lastMatchIx = ix0;
          } else
            lastMatchIx = ix0;
        } else if (firstMatchIx != -1)
          break;
      }
      if (firstMatchIx == -1)
        return -1;
      const midMatchIx = Math.round((firstMatchIx + lastMatchIx) / 2);
      return Math.floor(midMatchIx * this.sampleLenMsec);
    }
  };
  var v1 = null;
  function detectTone(spectrum, stencils) {
    if (!v1 || v1.length != stencils.length)
      v1 = new Float32Array(stencils.length);
    for (let i = 0; i < v1.length; ++i)
      v1[i] = 0;
    for (let toneIx = 0; toneIx < stencils.length; ++toneIx) {
      const stencil = stencils[toneIx];
      for (const binIx of stencil.bins)
        v1[toneIx] += spectrum[binIx];
    }
    let maxVal = Number.MIN_VALUE, maxIx = -1;
    for (let i = 0; i < v1.length; ++i) {
      if (v1[i] > maxVal) {
        maxVal = v1[i];
        maxIx = i;
      }
    }
    let restSum = 0;
    for (let i = 0; i < v1.length; ++i) {
      if (i != maxIx)
        restSum += v1[i];
    }
    let ratio = maxVal / restSum;
    if (ratio >= 0.1)
      return maxIx;
    else
      return -1;
  }
  var Block = class {
    constructor(startTonePos, nTones, bytes, crc) {
      this.startTonePos = startTonePos;
      this.nTones = nTones;
      this.bytes = bytes;
      this.ascii = getAscii(bytes);
      this.crc = crc;
      this.valid = crc == getCRC8(bytes);
    }
  };
  var Decoder = class {
    constructor(tones2) {
      this.tones = tones2;
      this.blocks = decode(tones2);
      this.bytes = catBytes(this.blocks);
      this.ascii = catAscii(this.blocks);
      this.valid = true;
      for (const block of this.blocks)
        if (!block.valid)
          this.valid = false;
    }
  };
  function getAscii(bytes) {
    let res = "";
    for (const b of bytes) {
      res += String.fromCodePoint(b);
    }
    return res;
  }
  function catBytes(blocks) {
    const bytes = [];
    for (const block of blocks) {
      bytes.push(...block.bytes);
    }
    return bytes;
  }
  function catAscii(blocks) {
    let str = "";
    for (const block of blocks) {
      str += block.ascii;
    }
    return str;
  }
  function decode(tones2) {
    const blocks = [];
    if (tones2.length < 14)
      return blocks;
    if (tones2[0] != 8 || tones2[1] != 0 || tones2[2] != 8 || tones2[3] != 0)
      return blocks;
    let ix = 4;
    while (true) {
      const endIx = getBlockEndIx(tones2, ix);
      if (endIx == -1)
        break;
      blocks.push(decodeBlock(tones2.slice(ix, endIx)));
      ix = endIx;
    }
    return blocks;
  }
  var toneBits = [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1]
  ];
  function getToneBits(tone) {
    return toneBits[tone % 8];
  }
  function decodeBlock(tones2, start, end) {
    const seq = tones2.slice(start, end);
    const bits = [];
    for (let i = 0; i < seq.length - 5; ++i)
      bits.push(...getToneBits(seq[i]));
    const crcBits = [
      ...getToneBits(seq[seq.length - 4]),
      ...getToneBits(seq[seq.length - 3]),
      ...getToneBits(seq[seq.length - 2])
    ];
    const bytes = getBytes(bits);
    const crcBytes = getBytes(crcBits);
    return new Block(start, end - start, bytes, crcBytes[0]);
  }
  function getBytes(bits) {
    const res = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      let val = 0;
      for (let j = 0; j < 8; ++j) {
        val <<= 1;
        val += bits[i + j];
      }
      res.push(val);
    }
    return res;
  }
  function getBlockEndIx(tones2, startIx) {
    for (let i = startIx + 4; i < tones2.length; ++i) {
      if (tones2[i] == 8 && tones2[i - 4] == 8) {
        return i + 1;
      }
    }
    return -1;
  }
  function getCRC8(bytes) {
    let crc = 0;
    for (const b of bytes)
      crc = updateCRC(b, crc);
    return crc;
    function updateCRC(nextByte, crc2) {
      for (let j = 0; j < 8; j++) {
        let mix = (crc2 ^ nextByte) & 1;
        crc2 >>= 1;
        if (mix)
          crc2 ^= 140;
        nextByte >>= 1;
      }
      return crc2;
    }
  }

  // src/base64.js
  function toBase64(bytes) {
    let base64 = "";
    let encodings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let byteLength = bytes.length;
    let byteRemainder = byteLength % 3;
    let mainLength = byteLength - byteRemainder;
    let a, b, c, d;
    let chunk;
    for (let i = 0; i < mainLength; i = i + 3) {
      chunk = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
      a = (chunk & 16515072) >> 18;
      b = (chunk & 258048) >> 12;
      c = (chunk & 4032) >> 6;
      d = chunk & 63;
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }
    if (byteRemainder == 1) {
      chunk = bytes[mainLength];
      a = (chunk & 252) >> 2;
      b = (chunk & 3) << 4;
      base64 += encodings[a] + encodings[b] + "==";
    } else if (byteRemainder == 2) {
      chunk = bytes[mainLength] << 8 | bytes[mainLength + 1];
      a = (chunk & 64512) >> 10;
      b = (chunk & 1008) >> 4;
      c = (chunk & 15) << 2;
      base64 += encodings[a] + encodings[b] + encodings[c] + "=";
    }
    let res = "";
    for (let i = 0; i < base64.length; ++i) {
      if (i > 0 && i % 76 == 0)
        res += "\n";
      res += base64[i];
    }
    return res;
  }

  // src/app.js
  var audioFile = "data-be-03.wav";
  var stopAtEnd = true;
  var gainVal = 10;
  var toneRate = 64 / 3;
  var baseFreq = 2500;
  var freqStep = 250;
  var nFreqs = 9;
  var fftSize = 512;
  var elmBtnRecord;
  var elmDownloadRec;
  var elmDownloadSamples;
  var elmDecoded;
  var elmCanvas;
  var elmBtnPlay;
  var elmBtnAnalyze;
  var elmStencil;
  var audioCtx;
  var gain;
  var buffer;
  var source;
  var scriptNode;
  var encoder;
  var isPlaying = false;
  var fftAnalyzer;
  var spectra;
  var dem;
  var startMsec;
  var tones;
  document.addEventListener("DOMContentLoaded", () => {
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
    if (!audioCtx) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
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
        };
      }).catch((err) => {
        console.error(`Error from getUserMedia(): ${err}`);
      });
      return;
    }
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
      if (downloadText.length > 0)
        downloadText += "\n";
      downloadText += line;
    }
    const fileName = "spectra.txt";
    const data = [downloadText];
    const properties = { type: "text/plain" };
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
    req.open("GET", audioFile, true);
    req.responseType = "arraybuffer";
    req.onload = function() {
      const audioData = req.response;
      audioCtx.decodeAudioData(audioData).then((buf) => {
        buffer = buf;
        elmBtnPlay.style.display = "inline";
        elmBtnAnalyze.style.display = "inline";
      }).catch((err) => {
        console.log("Error decoding audio data: " + err.err);
      });
    };
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
      nFreqs
    });
    startMsec = dem.findStartMsec(spectra);
    const recLen = Math.round(buffer.length / buffer.sampleRate * 1e3);
    elmDecoded.innerText = "Start detected at " + startMsec + " (total length: " + recLen + ")\n";
    tones = [];
    let endDetected = false;
    if (startMsec != -1) {
      for (let i = 0; !stopAtEnd || !endDetected; ++i) {
        const msec = startMsec + dem.toneLenMsec * i;
        if (msec + 200 > recLen)
          break;
        const tone = dem.detecToneAt(spectra, msec);
        tones.push(tone);
        if (doesEndInEOM(tones, dem.symFreqs.length - 1))
          endDetected = true;
      }
      if (!endDetected) {
        elmDecoded.innerText += "No EOM found\n";
      }
      elmDecoded.innerText += "======================================================\n";
      for (let i = 0; i < tones.length; ++i) {
        if (i == 4)
          elmDecoded.innerText += ",\n";
        else if ((i - 4) % 45 == 0)
          elmDecoded.innerText += ",\n";
        else if (i > 0)
          elmDecoded.innerText += ", ";
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
  function doesEndInEOM(tones2, signaToneIx) {
    if (tones2.length < 3)
      return false;
    for (let i = 0; i < 3; ++i) {
      if (tones2[tones2.length - i - 1] != signaToneIx)
        return false;
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
      if (isPlaying)
        playOver();
    });
    if (fftAnalyzer)
      fftAnalyzer.disconnect();
    fftAnalyzer = new FFTAnalyzer(buffer.sampleRate, fftSize);
    fftAnalyzer.connect(audioCtx, gain);
    elmBtnPlay.innerText = "Stop";
    isPlaying = true;
  }
  function onAnalyze() {
    if (fftAnalyzer)
      fftAnalyzer.disconnect();
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
    if (!spectra)
      return;
    drawOutput();
    if (elmStencil.checked)
      drawStencil(dem, tones, startMsec);
  }
  function drawStencil(dec, tones2, startMsec2) {
    const w = spectra.length;
    const h = dec.fftSize / 2;
    const ctx = elmCanvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < tones2.length; ++i) {
      const x1 = Math.round((startMsec2 + dec.toneLenMsec * (i - 0.5)) / dec.sampleLenMsec);
      const x2 = Math.round((startMsec2 + dec.toneLenMsec * (i + 0.5)) / dec.sampleLenMsec);
      const toneIx = tones2[i];
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
    function drawRect(x, y, w2, h2) {
      for (let i = x; i < x + w2; ++i) {
        setPixel(imgData, i, y, 128, 128, 255);
        setPixel(imgData, i, y + h2 - 1, 128, 128, 255);
      }
      for (let i = y; i < y + h2; ++i) {
        setPixel(imgData, x, i, 128, 128, 255);
        setPixel(imgData, x + w2 - 1, i, 128, 128, 255);
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
})();
//# sourceMappingURL=app.js.map
