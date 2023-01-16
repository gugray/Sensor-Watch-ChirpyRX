#include <Arduino.h>
#include "scaleWorker.h"

bool ScaleWorker::Tick()
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

  if ((count % 8) != 0) {
    return true;
  }

  if (seqPos == 56) {
    buzzerOff();
    digitalWrite(LED_PIN, LOW);
    return false;
  }
  uint32_t freq = 1200 + seqPos * 200;
  uint32_t period = 1000000 / freq;
  buzzAt(period);

  ++seqPos;
  return true;
}
