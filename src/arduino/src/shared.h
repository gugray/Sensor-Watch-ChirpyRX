#ifndef SHARED_H
#define SHARED_H

#define LED_PIN 13
#define BUZZER_PIN 6 // D6
#define BTN_PIN 8 // D8 ~ PCINT0

void buzzerOff();
void buzzAt(uint16_t period);

class WorkerBase
{
public:
  virtual bool Tick() = 0;
};

#endif
