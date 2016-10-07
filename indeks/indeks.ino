#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9
MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create MFRC522 instance.

#define MAX_LEN 100
#define ATTEMPTS 10
#define SUBJECT_CODE 40
#define SUBJECT_CREDITS 8
#define SUBJECT_CODE_BYTES (SUBJECT_CODE / 8)
#define SUBJECT_MARK 3
#define SUBJECT_DAY 5
#define SUBJECT_MONTH 4
#define SUBJECT_YEAR 12
#define BITES_PER_SUBJECT 72
#define SUBJECT_BYTES (BITES_PER_SUBJECT / 8)
#define BYTES_PER_BLOCK 16

/* Define available CmdMessenger commands */
enum {
  open_card,
  get_type,
  get_uid,
  read_year,
  write_subject,
  read_info,
  write_info
};

typedef struct {
  char code[SUBJECT_CODE / 8];
  byte credits;
  byte mark;
  byte day;
  byte month;
  unsigned int year;
} Subject;

typedef struct {
  //sector 13
  char firstname[24];
  char lastname[24];
  //sector 14
  char faculty[32];
  char city[12];
  int number;
  int year;
  //sector 15
  char course[19];
  char JMBG[13];
} StudentInfo;

/* Initialize CmdMessenger -- this should match PyCmdMessenger instance */
const int BAUD_RATE = 9600;
char command_buffer[MAX_LEN];
int buffer_index = 0;
bool is_command = false;
int cmd_id;
MFRC522::MIFARE_Key key;
byte buffer[30];
byte size = sizeof(buffer);
byte subject_data[SUBJECT_BYTES];
StudentInfo student_info;

void setup() {
  Serial.begin(9600);  // Initialize serial communications with the PC
  while (!Serial);    // Do nothing if no serial port is opened (added for Arduinos based on ATMEGA32U4)
  SPI.begin();    // Init SPI bus
  mfrc522.PCD_Init();
  for (byte i = 0; i < 6; i++) {
    key.keyByte[i] = 255;
  }

}

