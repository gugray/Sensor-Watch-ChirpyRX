class ToneStencil {
  constructor(freq, sampleRate, fftSize) {
    this.freq = freq;
    this.bins = getBins(freq, sampleRate, fftSize, true);
  }
}

function getBins(freq, sampleRate, fftSize, multiple = false) {
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

class Demodulator {

  constructor({sampleRate, fftSize, toneRate, baseFreq, freqStep, nFreqs}) {

    const bitSize = Math.log(nFreqs - 1) / Math.log(2);
    if (bitSize != Math.round(bitSize))
      throw "nFreqs must be 2^x+1, e.g., 5, 9 or 17";

    this.bitSize = bitSize;
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.toneRate = toneRate;
    this.sampleLenMsec = this.fftSize / this.sampleRate * 1000;
    this.toneLenMsec = 1000 / this.toneRate;

    this.symFreqs = [];
    for (let i = 0; i < nFreqs; ++i)
      this.symFreqs.push(baseFreq + freqStep * i);

    this.stencils = [];
    for (const freq of this.symFreqs)
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
      if (tone0 == this.symFreqs.length - 1 && tone1 == 0 &&
          tone2 == this.symFreqs.length - 1 && tone3 == 0) {
        if (firstMatchIx == -1) {
          firstMatchIx = lastMatchIx = ix0;
        }
        else lastMatchIx = ix0;
      }
      else if (firstMatchIx != -1) break;
    }

    if (firstMatchIx == -1) return -1;
    const midMatchIx = Math.round((firstMatchIx + lastMatchIx) / 2);
    return Math.floor(midMatchIx * this.sampleLenMsec);
  }

}

let v1 = null;

function detectTone(spectrum, stencils) {

  if (!v1 || v1.length != stencils.length)
    v1 = new Float32Array(stencils.length);

  for (let i = 0; i < v1.length; ++i) v1[i] = 0;

  // At each position, sum up values in spectrum from the slots defined by the stencil
  // This is the strength of each tone as viewed through the stencil
  for (let toneIx = 0; toneIx < stencils.length; ++toneIx) {
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

class Block {
  constructor(startTonePos, nTones, bytes, crc) {
    this.startTonePos = startTonePos;
    this.nTones = nTones;
    this.bytes = bytes;
    this.ascii = getAscii(bytes);
    this.crc = crc;
    this.valid = crc == getCRC8(bytes);
  }
}

class Decoder {
  constructor(tones) {
    this.tones = tones;
    this.blocks = decode(tones);
    this.bytes = catBytes(this.blocks);
    this.ascii = catAscii(this.blocks);
    this.valid = true;
    for (const block of this.blocks)
      if (!block.valid)
        this.valid = false;
  }
}

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

function decode(tones) {
  const blocks = [];
  // Single-byte transmission is 14 tones
  if (tones.length < 14) return blocks;
  // Start sequence
  if (tones[0] != 8 || tones[1] != 0 || tones[2] != 8 || tones[3] != 0) return blocks;
  // Go block by block
  let ix = 4;
  while (true) {
    const endIx = getBlockEndIx(tones, ix);
    if (endIx == -1) break;
    const block = decodeBlock(tones.slice(ix, endIx));
    block.startTonePos = ix;
    block.nTones = endIx - ix;
    blocks.push(block);
    ix = endIx;
  }
  return blocks;
}

const toneBits = [
  [0, 0, 0],
  [0, 0, 1],
  [0, 1, 0],
  [0, 1, 1],
  [1, 0, 0],
  [1, 0, 1],
  [1, 1, 0],
  [1, 1, 1],
];

function getToneBits(tone) {
  // For wrong tones (interim 8s): don't crash
  // We hope that CRC will catch this
  return toneBits[tone % 8];
}

function decodeBlock(tones, start, end) {

  const seq = tones.slice(start, end);

  const bits = [];
  for (let i = 0; i < seq.length - 5; ++i)
    bits.push(...getToneBits(seq[i]));
  const crcBits = [
    ...getToneBits(seq[seq.length-4]),
    ...getToneBits(seq[seq.length-3]),
    ...getToneBits(seq[seq.length-2]),
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

function getBlockEndIx(tones, startIx) {
  // Find next 8NNN8
  for (let i = startIx + 4; i < tones.length; ++i) {
    if (tones[i] == 8 && tones[i -4] == 8) {
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

  function updateCRC(nextByte, crc) {
    for (let j = 0; j < 8; j++) {
      let mix = (crc ^ nextByte) & 0x01;
      crc >>= 1;
      if (mix)
        crc ^= 0x8C;
      nextByte >>= 1;
    }
    return crc;
  }
}

export {ToneStencil, Demodulator, Block, Decoder}
