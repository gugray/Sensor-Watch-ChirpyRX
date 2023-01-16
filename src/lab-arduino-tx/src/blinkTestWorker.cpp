#include <Arduino.h>
#include "blinkTestWorker.h"

bool BlinkTestWorker::Tick()
{
  if ((count % 32) == 0)
  {
    count = 0;
    ledOn = !ledOn;
    if (ledOn)
    {
      digitalWrite(LED_PIN, HIGH);
      buzzAt(1136);
    }
    else
    {
      digitalWrite(LED_PIN, LOW);
      buzzerOff();
    }
  }
  ++count;
  return true;
}
