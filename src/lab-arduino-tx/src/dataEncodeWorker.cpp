#include <Arduino.h>
#include "dataEncodeWorker.h"

const uint32_t minFreq = 2500;
const uint32_t freqStep = 250;

extern "C" {

uint16_t data_pos;
uint16_t data_len;
const uint8_t *data;

uint8_t get_next_byte(uint8_t *next_byte) {
  if (data_pos < data_len) {
    *next_byte = data[data_pos];
    ++data_pos;
    return 1;
  }
  return 0;
}

}


DataEncodeWorker::DataEncodeWorker(const uint8_t *dataArr, uint16_t dataLen)
{
  data_pos = 0;
  data_len = dataLen;
  data = dataArr;
  chirpy_init_encoder(&this->ces, get_next_byte);
}

bool DataEncodeWorker::Tick()
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
    uint8_t tone = chirpy_get_next_tone(&this->ces);

    // Serial.print("Tone: ");
    // Serial.println(tone);

    if (tone == 255)
    {
      buzzerOff();
      digitalWrite(LED_PIN, LOW);
      return false;
    }

    uint32_t freq = minFreq + tone * freqStep;
    uint16_t period = 1000000 / freq;
    buzzAt(period);
    ++seqPos;
  }
  
  ++subCount;
  if (subCount == 3) subCount = 0;
  return true;
}
