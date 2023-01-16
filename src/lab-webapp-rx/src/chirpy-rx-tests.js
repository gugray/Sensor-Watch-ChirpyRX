import {Block, Decoder} from "./chirpy-rx.js";

function testDecode(tones, exBlockValidities, expectedBytes) {
  const dec = new Decoder(tones);
  if (dec.blocks.length != exBlockValidities.length) {
    console.error("Expected " + exBlockValidities.length + " block(s)");
  }
  for (let i = 0; i < dec.blocks.length; ++i) {
    if (dec.blocks[i].valid != exBlockValidities[i]) {
      if (dec.blocks[i].val)
        console.error("Block " + i + " is valid, but should be invalid");
      else
        console.error("Block " + i + " is invalid, but should be valid");
    }
  }
  if (!arrayEq(dec.bytes, expectedBytes))
    console.error("Decoded bytes different from expected");
}

function arrayEq(arr1, arr2) {
  if (arr1.length != arr2.length) return false;
  for (let i = 0; i < arr1.length; ++i)
    if (arr1[i] != arr2[i]) return false;
  return true;
}

function tryTest(fun) {
  try {
    fun();
  }
  catch (ex) {
    console.error("Test failed with exception: " + ex);
  }
}

function runChirpyRxTests() {

  // Happy cases
  const tones02 = [8, 0, 8, 0, 0, 0, 0, 8, 0, 0, 0, 8, 8, 8];
  const exb02 = [0x00];

  const tones03 = [8, 0, 8, 0, 3, 2, 0, 8, 5, 1, 6, 8, 8, 8];
  const exb03 = [0x68];

  const tones04 = [8, 0, 8, 0, 3, 2, 0, 6, 2, 5, 5, 6, 8, 2, 7, 6, 8, 8, 8];
  const exb04 = [0x68, 0x65, 0x6e];

  const tones05 = [8, 0, 8, 0, 3, 2, 0, 6, 2, 5, 5, 6, 8, 2, 7, 6, 8, 2, 3, 6, 8, 0, 1, 6, 8, 8, 8];
  const exb05 = [0x68, 0x65, 0x6e, 0x4f];

  tryTest(() => testDecode(tones02, [true], exb02));
  tryTest(() => testDecode(tones03, [true], exb03));
  tryTest(() => testDecode(tones04, [true], exb04));
  tryTest(() => testDecode(tones05, [true, true], exb05));

  // Fail cases
  const tonesX1 = [1, 0, 8, 0, 0, 0, 0, 8, 0, 0, 0, 8, 8, 8];
  const exbX1 = [];

  const tonesX2 = [8, 0, 8, 0, 0, 0, 0, 8, 0, 0, 0, 1, 8, 8];
  const exbX2 = [];

  const tonesX3 = [8, 0, 8, 0, 3, 2, 0, 6, 2, 5, 5, 6, 8, 2, 8, 6, 8, 2, 3, 6, 8, 0, 1, 6, 8, 8, 8];
  const exbX3 = [0x68, 0x65, 0x6e, 0x4f];

  const tonesX4 = [8, 0, 8, 0, 3, 2, 0, 6, 2, 5, 5, 6, 8, 2, 8, 6, 8, 2, 3, 6, 0, 0, 1, 6, 8, 8, 8];
  const exbX4 = [0x68, 0x65, 0x6e];

  tryTest(() => testDecode(tonesX1, [], exbX1));
  tryTest(() => testDecode(tonesX2, [], exbX2));
  tryTest(() => testDecode(tonesX3, [false, true], exbX3));
  tryTest(() => testDecode(tonesX4, [false], exbX4));


}

export {runChirpyRxTests};
