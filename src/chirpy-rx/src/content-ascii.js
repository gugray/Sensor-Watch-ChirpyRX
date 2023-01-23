function interpretAscii(bytes, elmRes, elmLnk) {

  let canBeAscii = true;
  for (const b of bytes)
    if (b == 0 || b > 127) canBeAscii = false;
  if (!canBeAscii) return false;

  let ascii = "";
  for (const b of bytes) {
    ascii += String.fromCodePoint(b);
  }

  elmRes.innerHTML = "<pre></pre>";
  elmRes.querySelector("pre").innerText = ascii;
  elmLnk.innerText = "ASCII";
  return true;
}

export {interpretAscii}
