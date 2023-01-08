const bufferSize = 1024;

class FFTAnalyzer {

  constructor(audioCtx, inputNode, sampleRate) {
    this.audioCtx = audioCtx;
    this.inputNode = inputNode;
    this.sampleRate = sampleRate;
    this.fft = new FFT(bufferSize, sampleRate);
    this.procFun = (evt) => this.process(evt);
    this.processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    this.processor.addEventListener("audioprocess", this.procFun);
    inputNode.connect(this.processor);

    this.spectra = [];
  }

  disconnect() {
    this.processor.removeEventListener("audioprocess", this.procFun);
    this.inputNode.disconnect(this.proc);
  }

  process(evt) {
    this.fft.forward(evt.inputBuffer.getChannelData(0));
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
      msec += bufferSize / this.sampleRate * 1000;
      samples.push(sample);
    }
    return samples;
  }
}

export {FFTAnalyzer}

