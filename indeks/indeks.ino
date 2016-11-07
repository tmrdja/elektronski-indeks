#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9
MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create MFRC522 instance.

#define MAX_LEN 260
#define ATTEMPTS 10
#define number_of_chars(bits) bits / 8

#define SUBJECT_CODE 40
#define SUBJECT_NAME 272
#define SUBJECT_CREDITS 7
#define SUBJECT_SEMESTER 7
#define SUBJECT_ESPB 4
#define SUBJECT_REQUIRED 1
#define SUBJECT_SIGNED 1
#define SUBJECT_TEACHER_NAME 256
#define SUBJECT_MARK 3
#define SUBJECT_DAY 5
#define SUBJECT_MONTH 4
#define SUBJECT_YEAR 12
#define BITS_PER_SUBJECT (SUBJECT_CODE + SUBJECT_SEMESTER + (5 * SUBJECT_CREDITS) + SUBJECT_NAME + SUBJECT_ESPB + SUBJECT_REQUIRED + SUBJECT_SIGNED + SUBJECT_TEACHER_NAME + SUBJECT_MARK + SUBJECT_DAY + SUBJECT_MONTH + SUBJECT_YEAR)
#define SUBJECT_BYTES number_of_chars(BITS_PER_SUBJECT)
#define BYTES_PER_BLOCK 16

#define STUDENT_NAME 25
#define STUDENT_FACULTY 32
#define STUDENT_CITY 17
#define STUDENT_COURSE 25
#define STUDENT_JMBG 13

#define STUDENT_BLOCKS 15

/* Define available CmdMessenger commands */
enum {
  open_card,
  get_type,
  get_uid,
  read_year,
  write_subject,
  read_info,
  write_info,
  init_subject
};

typedef struct {
  byte semester;
  byte is_required;
  byte espb;
  byte is_signed;
  byte credits[5];
  byte mark;
  byte day;
  byte month;
  unsigned int year;
  char code[number_of_chars(SUBJECT_CODE)];
  char name[number_of_chars(SUBJECT_NAME)];
  char teacher_name[number_of_chars(SUBJECT_TEACHER_NAME)];
} Subject;

typedef struct {
  char firstname[STUDENT_NAME];
  char lastname[STUDENT_NAME];
  char middlename[STUDENT_NAME];
  char faculty[STUDENT_FACULTY];
  char city[STUDENT_CITY];
  int number;
  int year;
  char course[STUDENT_COURSE];
  byte type;
  byte degree;
  char JMBG[STUDENT_JMBG];
  char birthCity[STUDENT_CITY];
  char birthCounty[STUDENT_CITY];
  char birthCountry[STUDENT_CITY];
  char citizenship[STUDENT_CITY];
} StudentInfo;

/* Initialize CmdMessenger -- this should match PyCmdMessenger instance */
const int BAUD_RATE = 9600;
char* command_buffer;
int buffer_index = 0;
bool is_command = false;
int cmd_id;
MFRC522::MIFARE_Key key;
MFRC522::MIFARE_Key writeKey;
byte buffer[30];
byte size = sizeof(buffer);
byte subject_data[SUBJECT_BYTES];
StudentInfo* student_info;
Subject *sub;
char *str;
//Subject* subjects;

