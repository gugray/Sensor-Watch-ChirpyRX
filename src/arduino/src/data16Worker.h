#ifndef DATA16WORKER_H
#define DATA16WORKER_H

#include "shared.h"

class Data16Worker : public WorkerBase
{
private:
  int16_t seqPos = -3;
  uint16_t subCount = 0;

public:
  virtual bool Tick();
};

#endif
