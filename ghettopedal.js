/*
 * ghetto pedal by @wocsor. this code makes a lot of assumptions about the gas pedal. you must change these to match yours.
 * oh and also i take no responsibility for the things you do with this. use my ugly code at your own risk!
 * onions did cry when i showed this hot garbo to them.
 * also dbc edits will need to be made. this 
*/

//gas_input = 0x200
//gas_output = 0x201
//message lenth = 6 bytes

#include <MCP41_Simple.h>
#include <mcp_can.h> //for MCP2515
#include <mcp_can_dfs.h>
#include <SPI.h>

MCP41_Simple pot0;
MCP41_Simple pot1;
MCP_CAN CAN(10); //SPI pin for CAN shield

unsigned char accel[] = {0x00, 0x03, 0x63, 0x00, 0x00, 0x00, 0x00, 0x74};
unsigned char val[8] = {0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0};
const int CS[3] = {8, 9, 10};
unsigned char len = 0;
unsigned char buf[8];
unsigned int canID;
unsigned int pedal0 = 0;
unsigned int pedal1 = 0;
int accel_cmd;

void setup() {
  // put your setup code here, to run once:
  //Serial.begin(115200);
  //init the pots
  pot0.begin(CS[0]);
  pot1.begin(CS[1]);
  //check that can shield works
  if (CAN_OK == CAN.begin(CAN_500KBPS))     //setting CAN baud rate to 500Kbps
  {
    Serial.println("CAN BUS Shield init ok!");
  }
  else
  {
    Serial.println("CAN BUS Shield init fail");
    Serial.println("Init CAN BUS Shield again");
  }

}

void loop() {
  // put your main code here, to run repeatedly:
  
  pedal0 = analogRead(A0);
  pedal1 = analogRead(A1);

  //read CAN bus for accel_cmd
  CAN.readMsgBuf(&len, buf);    //read data,  len: data length, buf: data buffer
  canID = CAN.getCanId();       //getting the ID of the incoming message

  if ((pedal0 + pedal1) < 20) { //20 is an example. use the real default values from the pedal + a threshold.

    //filter for the good stuff
    if (canID == 0x200)            //Read msg with ID 0x200, do whatever is below.
    {
      accel_cmd = buf[1];
      accel_cmd = accel_cmd << 8;
      accel_cmd = accel_cmd + buf[2];

      if (accel_cmd > 0) //accel_cmd > 0 means OP wants the car to accelerate. we set the pots accordingly
      {
        CAN.sendMsgBuf(0x343, 0, 8, accel);
        pot0.setWiper(accel_cmd / 32);
        pot1.setWiper(accel_cmd / 32);
      }
      else if (accel_cmd > 0) //accel_cmd < 0, so we forward the Eon's braking messages to the car's CAN bus
      {
        CAN.sendMsgBuf(0x343, 0, len, buf);
        pot0.setWiper(pedal0);
        pot1.setWiper(pedal1);
      }
    }
  }

  else //gas is being pressed, so we send it right through.
  {
    val[7] = pedal0;
    val[8] = pedal1;
    pot0.setWiper(pedal0);
    pot1.setWiper(pedal1);
    CAN.sendMsgBuf(0x201, 0, 8, val); //send whatever is in val
}
