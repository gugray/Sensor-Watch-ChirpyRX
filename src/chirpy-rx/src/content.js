import {interpretAscii} from "./content-ascii.js";
import {interpretActivity} from "./content-activity.js";

const parserFuns = [
  interpretActivity,
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
