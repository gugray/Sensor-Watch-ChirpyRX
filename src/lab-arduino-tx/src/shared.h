#ifndef SHARED_H
#define SHARED_H

#define LED_PIN 13
#define BUZZER_PIN 6 // D6
#define BTN_PIN 8 // D8 ~ PCINT0

extern const uint16_t tonePeriods16[];

void buzzerOff();
void buzzAt(uint16_t period);

class WorkerBase
{
protected:
  uint16_t count = 0;

public:
  virtual ~WorkerBase() { }
  virtual bool Tick() = 0;
  void Count() { ++count; }
};


// 32-byte sample data
const uint16_t dataA_len = 32;
const uint8_t dataA[] = {
    0x68, 0x65, 0x6e, 0x4f, 0x00, 0xa9, 0xff, 0x67,
    0x23, 0x5a, 0x78, 0x9f, 0x00, 0x00, 0x04, 0x80,
    0x3e, 0xe3, 0x6f, 0x90, 0x13, 0x27, 0x0d, 0x0a,
    0xe2, 0xd6, 0x20, 0x77, 0xcb, 0xdc, 0x10, 0x4a,
};

const uint8_t dataB[] = 
    "There once was a ship that put to sea\n" \
    "The name of the ship was the Billy of Tea\n" \
    "The winds blew up, her bow dipped down\n" \
    "O blow, my bully boys, blow (huh)\n" \
    "\n" \
    "Soon may the Wellerman come\n" \
    "To bring us sugar and tea and rum\n" \
    "One day, when the tonguin′ is done\n" \
    "We'll take our leave and go\n" \
    ;    


#endif
