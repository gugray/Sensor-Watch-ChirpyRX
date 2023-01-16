#ifndef DATAENCODEWORKER_H
#define DATAENCODEWORKER_H

#include "shared.h"

extern "C" {
#include "lib/chirpy_tx.h"
}

class DataEncodeWorker : public WorkerBase
{
private:
  int16_t seqPos = -3;
  uint16_t subCount = 0;
  chirpy_encoder_state_t ces;

public:
  DataEncodeWorker(const uint8_t *dataArr, uint16_t dataLen);
  virtual bool Tick();
};

#endif
