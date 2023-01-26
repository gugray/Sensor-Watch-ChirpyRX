function decodeDateTime(bytes) {
  let year = (bytes[0] & 0b11111100) >> 2;
  year += 2020;
  let month = ((bytes[0] & 0b00000011) << 2) + ((bytes[1] & 0b11000000) >> 6);
  let day = (bytes[1] & 0b00111110) >> 1;
  let hour = ((bytes[1] & 0b00000001) << 4) + ((bytes[2] & 0b11110000) >> 4);
  let minute = ((bytes[2] & 0b00001111) << 2) + ((bytes[3] & 0b11000000) >> 6);
  let second = (bytes[3] & 0b00111111);
  return new Date(year, month - 1, day, hour, minute, second);
}

// uint32_t second : 6;    // 0-59
// uint32_t minute : 6;    // 0-59
// uint32_t hour : 5;      // 0-23
// uint32_t day : 5;       // 1-31
// uint32_t month : 4;     // 1-12
// uint32_t year : 6;      // 0-63 (representing 2020-2083)


function dateToIso(date) {
  // 2012-01-01T00:00:00
  let res = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-";
  res += date.getDate().toString().padStart(2, "0") + "T";
  res += date.getHours().toString().padStart(2, "0") + ":";
  res += date.getMinutes().toString().padStart(2, "0") + ":";
  res += date.getSeconds().toString().padStart(2, "0");
  return res;
}

export {decodeDateTime, dateToIso}