void loop() {
  if (is_command) {
    char* param;
    MFRC522::StatusCode status;
    byte blockAddr;
    long delta;
    byte year;
    byte subject_index;
    byte block_pos;
    byte subject_data_index;
    byte trailerBlock;
    int pos;
    cmd_id = get_cmd_id();

    switch (cmd_id) {
      case open_card:
        int s;
        int a;
        a = 0;
        do {
          s = 0;
          mfrc522.PICC_HaltA();
          // Stop encryption on PCD
          mfrc522.PCD_StopCrypto1();
          s += ((int) !mfrc522.PICC_IsNewCardPresent());
          //s = 0;
          s += ((int) !mfrc522.PICC_ReadCardSerial()) * 2;
          a++;
        } while (s != 0 && a < ATTEMPTS);
        if (s == 0) {
          Serial.print(F("0,"));
          Serial.print(mfrc522.PICC_GetType(mfrc522.uid.sak));
          Serial.print(F(","));
          dump_byte_array(mfrc522.uid.uidByte, mfrc522.uid.size, ',');
          Serial.println();
        }
        else {
          Serial.println(s);
        }
        break;
      case get_type:
        //MFRC522::PICC_Type piccType = ;
        Serial.print(F("0,"));
        Serial.println(mfrc522.PICC_GetType(mfrc522.uid.sak));
        break;
      case get_uid:
        Serial.print(F("0,"));
        dump_byte_array(mfrc522.uid.uidByte, mfrc522.uid.size, ',');
        Serial.println();
        break;
      /*case authenticate:
        //2:96,5,255,255,255,255,255,255;
        int keyType;
        byte trailerBlock;
        param = get_next_param();
        keyType = atoi(param);
        param = get_next_param();
        blockAddr = atoi(param);
        trailerBlock = getTrailerBlock(blockAddr);
        for (byte i = 0; i < 6; i++) {
            param = get_next_param();
            key.keyByte[i] = atoi(param);
        }
        //MFRC522::PICC_CMD_MF_AUTH_KEY_A
        status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(keyType, trailerBlock, &key, &(mfrc522.uid));
        Serial.println(status);
        break;*/
      case read_year:
        param = get_next_param();
        subject_index = 0;
        year = atoi(param) - 1;
        //Serial.println(year);
        Subject subject[15];
        subject_data_index = 0;
        block_pos = 0;
        bool more_subjects;
        more_subjects = true;
        status = 0;
        for (byte sector = 1 + year * 3; status == 0 && more_subjects && sector < 4 + year * 3; sector++) {
          status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, sector * 4 + 3, &key, &(mfrc522.uid));
          //Serial.print(F("Sector "));
          //Serial.print(sector);
          if (status == 0) {
            for (byte block = 0; status == 0 && more_subjects && block < 3; block++) {
              blockAddr = sector * 4 + block;
              //Serial.print(F(" Block "));
              //Serial.print(blockAddr);
              block_pos = 0;
              status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(blockAddr, buffer, &size);
              if (status == 0) {
                while (block_pos < BYTES_PER_BLOCK) {
                  subject_data[subject_data_index] = buffer[block_pos];
                  subject_data_index++;
                  block_pos++;
                  if (subject_data_index == SUBJECT_BYTES) {
                    bytes_to_subject(subject_data, &subject[subject_index]);
                    subject_data_index = 0;
                    more_subjects = false;
                    for (byte i = 0; i < SUBJECT_CODE_BYTES; i++) {
                      if (subject[subject_index].code[i] != 0) {
                        more_subjects = true;
                      }
                    }
                    if (more_subjects) {
                      subject_index++;
                    }
                    //Serial.println(more_subjects);
                  }
                }
                /*Serial.print(block_pos);
                  Serial.print(F(" "));
                  Serial.print(subject_data_index);*/
                //Serial.print(F(" block: "));
                //dump_byte_array(buffer, 16, ',');
                //Serial.println();
              }
              else {
                break;
              }
            }
          }
          else {
            break;
          }
        }
        //read(blockAddr);
        //dump_subjects_as_byte_array(subject, 15*9);
        Serial.print(status);
        //Serial.print(subject_index);
        if (subject_index > 0) {
          for (byte i = 0; i < subject_index; i++) {
            Serial.print(F(","));
            dump_subject(&subject[i]);
          }
        }
        Serial.println();
        break;
      case write_subject:
        param = get_next_param();
        year = atoi(param) - 1;
        param = get_next_param();
        subject_index = atoi(param);

        Subject sub;
        for (byte i = 0; i < 5; i++) {
          param = get_next_param();
          sub.code[i] = atoi(param);
        }
        param = get_next_param();
        sub.credits = atoi(param);
        param = get_next_param();
        sub.mark = atoi(param);
        param = get_next_param();
        sub.day = atoi(param);
        param = get_next_param();
        sub.month = atoi(param);
        param = get_next_param();
        sub.year = atoi(param);
        subject_to_bytes(&sub, subject_data);
        //dump_byte_array(subject_data, 9, ',');
        blockAddr = subject_index * SUBJECT_BYTES / BYTES_PER_BLOCK;
        blockAddr += 4 + year * 12 + blockAddr / 3;
        block_pos = subject_index * SUBJECT_BYTES % BYTES_PER_BLOCK;
        subject_data_index = 0;
        trailerBlock = getTrailerBlock(blockAddr);
        /*Serial.print(F("Read block #"));
          Serial.print(blockAddr);
          Serial.print(F(" at pos "));
          Serial.print(block_pos);
          Serial.print(F(" trailer "));
          Serial.print(trailerBlock);
          Serial.print(F(" status "));*/
        status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
        //Serial.print(status);
        status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(blockAddr, buffer, &size);
        //Serial.println(status);
        while (subject_data_index < SUBJECT_BYTES) {
          //Serial.print(block_pos);
          //Serial.print(F(" "));
          buffer[block_pos] = subject_data[subject_data_index];
          block_pos++;
          subject_data_index++;
          if (subject_data_index < SUBJECT_BYTES && block_pos == BYTES_PER_BLOCK) {
            /*Serial.print(F("Write block #"));
              Serial.print(blockAddr);
              Serial.print(F(" trailer "));
              Serial.print(trailerBlock);
              Serial.print(F(" status "));*/
            status = (MFRC522::StatusCode) mfrc522.MIFARE_Write(blockAddr, buffer, 16);
            //Serial.println(status);
            blockAddr++;
            if (blockAddr % 4 == 3) {
              blockAddr++;
            }
            block_pos = 0;
            trailerBlock = getTrailerBlock(blockAddr);
            /*Serial.print(F("Read block #"));
              Serial.print(blockAddr);
              Serial.print(F(" at pos "));
              Serial.print(block_pos);
              Serial.print(F(" trailer "));
              Serial.print(trailerBlock);
              Serial.print(F(" status "));*/
            status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
            //Serial.print(status);
            status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(blockAddr, buffer, &size);
            //Serial.println(status);
          }
        }
        trailerBlock = getTrailerBlock(blockAddr);
        status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
        //Serial.println(status);
        /*Serial.print(F("Write block #"));
          Serial.print(blockAddr);
          Serial.print(F(" trailer "));
          Serial.print(trailerBlock);
          Serial.print(F(" status "));*/
        status = (MFRC522::StatusCode) mfrc522.MIFARE_Write(blockAddr, buffer, 16);
        Serial.println(status);
        //Serial.print(block_pos);
        break;
      case read_info:
        status = 0;
        memset(&student_info, 0, sizeof(StudentInfo));
        for (byte sector = 13; status == 0 && sector < 16; sector++) {
          trailerBlock = sector * 4 + 3;
          status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
          for (byte block = 0; status == 0 && block < 3; block++) {
            blockAddr = sector * 4 + block;
            /*Serial.print(F("Read block "));
            Serial.print(blockAddr);
            Serial.print(F(" data: "));*/
            status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(blockAddr, buffer, &size);
            pos = ((sector - 13) * 3 * BYTES_PER_BLOCK + block * BYTES_PER_BLOCK);
            /*dump_byte_array(buffer, 16, ',');
            Serial.print(F(" pos: "));
            Serial.println(pos);*/
            for(byte b = 0; b < 16; b++){
              *((byte*)&student_info+pos+b) = buffer[b];
            }
            //memcpy(&student_info + pos, &buffer, BYTES_PER_BLOCK);
          }
        }
        Serial.print(status);
        if(status == 0){
          Serial.print(F(","));
          dump_info(&student_info);
        }
        Serial.println();
        break;
      case write_info:
        memset(&student_info, 0, sizeof(StudentInfo));
        param = get_next_param();
        strncpy(student_info.firstname, param, min(24, strlen(param)));
        param = get_next_param();
        strncpy(student_info.lastname, param, min(24, strlen(param)));
        param = get_next_param();
        strncpy(student_info.faculty, param, min(32, strlen(param)));
        param = get_next_param();
        strncpy(student_info.city, param, min(12, strlen(param)));
        param = get_next_param();
        student_info.number = atoi(param);
        param = get_next_param();
        student_info.year = atoi(param);
        param = get_next_param();
        strncpy(student_info.course, param, min(19, strlen(param)));
        param = get_next_param();
        strncpy(student_info.JMBG, param, min(13, strlen(param)));
        status = 0;
        for (byte sector = 13; status == 0 && sector < 16; sector++) {
          trailerBlock = sector * 4 + 3;
          status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
          for (byte block = 0; status == 0 && block < 3; block++) {
            blockAddr = sector * 4 + block;
            pos = ((sector - 13) * 3 * BYTES_PER_BLOCK + block * BYTES_PER_BLOCK);
            for(byte b = 0; b < 16; b++){
              if(pos + b < sizeof(StudentInfo)){
                buffer[b] = *((byte*)&student_info+pos+b);
              }
            }
            status = (MFRC522::StatusCode) mfrc522.MIFARE_Write(blockAddr, buffer, BYTES_PER_BLOCK);
            //memcpy(&student_info + pos, &buffer, BYTES_PER_BLOCK);
          }
        }
        Serial.println(status);
        break;
      default:
        Serial.println(F("0,unknow_command"));
        break;
    }
    buffer_index = 0;
    is_command = false;

  }
  else {
    while (Serial.available() > 0) {
      command_buffer[buffer_index] = Serial.read();
      //Serial.print((char)buffer[buffer_index]);
      buffer_index++;
      if (command_buffer[buffer_index - 1] == ';') {
        is_command = true;
        command_buffer[buffer_index] = 0;
        break;
      }
    }
  }

}