void setup() {
  Serial.begin(9600);  // Initialize serial communications with the PC
  while (!Serial);    // Do nothing if no serial port is opened (added for Arduinos based on ATMEGA32U4)
  SPI.begin();    // Init SPI bus
  mfrc522.PCD_Init();
  for (byte i = 0; i < 6; i++) {
    key.keyByte[i] = 255;
  }
  sub = (Subject*)malloc(sizeof(Subject));
  student_info = (StudentInfo*) malloc(sizeof(StudentInfo));
  command_buffer = (char*)malloc(sizeof(char) * MAX_LEN);
  str = (char*) malloc(33 * sizeof(char));
  //subjects = (Subject*)malloc(sizeof(Subject) * 12);
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
      case read_year:
        param = get_next_param();
        year = atoi(param);
        subject_data_index = 0;
        //Serial.println(subject_index);
        //Serial.println(year);
        block_pos = 0;
        byte semester;
        Subject subjects[13];
        byte j;
        j = 0;
        status = MFRC522::STATUS_OK;
        for (subject_index = 0; subject_index < 40; subject_index++) {
          //status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, subject_index * 4 + 3, &key, &(mfrc522.uid));
          semester = year + 1;
          //Serial.println(F("memset"));
          //Serial.println(SUBJECT_BYTES);
          memset(&(subjects[j]), 0, SUBJECT_BYTES);
          //Serial.println(F("memset2"));
          for (byte i = 0; i < 5; i++) {
            blockAddr = get_block_addr(subject_index, i);
            trailerBlock = getTrailerBlock(blockAddr);
            /*Serial.print(i);
              Serial.print(F(" "));
              Serial.print(blockAddr);
              Serial.print(F(" "));
              Serial.println(trailerBlock);*/
            status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
            if (status != MFRC522::STATUS_OK) {
              break;
            }
            //&subject_data[i * BYTES_PER_BLOCK]
            status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(blockAddr, buffer, &size);
            memcpy(subject_data + i * BYTES_PER_BLOCK, buffer, BYTES_PER_BLOCK);
            if (status != MFRC522::STATUS_OK) {
              break;
            }
            if (i == 0) {
              semester = subject_data[0] >> 1;
              //Serial.println(semester);
              if (semester != year) {
                break;
              }
            }
            if (i == 4) {
              bytes_to_subject(subject_data, &subjects[j]);
              //Serial.println(F("bytes_to_subject"));
              j++;
            }

          }
          if (semester > year || semester == 0 || j >= 13) {
            //Serial.println(semester);
            break;
          }
        }
        if (status != MFRC522::STATUS_OK) {
          Serial.println(status);
        }
        else {
          Serial.print(F("0"));
          for (byte i = 0; i < j; i++) {
            Serial.print(F(","));
            Serial.print(subject_index - j + i);
            Serial.print(F("."));
            dump_subject(&subjects[i]);

          }
          Serial.println();
        }
        //free(subjects);
        break;
      case init_subject:
        memset(sub, 0, sizeof(Subject));
        param = get_next_param();
        subject_index = atoi(param);
        for (byte k = 0; k < 6; k++) {
          param = get_next_param();
          writeKey.keyByte[k] = atoi(param);
        }
        param = get_next_param();
        sub->semester = atoi(param);
        param = get_next_param();
        sub->is_required = atoi(param);
        param = get_next_param();
        sub->espb = atoi(param);
        param = get_next_param();
        strncpy(sub->code, param, min(number_of_chars(SUBJECT_CODE), strlen(param)));
        param = get_next_param();
        strncpy(sub->name, param, min(number_of_chars(SUBJECT_NAME), strlen(param)));
        param = get_next_param();
        strncpy(sub->teacher_name, param, min(number_of_chars(SUBJECT_TEACHER_NAME), strlen(param)));
        // default
        sub->is_signed = 0;
        sub->credits[0] = sub->credits[1] = sub->credits[2] = sub->credits[3] = sub->credits[4] = 0;
        sub->mark = 5;
        sub->day = 1;
        sub->month = 0;
        sub->year = 1;
        subject_to_bytes(sub, subject_data);
        //memset(sub, 0, sizeof(Subject));
        //bytes_to_subject(subject_data, sub);
        //Serial.println("dump: ");
        //dump_subject(sub);//dump_byte_array(subject_data, SUBJECT_BYTES,'','');Serial.println();
        //Serial.println(subject_index);
        byte n;
        n = SUBJECT_BYTES / BYTES_PER_BLOCK;
        //Serial.println(n);
        status = MFRC522::STATUS_OK;
        for (byte i = 0; i < n; i++) {
          blockAddr = get_block_addr(subject_index, i);
          if ((blockAddr < 32 * 4 && blockAddr % 4 == 3) || blockAddr % 16 == 15) {
            Serial.print(F("1,Fatal error"));
            break;
          }
          else {
            trailerBlock = getTrailerBlock(blockAddr);
            status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
            if (status != MFRC522::STATUS_OK) {
              //Serial.println(F("auth"));
              break;
            }
            else {
              //Serial.println(F("------"));
              //Serial.print((byte)blockAddr);
              //Serial.print(F(" "));
              //Serial.println(trailerBlock);
              status = (MFRC522::StatusCode) mfrc522.MIFARE_Write(blockAddr, subject_data + (i * BYTES_PER_BLOCK), BYTES_PER_BLOCK);
              if (status != MFRC522::STATUS_OK) {
                //Serial.println(F("write"));
                break;
              }
            }
          }
        }
        if (status == MFRC522::STATUS_OK) {
          status = lock_sector(subject_index, trailerBlock, writeKey.keyByte);
        }
        Serial.println(status);
        break;
      case write_subject:
        param = get_next_param();
        subject_index = atoi(param);
        for (byte i = 0; i < 6; i++) {
          param = get_next_param();
          writeKey.keyByte[i] = atoi(param);
        }
        blockAddr = get_block_addr(subject_index, 0);
        if ((blockAddr < 32 * 4 && blockAddr % 4 == 3) || blockAddr % 16 == 15) {
          Serial.println(F("1,Fatal error"));
        } else {
          trailerBlock = getTrailerBlock(blockAddr);
          //          Serial.print(blockAddr);
          //          Serial.print(F(" "));
          //          Serial.println(trailerBlock);
          status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &writeKey, &(mfrc522.uid));
          if (status == MFRC522::STATUS_OK) {
            status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(blockAddr, buffer, &size);
            if (status == MFRC522::STATUS_OK) {
              memcpy(subject_data, buffer, BYTES_PER_BLOCK);
              bytes_to_subject(subject_data, sub);
              //memset(sub, 0, sizeof(Subject));
              param = get_next_param();
              sub->is_signed = atoi(param);
              for (byte i = 0; i < 5; i++) {
                param = get_next_param();
                sub->credits[i] = atoi(param);
              }
              param = get_next_param();
              sub->mark = atoi(param);
              param = get_next_param();
              sub->day = atoi(param);
              param = get_next_param();
              sub->month = atoi(param);
              param = get_next_param();
              sub->year = atoi(param);
              subject_to_bytes(sub, subject_data);
              status = (MFRC522::StatusCode) mfrc522.MIFARE_Write(blockAddr, subject_data, BYTES_PER_BLOCK);
            }
            Serial.println(status);
          }
          else {
            Serial.print(status);
            Serial.print(F(",auth"));
            for (byte i = 0; i < 6; i++) {
              Serial.print(F(","));
              Serial.print(writeKey.keyByte[i]);
            }
            Serial.println();
          }
        }
        break;
      case read_info:
        memset(student_info, 0, sizeof(StudentInfo));
        status = MFRC522::STATUS_OK;
        for (byte block = 0; status == MFRC522::STATUS_OK && block < STUDENT_BLOCKS; block++) {
          if (block < 5) {
            blockAddr = get_block_addr(38, 10 + block);
          }
          else {
            blockAddr = get_block_addr(39, block);
          }
          //Serial.println(blockAddr);
          if (block == 0 || block == 5) {
            trailerBlock = getTrailerBlock(blockAddr);
            status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
          }
          if (((block == 0 || block == 5) && status == MFRC522::STATUS_OK) || (block != 0 && block != 5)) {
            status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(blockAddr, buffer, &size);
            memcpy((byte*)student_info + block * BYTES_PER_BLOCK, buffer, BYTES_PER_BLOCK);

          }
        }
        Serial.print(status);
        if (status == MFRC522::STATUS_OK) {
          Serial.print(F(","));
          dump_info(student_info);
        }
        Serial.println();
        break;
      case write_info:
        memset(student_info, 0, sizeof(StudentInfo));
        param = get_next_param();
        strncpy(student_info->firstname, param, min(STUDENT_NAME, strlen(param)));
        param = get_next_param();
        strncpy(student_info->lastname, param, min(STUDENT_NAME, strlen(param)));
        param = get_next_param();
        strncpy(student_info->middlename, param, min(STUDENT_NAME, strlen(param)));
        param = get_next_param();
        strncpy(student_info->faculty, param, min(STUDENT_FACULTY, strlen(param)));
        param = get_next_param();
        strncpy(student_info->city, param, min(STUDENT_CITY, strlen(param)));
        param = get_next_param();
        student_info->number = atoi(param);
        param = get_next_param();
        student_info->year = atoi(param);
        param = get_next_param();
        strncpy(student_info->course, param, min(STUDENT_COURSE, strlen(param)));
        param = get_next_param();
        student_info->type = atoi(param);
        param = get_next_param();
        student_info->degree = atoi(param);
        param = get_next_param();
        strncpy(student_info->JMBG, param, min(STUDENT_JMBG, strlen(param)));
        param = get_next_param();
        strncpy(student_info->birthCity, param, min(STUDENT_CITY, strlen(param)));
        param = get_next_param();
        strncpy(student_info->birthCounty, param, min(STUDENT_CITY, strlen(param)));
        param = get_next_param();
        strncpy(student_info->birthCountry, param, min(STUDENT_CITY, strlen(param)));
        param = get_next_param();
        strncpy(student_info->citizenship, param, min(STUDENT_CITY, strlen(param)));
        status = MFRC522::STATUS_OK;
        for (byte block = 0; status == MFRC522::STATUS_OK && block < STUDENT_BLOCKS; block++) {
          if (block < 5) {
            blockAddr = get_block_addr(38, 10 + block);
          }
          else {
            blockAddr = get_block_addr(39, block);
          }
          if (block == 0 || block == 5) {
            trailerBlock = getTrailerBlock(blockAddr);
            status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
          }
          if (((block == 0 || block == 5) && status == MFRC522::STATUS_OK) || (block != 0 && block != 5)) {
            if (blockAddr == 255 || blockAddr == 239) {
              Serial.print(F("1,fatal error"));
            }
            else {
              memcpy(buffer, (byte*)student_info + block * BYTES_PER_BLOCK, BYTES_PER_BLOCK);
              status = (MFRC522::StatusCode) mfrc522.MIFARE_Write(blockAddr, buffer, BYTES_PER_BLOCK);
            }
            //Serial.println(status);
          }
        }
        Serial.println(status);
        //        for (byte i = 0; i < 16; i++) {
        //          byte b;
        //          b = *((byte*)student_info + i + 11 * BYTES_PER_BLOCK);
        //          if(i<6){
        //            writeKey.keyByte[i] = b;
        //          }
        //          Serial.print(b);
        //          Serial.print(F(","));
        //        }

        //        status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, 255, &writeKey, &(mfrc522.uid));
        //        Serial.print("Auth 255: ");
        //        Serial.println(status);
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

