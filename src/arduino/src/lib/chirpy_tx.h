#ifndef CHIRPY_TX_H
#define CHIRPY_TX_H

uint8_t chirpy_crc8(const uint8_t *addr, uint16_t len);
uint8_t chirpy_update_crc8(uint8_t next_byte, uint8_t crc);

/** @brief Function to return next byte to be encoded.
  * @param next_byte Pointer where implementor must write next byte (if available).
  * @return 1 if there is a next byte, or 0 if no more data to encode.
  */
typedef uint8_t (*chirpy_get_next_byte_t)(uint8_t* next_byte);

#define CHIRPY_TONE_BUF_SIZE 16

// Holds state used by the encoder. Do not manipulate directly.
typedef struct {
  uint8_t tone_buf[CHIRPY_TONE_BUF_SIZE];
  uint8_t tone_pos;
  uint8_t tone_count;
  uint8_t block_len;
  uint8_t crc;
  uint16_t bits;
  uint8_t bit_count;
  chirpy_get_next_byte_t get_next_byte;
} chirpy_encoder_state_t;

/** @brief Iniitializes the encoder state to be used during the transmission.
  * @param ces Pointer to encoder state object to be initialized.
  * @param get_next_byte Pointer to function that the encoder will call to fetch data byte by byte.
  */
void chirpy_init_encoder(chirpy_encoder_state_t *ces, chirpy_get_next_byte_t get_next_byte);

/** @brief Returns the next tone to be transmitted.
  * @details This function will call the get_next_byte function stored in the encoder state to
  *          retrieve the next byte to be transmitted as needed. As a single byte is encoded as several tones,
  *          and because the transmission also includes periodic CRC values, not every call to this function
  *          will result in a callback for the next data byte. 
  * @param ced Pointer to the encoder state object.
  * @return A tone index from 0 to N (where N is the largest tone index), or 255 if the transmission is over.
  */ 
uint8_t chirpy_get_next_tone(chirpy_encoder_state_t *ces);

#endif
