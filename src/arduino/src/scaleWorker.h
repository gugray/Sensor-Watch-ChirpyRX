#ifndef SCALEWORKER_H
#define SCALEWORKER_H

#include "shared.h"

class ScaleWorker : public WorkerBase
{
private:
  int16_t seqPos = -3;

public:
  virtual bool Tick();
};

#endif
