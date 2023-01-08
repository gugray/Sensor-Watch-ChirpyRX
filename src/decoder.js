import {symFreqs} from "./freqConsts.js";

class ToneStencil {
  constructor(freq, sampleRate, fftSize) {
    this.freq = freq;
    this.bins = getBins(freq, sampleRate, fftSize);
    if (freq == symFreqs[0] || freq == symFreqs[symFreqs.length - 2]) {
      this.bins.push(...getBins(freq * 3, sampleRate, fftSize, false));
    }
  }
}

function getBins(freq, sampleRate, fftSize, multiple) {
  const bandwidth = sampleRate / fftSize;
  let midIx = -1;
  for (let i = 0; i < fftSize / 2; ++i) {
    if (freq > i * bandwidth && freq <= (i+1) * bandwidth) {
      midIx = i;
      break;
    }
  }
  if (multiple) return [midIx - 1, midIx, midIx + 1];
  else return [midIx];
}

class Decoder {

  constructor(sampleRate, fftSize, toneRate) {

    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.toneRate = toneRate;
    this.sampleLenMsec = this.fftSize / this.sampleRate * 1000;
    this.toneLenMsec = 1000 / this.toneRate;


    this.stencils = [];
    for (const freq of symFreqs)
      this.stencils.push(new ToneStencil(freq, sampleRate, fftSize));
  }

  detecToneAt(spectra, msec) {
    const ixAt = Math.round(msec / this.sampleLenMsec);
    const tone0 = detectTone(spectra[ixAt-1], this.stencils);
    const tone1 = detectTone(spectra[ixAt], this.stencils);
    const tone2 = detectTone(spectra[ixAt+1], this.stencils);
    if (tone0 == tone1 || tone0 == tone2) return tone0;
    if (tone1 == tone2) return tone1;
    return -1;
  }

  findStartMsec(spectra) {

    let firstMatchIx = -1, lastMatchIx = -1;
    for (let ix0 = 0; ix0 < spectra.length; ++ix0) {
      const msec0 = ix0 * this.sampleLenMsec;
      const ix1 = Math.round((msec0 + this.toneLenMsec) / this.sampleLenMsec);
      const ix2 = Math.round((msec0 + 2 * this.toneLenMsec) / this.sampleLenMsec);
      const ix3 = Math.round((msec0 + 3 * this.toneLenMsec) / this.sampleLenMsec);
      if (ix3 > spectra.length - 1) break;
      const tone0 = detectTone(spectra[ix0], this.stencils);
      const tone1 = detectTone(spectra[ix1], this.stencils);
      const tone2 = detectTone(spectra[ix2], this.stencils);
      const tone3 = detectTone(spectra[ix3], this.stencils);
      if (tone0 == 17 && tone1 == 16 && tone2 == 17 && tone3 == 16) {
        if (firstMatchIx == -1) {
          firstMatchIx = lastMatchIx = ix0;
        }
        else lastMatchIx = ix0;
      }
      else if (firstMatchIx != -1) break;
    }
    // console.log([firstMatchIx, lastMatchIx]);

    if (firstMatchIx == -1) return -1;
    const midMatchIx = Math.round((firstMatchIx + lastMatchIx) / 2);
    return Math.round(midMatchIx * this.sampleLenMsec);
  }

}

const v1 = new Float32Array(symFreqs.length);

function detectTone(spectrum, stencils) {

  for (let i = 0; i < v1.length; ++i) v1[i] = 0;

  // At each position, sum up values in spectrum from the slots defined by the stencil
  // This is the strength of each tone as viewed through the stencil
  for (let toneIx = 0; toneIx < symFreqs.length; ++toneIx) {
    const stencil = stencils[toneIx];
    for (const binIx of stencil.bins)
      v1[toneIx] += spectrum[binIx];
  }

  // Find index of strongest tone
  let maxVal = Number.MIN_VALUE, maxIx = -1;
  for (let i = 0; i < v1.length; ++i) {
    if (v1[i] > maxVal) {
      maxVal = v1[i];
      maxIx = i;
    }
  }

  // Sum up other values
  let restSum = 0;
  for (let i = 0; i < v1.length; ++i) {
    if (i != maxIx)
      restSum += v1[i];
  }

  // Check if highest band is sufficiently stronger than others
  let ratio = maxVal / restSum;
  if (ratio >= 0.1) return maxIx;
  else return -1;
}

export {ToneStencil, Decoder}
