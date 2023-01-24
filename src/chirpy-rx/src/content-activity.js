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
    // --
    // uint32_t second : 6;    // 0-59
    // uint32_t minute : 6;    // 0-59
    // uint32_t hour : 5;      // 0-23
    // uint32_t day : 5;       // 1-31
    // uint32_t month : 4;     // 1-12
    // uint32_t year : 6;      // 0-63 (representing 2020-2083)
    // --
    // uint16_t total_sec;
    // uint16_t pause_sec;
    // uint8_t activity_type;

    // bytes = [0x0f, 0x31, 0x05, 0xf2, 0x00, 0x4a, 0x00, 0x00, 0x00];
    // 000011110011000100000101111100100000000001001010000000000000000000000000
    // 000011 1100 11000 10000 010111 110010
    // YYYYYY MMMM DDDDD HHHHH MMMMMM SSSSSS
    // 765432 1076 54321 07654 321076 543210
    //      3   12    24    16     23     50

    let year = (bytes[0] & 0b11111100) >> 2;
    year += 2020;
    let month = ((bytes[0] & 0b00000011) << 2) + ((bytes[1] & 0b11000000) >> 6);
    let day = (bytes[1] & 0b00111110) >> 1;
    let hour = ((bytes[1] & 0b00000001) << 4) + ((bytes[2] & 0b11110000) >> 4);
    let minute = ((bytes[2] & 0b00001111) << 2) + ((bytes[3] & 0b11000000) >> 6);
    let second = (bytes[3] & 0b00111111);
    this.start = new Date(year, month - 1, day, hour, minute, second);
    this.totalSec = bytes[4] * 256 + bytes[5];
    this.pauseSec = bytes[6] * 256 + bytes[7];
    this.typeNum = bytes[8];
    this.type = "UNKNOWN";
    const activities = ["BIKE", "WALK", "RUN", "DANCE", "YOGA", "CROSSFIT", "SWIM",
      "ELLIPTICAL", "GYM", "ROW", "SOCCER", "FOOTBALL", "BALLGAME", "SKI",
    ];
    if (this.typeNum < activities.length)
      this.type = activities[this.typeNum];
  }
}

function dateToIso(date) {
  // 2012-01-01T00:00:00
  let res = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-";
  res += date.getDate().toString().padStart(2, "0") + "T";
  res += date.getHours().toString().padStart(2, "0") + ":";
  res += date.getMinutes().toString().padStart(2, "0") + ":";
  res += date.getSeconds().toString().padStart(2, "0");
  return res;
}

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
