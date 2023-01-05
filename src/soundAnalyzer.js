import {notes} from "./notes.js";

const scale = ["B3", "D4", "F4", "A4", "C5", "E5", "G5", "B5", "D6", "F6", "A6", "C7", "E7", "G7", "B7", "D8", "F8", "A8"];
const tickMsec = 5;

class SoundAnalyzer {

  constructor(maxDecibels = -35, minDecibels = -80, filterQ = 1) {

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.mic = null;
    this.gain = this.audioCtx.createGain();
    this.freqNodes = [];
    this.analyzing = false;
    this.firstTick = 0;
    this.samples = [];
    this.arr = new Uint8Array(16); // Frequency bin count of analyzers ~ smallest possible

    for (let i = 0; i < scale.length; ++i) {
      const note = scale[i];
      const freq = notes[note];
      const filter = new BiquadFilterNode(this.audioCtx, { type: "bandpass" });
      filter.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      filter.Q.setValueAtTime(filterQ, this.audioCtx.currentTime);
      this.gain.connect(filter);
      const analyser = new AnalyserNode(this.audioCtx, {
        fftSize: 32,
        maxDecibels: maxDecibels,
        minDecibels: minDecibels,
        smoothingTimeConstant: 0,
      });
      filter.connect(analyser);
      this.freqNodes.push([filter, analyser]);
    }
  }

  start(ready) {
    navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
      this.mic = this.audioCtx.createMediaStreamSource(stream);
      this.mic.connect(this.gain);
      this.analyzing = true;
      this.firstTick = Date.now();
      setTimeout(() => tick(this), tickMsec);
      ready(true);
    }).catch((err) => {
      console.error(`Error from getUserMedia(): ${err}`);
      ready(false);
    });
  }

  finish() {
    this.analyzing = false;
    this.mic.disconnect(this.gain);
    const res = [];
    for (const sample of this.samples)
      res.push(sample);
    return res;
  }
}

function tick(sa) {

  if (!sa.analyzing) return;
  setTimeout(() => tick(sa), tickMsec);
  const msec = Date.now() - sa.firstTick;

  let sample = "";
  let maxIx = -1, maxVal = -1;
  for (let i = 0; i < sa.freqNodes.length; ++i) {
    const analyser = sa.freqNodes[i][1];
    const vol = getVolume(analyser);
    const str = vol.toString(16).padStart(2, "0");
    sample += " " + str;
    if (vol > maxVal) [maxIx, maxVal] = [i, vol];
  }
  sample = maxIx.toString().padStart(2, " ") + " > " + sample;
  sample = msec.toString().padEnd(8, " ") + sample;
  sa.samples.push(sample);

  function getVolume(analyser) {
    analyser.getByteFrequencyData(sa.arr);
    let val = 0;
    for (let i = 0; i < analyser.frequencyBinCount; ++i) {
      val += sa.arr[i];
    }
    val /= analyser.frequencyBinCount;
    return Math.round(val);
  }
}


export {SoundAnalyzer}

