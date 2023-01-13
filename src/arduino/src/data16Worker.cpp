#include <Arduino.h>
#include "data16Worker.h"

// Data sequence has 4 + 16 + 2 + 16 + 2 = 40 items
#define INFO_SEQ_LEN 54
const uint8_t infoSeq[] = {
    17, 16, 17, 16,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    1, 8, 4, 15, 13, 12, 2, 6, 5, 11, 7, 0, 3, 14, 10, 9,
    7, 12, 6, 8, 10, 4, 15, 3, 14, 5, 11, 0, 13, 1, 2, 9,
    16, 17
};

bool Data16Worker::Tick()
{
  digitalWrite(LED_PIN, HIGH);

  // Countdown
  if (seqPos < 0)
  {
    if ((count % 64) == 0)
        buzzAt(1136);
    else if ((count % 64) == 8)
        buzzerOff();
    else if ((count % 64) == 63)
        ++seqPos;
    return true;
  }

  if (seqPos == INFO_SEQ_LEN) {
    buzzerOff();
    digitalWrite(LED_PIN, LOW);
    return false;
  }

  if (subCount == 0)
  {
    size_t toneIx = infoSeq[seqPos];
    uint16_t period = tonePeriods16[toneIx];
    buzzAt(period);
    ++seqPos;
  }
  
  ++subCount;
  if (subCount == 1) subCount = 0;
  return true;
}
