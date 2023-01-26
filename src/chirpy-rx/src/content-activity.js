import {decodeDateTime, dateToIso} from "./content-shared.js";

function interpretActivity(bytes, elmRes, elmLnk) {

  if (bytes.length <= 2 || bytes[0] != 0x27 || bytes[1] != 0x00)
    return false;

  const itmLen = 9;
  const items = [];
  for (let ix = 2; ix < bytes.length; ix += itmLen) {
    const itmBytes = bytes.slice(ix, ix + itmLen);
    items.push(new DecodedActivity(itmBytes));
  }
  let tableTxt = "time\tactivity_code\tactivity_name\ttotal_duration\tpause_duration\n";
  for (const itm of items) {
    tableTxt += dateToIso(itm.start) + "\t" + itm.typeNum + "\t" + itm.type + "\t";
    tableTxt += secsToDuration(itm.totalSec) + "\t" + secsToDuration(itm.pauseSec);
    tableTxt += "\n";
  }
  elmRes.innerHTML = "<pre></pre>";
  elmRes.querySelector("pre").innerText = tableTxt;
  elmLnk.innerText = "Activity";
  return true;
}

class DecodedActivity {
  constructor(bytes) {
    // watch_date_time start_time;
    // uint16_t total_sec;
    // uint16_t pause_sec;
    // uint8_t activity_type;

    this.start = decodeDateTime(bytes);
    this.totalSec = bytes[4] * 256 + bytes[5];
    this.pauseSec = bytes[6] * 256 + bytes[7];
    this.typeNum = bytes[8];
    this.type = "UNKNOWN";
    if (this.typeNum < activities.length)
      this.type = activities[this.typeNum];
  }
}

const activities = ["BIKE", "WALK", "RUN", "DANCE", "YOGA", "CROSSFIT", "SWIM",
  "ELLIPTICAL", "GYM", "ROW", "SOCCER", "FOOTBALL", "BALLGAME", "SKI",
];

function secsToDuration(val) {
  let secs = val % 60;
  val -= secs;
  val /= 60;
  let mins = val % 60;
  val -= mins;
  let hours = val / 60;
  let res = mins.toString().padStart(2, "0") + ":" + secs.toString().padStart(2, "0");
  if (hours == 0) return res;
  res = hours.toString() + ":" + res;
  return res;
}


export {interpretActivity}
