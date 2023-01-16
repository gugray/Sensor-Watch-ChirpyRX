#include <Arduino.h>
#include "shared.h"
#include "blinkTestWorker.h"
#include "scaleWorker.h"
#include "data8Worker.h"
#include "dataEncodeWorker.h"

#ifdef __cplusplus
extern "C"
{
#endif
#include "lib/chirpy_tx.h"
#ifdef __cplusplus
}
#endif


// CRC-8 to add:
// https://stackoverflow.com/a/15171925
// This >>>>  https://stackoverflow.com/a/51731327

const uint16_t tonePeriods16[] = { 417, 385, 358, 334, 313, 295, 278, 264, 251, 239, 228, 218, 209, 201, 193, 186, 455, 179 };

// Using 16-bit timer1 prescaled to 2 x 1Mhz to drive the buzzer.
// -> Periods this way are the same as in watch.
// Using 8-bit timer2 to get 64 ticks per second

// Worker's Tick function will be called 64 times per second
WorkerBase *worker = NULL;

// If true, we're currently driving the buzzer.
bool buzzing = false;

// Is buzzer output currently HIGH?
bool buzzerHi = false;

void setupTimer2()
{
  cli();
 
  // No port functionality, no PWM. We just want a callback.
  TCCR2A = 0;
  // Prescaler at 32.
  TCCR2B = (1 << CS21) | (1 << CS20);
  // Clear counter
  TCNT2 = 0;
  // Enable timer 2 overflow interrupt
  TIMSK2 = (1 << TOIE2);

  sei();
}

// Timer 2 overflow interrupt routine
ISR(TIMER2_OVF_vect)
{
  static const uint8_t roundedTop = 30;
  static const uint32_t fracPerCycle = 517578125;
  static const uint32_t fracLimit = 1000000000;

  static uint8_t count = 0;
  static uint32_t frac = 0;
  static uint8_t top = roundedTop;
  // With a prescaler of 32 from the 16MHz clock, this gets called 16e6 / 32 / 256 times per second: 1953.125 times
  // For 64 ticks per second, we need to fire tick on every 30.517578125 th interrupt
  // We normally count till 30, but when enough error has accumulated, we count till 31
  ++count;
  if (count < top) return;
  count = 0;
  if (frac >= fracLimit) {
    top = roundedTop + 1;
    frac -= fracLimit;
  }
  else top = roundedTop;
  frac += fracPerCycle;
  // So, we're actually at a cycle, let's call tick!
  // But only if we have an actual worker RN
  if (worker == NULL) return;
  // Call tick. Remove worker when they say they're finished.
  if (!worker->Tick())
  {
    delete worker;
    worker = NULL;
  }
  else worker->Count();
}

void setupTimer1()
{
  cli();

  // No port functionality, no PWM. We just want a callback.
  TCCR1A = 0;
  // Prescaler at 8. This is 2Mhz, but for a given frequency, we must turn buzzer on + off within a single period.
  TCCR1B = (1 << CS11);
  // Compare register A. This is period for 880Hz.
  OCR1A = 1136;
  // Clear counter
  TCNT1 = 0;
  // Enable compare match A interrupt
  TIMSK1 = (1 << OCIE1A);

  sei();
}

ISR(TIMER1_COMPA_vect)
{
  TCNT1 = 0;
  buzzerHi = !buzzerHi;
  if (buzzing)
  {
    if (buzzerHi) digitalWrite(BUZZER_PIN, HIGH);
    else digitalWrite(BUZZER_PIN, LOW);
  }
  else digitalWrite(BUZZER_PIN, LOW);
}

ISR(PCINT0_vect)
{
  // Only care about pressed button
  if (digitalRead(BTN_PIN) != LOW) return;
  
  // If worker currently exists, leave it alone
  if (worker != NULL) return;

  // Create new worker
  const uint8_t *data = dataB;
  uint16_t dataLen = strlen((const char*)data);
  
  worker = new DataEncodeWorker(data, dataLen);
}

void setupButton()
{
  // Enable PCIE0 group
  PCICR = (1 << PCIE0);
  // Enable PCINT0, which is pin D8
  PCMSK0 = (1 << PCINT0);
}

void setup()
{
  Serial.begin(9600);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(BTN_PIN, INPUT_PULLUP);
  
  setupTimer1();
  setupTimer2();
  setupButton();
}

void loop()
{
  // Dummy
  delay(100);
}

void buzzerOff()
{
  buzzing = false;
  digitalWrite(BUZZER_PIN, LOW);
  buzzerHi = false;
}

void buzzAt(uint16_t period)
{
  uint16_t currentPeriod = OCR1A;
  if (currentPeriod != period)
  {
    OCR1A = period;
    if (currentPeriod >= TCNT1)
      TCNT1 = 0;
  }
  buzzing = true;
}

