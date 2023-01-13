#ifndef BLINKTESTWORKER_H
#define BLINKTESTWORKER_H

#include "shared.h"

class BlinkTestWorker : public WorkerBase
{
private:
  bool ledOn = false;

public:
  virtual bool Tick();
};

#endif
