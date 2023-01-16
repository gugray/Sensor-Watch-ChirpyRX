#ifndef DATA8WORKER_H
#define DATA8WORKER_H

#include "shared.h"

class Data8Worker : public WorkerBase
{
private:
  int16_t seqPos = -3;
  uint16_t subCount = 0;

public:
  virtual bool Tick();
};

#endif
