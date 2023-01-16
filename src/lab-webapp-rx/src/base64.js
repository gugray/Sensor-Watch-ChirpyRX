// With love from https://gist.github.com/jonleighton/958841
// Copyright 2011 Jon Leighton
// MIT license
function toBase64(bytes) {
  let base64 = '';
  let encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let byteLength = bytes.length;
  let byteRemainder = byteLength % 3;
  let mainLength = byteLength - byteRemainder;
  let a, b, c, d;
  let chunk;
  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63;               // 63       = 2^6 - 1
    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }
  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3   = 2^2 - 1
    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4
    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15    = 2^4 - 1
    base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }
  let res = "";
  for (let i = 0; i < base64.length; ++i) {
    if (i > 0 && (i % 76) == 0) res += "\n";
    res += base64[i];
  }
  return res;
}

// With love from https://github.com/danguer/blog-examples/blob/master/js/base64-binary.js
// Copyright 2011, Daniel Guerrero
function fromBase64(input, uarray, offset) {
  const encodings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  //get last chars to see if are valid
  input = removePaddingChars(input);
  input = removePaddingChars(input);
  let bytes = parseInt((input.length / 4) * 3, 10);
  let chr1, chr2, chr3;
  let enc1, enc2, enc3, enc4;
  let i = 0;
  let j = 0;
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
  for (i = 0; i < bytes; i += 3) {
    //get the 3 octects in 4 ascii chars
    enc1 = encodings.indexOf(input.charAt(j++));
    enc2 = encodings.indexOf(input.charAt(j++));
    enc3 = encodings.indexOf(input.charAt(j++));
    enc4 = encodings.indexOf(input.charAt(j++));
    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;
    uarray[i + offset] = chr1;
    if (enc3 != 64) uarray[i + 1 + offset] = chr2;
    if (enc4 != 64) uarray[i + 2 + offset] = chr3;
  }
}

export {fromBase64, toBase64};