int get_cmd_id() {
  for (buffer_index = 0; buffer_index < MAX_LEN; buffer_index++) {
    if (command_buffer[buffer_index] == ':') {
      command_buffer[buffer_index] = '\0';
      break;
    }
  }
  int cmd_id = atoi(command_buffer);
  command_buffer[buffer_index] = ':';
  return cmd_id;
}

char* get_next_param() {
  buffer_index++;
  int start_index = buffer_index;
  if (command_buffer[buffer_index] == '\0') {
    command_buffer[buffer_index] = ',';
  }
  while (buffer_index < MAX_LEN && command_buffer[buffer_index] != ',' && command_buffer[buffer_index] != ';') {
    buffer_index++;
  }
  if (command_buffer[buffer_index] == ',' || command_buffer[buffer_index] == ';') {
    command_buffer[buffer_index] = '\0';
  }
  return (command_buffer + start_index);
}

void dump_subjects_as_byte_array(Subject *buffer, int bufferSize) {
  for (int i = 0; i < bufferSize; i++) {
    Serial.print((char)(buffer + i));
  }
}

void dump_info(StudentInfo* info){
  //dump_byte_array(info->firstname, 24, ',');
  Serial.print(info->firstname);
  Serial.print(F(","));
  Serial.print(info->lastname);
  Serial.print(F(","));
  Serial.print(info->faculty);
  Serial.print(F(","));
  Serial.print(info->city);
  Serial.print(F(","));
  Serial.print(info->number);
  Serial.print(F(","));
  Serial.print(info->year);
  Serial.print(F(","));
  Serial.print(info->course);
  Serial.print(F(","));
  Serial.print(info->JMBG);
}

