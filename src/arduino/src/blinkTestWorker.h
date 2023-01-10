#ifndef BLINKTESTWORKER_H
#define BLINKTESTWORKER_H

#include "shared.h"

class BlinkTestWorker : public WorkerBase
{
private:
  uint16_t count = 0;
  bool ledOn = false;

public:
  virtual bool Tick();
};

#endif
