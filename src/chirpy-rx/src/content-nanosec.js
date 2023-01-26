import {decodeDateTime, dateToIso} from "./content-shared.js";

function interpretNanosecIni(bytes, elmRes, elmLnk) {

  if (bytes.length < 18 + 2 || bytes[0] != 0xc0 || bytes[1] != 0x00)
    return false;

  const info = new DecodedNanosecIni(bytes.slice(2, bytes.length));
  let txt = "";
  txt += "Correction profile:     " + info.correctionProfile + " (" + info.correctionPorfileStr + ")\n";
  txt += "Frequency correction:   " + (info.freqCorrection / 100).toFixed(2) + "\n";
  txt += "Center temperature:     " + (info.centerTemperature / 100).toFixed(2) + "\n";
  txt += "Quadratic temp coeff:  -" + info.quadraticTempCo + "e-5\n";
  txt += "Cubic temp coeff:       " + info.cubicTempCo + "e-7\n";
  txt += "Correction cadence:     " + info.correctionCadence + "\n";
  txt += "Last correction time:   " + dateToIso(info.lastCorrectionTime) + "\n";
  txt += "Annual aging:           " + (info.annualAgingPPA / 100).toFixed(2) + " PPA\n";

  elmRes.innerHTML = "<pre></pre>";
  elmRes.querySelector("pre").innerText = txt;
  elmLnk.innerText = "Nanosec.ini";
  return true;

}

// int8_t correction_profile;
// int16_t freq_correction; // Static correction - multiplied by 100
// int16_t center_temperature; // Multiplied by 100, +25.0 -> +2500
// int16_t quadratic_tempco; // 0.034 -> 3400, multiplied by 100000. Stored positive, used as negative.
// int16_t cubic_tempco; // default 0, 0.000136 -> 1360, multiplied by 10000000. Stored positive, used positive.
// int8_t correction_cadence;
// uint32_t last_correction_time; // Not used at the moment - but will in the future
// int16_t aging_ppm_pa; // multiplied by 100. Aging per year.

class DecodedNanosecIni {
  constructor(bytes) {
    this.correctionProfile = bytes[0];
    this.correctionPorfileStr = profiles[this.correctionProfile];
    this.freqCorrection = (bytes[3] << 8) + bytes[2];
    this.centerTemperature = (bytes[5] << 8) + bytes[4];
    this.quadraticTempCo = (bytes[7] << 8) + bytes[6];
    this.cubicTempCo = (bytes[9] << 8) + bytes[8];
    this.correctionCadence = bytes[10];
    const lastCurrTimeUnix = (bytes[15] << 24) + (bytes[14] << 16) + (bytes[13] << 8) + bytes[12];
    this.lastCorrectionTime = new Date(lastCurrTimeUnix * 1000);
    this.annualAgingPPA = (bytes[17] << 8) + bytes[16];
  }
}

const profiles = [
  "static hardware correction",
  "static correction with dithering",
  "datasheet quadratic correction",
  "cubic correction conservative",
  "cubic correction finetuned",
];

export {interpretNanosecIni}
