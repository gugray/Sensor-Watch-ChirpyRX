class FFTAnalyzer {

  constructor(sampleRate, fftSize) {
    this.fftSize = fftSize;
    this.sampleRate = sampleRate;
    this.fft = new FFT(fftSize, sampleRate);
    this.spectra = [];
  }

  connect(audioCtx, inputNode) {
    this.audioCtx = audioCtx;
    this.inputNode = inputNode;
    this.procFun = (evt) => this.processEvent(evt);
    this.processor = audioCtx.createScriptProcessor(this.fftSize, 1, 1);
    this.processor.addEventListener("audioprocess", this.procFun);
    inputNode.connect(this.processor);
  }

  disconnect() {
    this.processor.removeEventListener("audioprocess", this.procFun);
    this.inputNode.disconnect(this.proc);
  }

  processEvent(evt) {
    this.processData((evt.inputBuffer.getChannelData(0)));
  }

  processData(data) {
    this.fft.forward(data);
    let s = new Float32Array(this.fft.spectrum.length);
    for (let i = 0; i < s.length; ++i) s[i] = this.fft.spectrum[i];
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
      msec += this.fftSize / this.sampleRate * 1000;
      samples.push(sample);
    }
    return samples;
  }
}

export {FFTAnalyzer}