byte get_block_addr(byte subject_index, byte i) {
  if (subject_index == 0) {
    if (i < 2) {
      return i + 1;
    }
    else {
      return 32 * 4 + 6 * 16 + 7 + i - 2;
    }
  } else if (subject_index < 32) {
    if (i < 3) {
      return (4 * subject_index) + i;
    }
    else {
      byte extend_sector = 0;
      extend_sector = (subject_index - 1) / 5;
      return (4 * 32) + (16 * extend_sector) + 5 + (2 * ((subject_index - 1) % 5)) + i - 3;
    }
  }
  else {
    return (4 * 32) + (16 * (subject_index - 32)) + i;
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

void dump_info(StudentInfo* info) {
  //dump_byte_array(info->firstname, 24,'','');
  strncpy(str, info->firstname, STUDENT_NAME);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  strncpy(str, info->lastname, STUDENT_NAME);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  strncpy(str, info->middlename, STUDENT_NAME);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  strncpy(str, info->faculty, STUDENT_FACULTY);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  strncpy(str, info->city, STUDENT_CITY);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  Serial.print(info->number);
  Serial.print(F(","));

  Serial.print(info->year);
  Serial.print(F(","));

  strncpy(str, info->course, STUDENT_COURSE);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  Serial.print(info->type);
  Serial.print(F(","));

  Serial.print(info->degree);
  Serial.print(F(","));

  strncpy(str, info->JMBG, STUDENT_JMBG);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  strncpy(str, info->birthCity, STUDENT_CITY);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  strncpy(str, info->birthCounty, STUDENT_CITY);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  strncpy(str, info->birthCountry, STUDENT_CITY);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);
  Serial.print(F(","));

  strncpy(str, info->citizenship, STUDENT_CITY);
  str[STUDENT_NAME] = '\0';
  Serial.print(str);

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
  subject->semester = data[0] >> 1;
  subject->is_required = mask_byte(data[0], 7, 1);
  subject->espb = data[1] >> 4;
  // is 4-th bit 1
  subject->is_signed = (mask_byte(data[1] >> 3, 7, 1) == 1);
  // last 3 bits becomes bits 1-3;   first 4 bits becomes last 4
  subject->credits[0] = mask_byte(data[1] << 4, 1, 3) | (data[2] >> 4);
  // last 4 bits becomes bits 1-4;    first 3 bits becomes last 3
  subject->credits[1] = mask_byte(data[2] << 3, 1, 4) | (data[3] >> 5);
  // last 5 bits becomes first bits 1-5;    first 2 bits becomes last 2 bits
  subject->credits[2] = mask_byte(data[3] << 2, 1, 5) | data[4] >> 6;
  // last 6 bits becomes bits 1-6;  first bit becomes last bit
  subject->credits[3] = mask_byte(data[4] << 1, 1, 6) | data[5] >> 7;
  // last 7 bits becomes bits 1-7
  subject->credits[4] = mask_byte(data[5], 1, 7);
  // first 3 bits becomes last 3
  subject->mark = (data[6] >> 5) + 5;
  // last 5 bits becomes last 5
  subject->day = mask_byte(data[6], 3, 5);
  //first 4 bits becomes last 4
  subject->month = data[7] >> 4;
  subject->year = mask_byte(data[7], 4, 4);
  subject->year = (subject->year << 8)  | data[8];
  strncpy(subject->code, (const char *)data + 9, number_of_chars(SUBJECT_CODE));
  strncpy(subject->name, (const char *)data + 9 + number_of_chars(SUBJECT_CODE) , number_of_chars(SUBJECT_NAME));
  strncpy(subject->teacher_name, (const char *)data + 9 + number_of_chars(SUBJECT_CODE) + number_of_chars(SUBJECT_NAME), number_of_chars(SUBJECT_TEACHER_NAME));
}

void subject_to_bytes(Subject *subject, byte *data) {
  //last 7 bits becomes first 7;  last bit becomes last bit in data[0]
  data[0] = (subject->semester << 1) | mask_byte((byte) subject->is_required, 7, 1);
  //Serial.println(subject->is_required);
  //Serial.println(mask_byte((byte) subject->is_required, 7, 1));
  // last 4 bit from espb becomes first 4 in data byte;   last bit in is_signed becomes 4-th bit in data byte;    bits from 1-3 becomes last 3 bits in data byte
  data[1] = (subject->espb << 4) | mask_byte(subject->is_signed << 3, 4, 1) | mask_byte(subject->credits[0] >> 4, 5, 3);
  // last 4 bits in credit[0] becomes first 4;    bits from 1-4 becomes last 4 bits
  data[2] = (subject->credits[0] << 4) | mask_byte(subject->credits[1] >> 3, 4, 4);
  // last 3 bits becomes first 3 bits;    bits from 1-5 becomes last 5 bits
  data[3] = (subject->credits[1] << 5) | mask_byte(subject->credits[2] >> 2, 3, 5);
  // last 2 bits becomes first 2;   bits from 1-6 becomes last 6 bits
  data[4] = (subject->credits[2] << 6) | mask_byte(subject->credits[3] >> 1, 2, 6);
  // last bit becomes first bit;    last 7 bits becomes last 7 bits
  data[5] = (subject->credits[3] << 7) | mask_byte(subject->credits[4], 1, 7);
  // 3 bits from mark; 5 bits from day
  data[6] = ((subject->mark - 5) << 5) | mask_byte(subject->day, 3, 5);
  // 4 bits from month;   first 4 bits from year
  data[7] = (subject->month << 4) | mask_byte(highByte(subject->year), 4, 4);
  // last 8 bits of year
  data[8] = lowByte(subject->year);
  strncpy((char *)data + 9, subject->code, number_of_chars(SUBJECT_CODE));
  strncpy((char *)data + 9 + number_of_chars(SUBJECT_CODE), subject->name, number_of_chars(SUBJECT_NAME));
  strncpy((char *)data + 9 + number_of_chars(SUBJECT_CODE) + number_of_chars(SUBJECT_NAME) , subject->teacher_name, number_of_chars(SUBJECT_TEACHER_NAME));
}

byte create_mask(byte start, byte length) {
  byte b = 0;
  for (byte i = 0; i < start + length - 1; i++) {
    if (i < length) {
      b = (b | 128);
    }
    b = b >> 1;
  }
  return b;
}

byte mask_byte(byte b, byte start, byte length) {
  byte mask = create_mask(start, length);
  //  Serial.print(F("mask "));
  //  Serial.print(start);
  //  Serial.print(F(" "));
  //  Serial.print(length);
  //  Serial.print(F(" "));
  //  Serial.println(mask);
  return b & mask;
}

void dump_subject(Subject *subject) {
  //dump_byte_array((byte*)subject->code, number_of_chars(SUBJECT_CODE),''.');
  //

  //Serial.print(F("."));
  Serial.print(subject->semester);
  Serial.print(F("."));
  Serial.print(subject->is_required);
  Serial.print(F("."));

  Serial.print(subject->espb);
  Serial.print(F("."));
  Serial.print(subject->is_signed);

  for (byte i = 0; i < 5; i++) {
    Serial.print(F("."));
    Serial.print(subject->credits[i]);
  }
  Serial.print(F("."));
  Serial.print(subject->mark);
  Serial.print(F("."));
  Serial.print(subject->day);
  Serial.print(F("."));
  Serial.print(subject->month);
  Serial.print(F("."));
  Serial.print(subject->year);
  Serial.print(F("."));
  Serial.write(subject->code, number_of_chars(SUBJECT_CODE));
  Serial.print(F("."));
  Serial.write(subject->name, number_of_chars(SUBJECT_NAME));
  Serial.print(F("."));
  Serial.write(subject->teacher_name, number_of_chars(SUBJECT_TEACHER_NAME));
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
        return blockAddr + 15 - (b % 16);
      }
      break;
    default:
      //32 sectors with 4 bytes
      if (blockAddr < 128) { // 32 * 4
        return blockAddr + 3 - (blockAddr % 4);
      }
      //8 sectors with 16 bytes
      else {
        byte b = blockAddr - 128;
        return blockAddr + 15 - (b % 16);
      }
      break;
  }
}

MFRC522::StatusCode lock_sector(byte sector, byte trailerBlock, byte* key) {
  byte trailerBuffer[] = {
    255, 255, 255, 255, 255, 255,       // Keep default key A
    0, 0, 0,
    0,
    key[0], key[1], key[2], key[3], key[4], key[5]
  };
  if (sector < 32) {
    mfrc522.MIFARE_SetAccessBits(&trailerBuffer[6], 4, 4, 4, 7);
  }
  else {
    mfrc522.MIFARE_SetAccessBits(&trailerBuffer[6], 4, 2, 2, 7);
  }
  //dump_byte_array(trailerBuffer, BYTES_PER_BLOCK, '.');
  //lock sector and change key
  return (MFRC522::StatusCode) mfrc522.MIFARE_Write(trailerBlock, trailerBuffer, BYTES_PER_BLOCK);
  //return MFRC522::STATUS_OK;
}