/**
   Helper routine to dump a byte array as hex values to Serial.
*/
void dump_byte_array(byte *buffer, byte bufferSize, char c) {
  for (byte i = 0; i < bufferSize; i++) {
    //Serial.print(buffer[i] < 0x10 ? "0" : "");
    //Serial.print(buffer[i], HEX);
    if (i > 0) {
      Serial.print(c);
    }
    Serial.print(buffer[i]);
  }
}

void bytes_to_subject(byte *data, Subject *subject) {
  //dump_byte_array(data, 9, '-');
  //Serial.println();
  memcpy(subject->code, data, SUBJECT_CODE_BYTES);
  subject->credits = data[SUBJECT_CODE_BYTES];
  subject->mark = (data[SUBJECT_CODE_BYTES + 1] >> (8 - SUBJECT_MARK)) + 5;
  subject->day = (data[SUBJECT_CODE_BYTES + 1] & ((byte)pow(2, SUBJECT_DAY) - 1));
  subject->month = (data[SUBJECT_CODE_BYTES + 2] >> (8 - SUBJECT_MONTH));
  subject->year = (data[SUBJECT_CODE_BYTES + 2] & ((byte)pow(2, 8 - SUBJECT_MONTH) - 1));
  subject->year = (subject->year << 8) + data[SUBJECT_CODE_BYTES + 3];
}

void subject_to_bytes(Subject *subject, byte *data) {
  memcpy(data, subject->code, SUBJECT_CODE_BYTES);
  data[SUBJECT_CODE_BYTES] = subject->credits;
  data[SUBJECT_CODE_BYTES + 1] = (subject->mark - 5) << (8 - SUBJECT_MARK);
  data[SUBJECT_CODE_BYTES + 1] = (data[SUBJECT_CODE_BYTES + 1] | (subject->day & ((byte)pow(2, SUBJECT_DAY) - 1)));
  data[SUBJECT_CODE_BYTES + 2] = subject->month << (8 - SUBJECT_MONTH);
  data[SUBJECT_CODE_BYTES + 2] = data[SUBJECT_CODE_BYTES + 2] | (highByte(subject->year) & ((byte)pow(2, 8 - SUBJECT_MONTH) - 1));
  data[SUBJECT_CODE_BYTES + 3] = lowByte(subject->year);
}

void dump_subject(Subject *subject) {
  dump_byte_array(subject->code, SUBJECT_CODE_BYTES, '.');
  Serial.print(F("."));
  Serial.print(subject->credits);
  Serial.print(F("."));
  Serial.print(subject->mark);
  Serial.print(F("."));
  Serial.print(subject->day);
  Serial.print(F("."));
  Serial.print(subject->month);
  Serial.print(F("."));
  Serial.print(subject->year);
}

byte getTrailerBlock(byte blockAddr) {
  MFRC522::PICC_Type type = mfrc522.PICC_GetType(mfrc522.uid.sak);
  switch (type) {
    case MFRC522::PICC_TYPE_MIFARE_1K:
      return blockAddr + 3 - (blockAddr % 4);
      break;
    case MFRC522::PICC_TYPE_MIFARE_4K:
      //32 sectors with 4 bytes
      if (blockAddr < 128) { // 32 * 4
        return blockAddr + 3 - (blockAddr % 4);
      }
      //8 sectors with 16 bytes
      else {
        byte b = blockAddr - 128;
        return 128 + b + 15 - (b % 16);
      }
      break;
  }
}

