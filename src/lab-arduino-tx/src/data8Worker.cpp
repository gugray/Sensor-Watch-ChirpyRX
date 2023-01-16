#include <Arduino.h>
#include "data8Worker.h"

// Data sequence has 4 + 16 + 2 + 16 + 2 = 40 items
#define INFO_SEQ_LEN 54
const uint8_t infoSeq[] = {
    8, 0, 8, 0,
    0, 1, 2, 3, 4, 5, 6, 7,
    1, 4, 2, 6, 5, 7, 0, 3,
    7, 6, 4, 3, 5, 0, 1, 2,
    0, 1, 2, 3, 4, 5, 6, 7,
    1, 4, 2, 6, 5, 7, 0, 3,
    7, 6, 4, 3, 5, 0, 1, 2,
    0, 8
};

const uint32_t minFreq = 2500;
const uint32_t freqStep = 250;

bool Data8Worker::Tick()
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

  if (subCount == 0)
  {
    if (seqPos == INFO_SEQ_LEN) {
      buzzerOff();
      digitalWrite(LED_PIN, LOW);
      return false;
    }

    uint16_t toneIx = infoSeq[seqPos];
    uint32_t freq = minFreq + toneIx * freqStep;
    uint16_t period = 1000000 / freq;
    buzzAt(period);
    ++seqPos;
  }
  
  ++subCount;
  if (subCount == 3) subCount = 0;
  return true;
}
