import {interpretActivity} from "./content-activity.js";
import {interpretNanosecIni} from "./content-nanosec.js";
import {interpretAscii} from "./content-ascii.js";

const parserFuns = [
  interpretActivity,
  interpretNanosecIni,
  interpretAscii,
];

function interpretContent(bytes, elmRes, elmLnk) {
  for (const fun of parserFuns) {
    if (fun(bytes, elmRes, elmLnk))
      return true;
  }
  return false;
}

export {interpretContent}
