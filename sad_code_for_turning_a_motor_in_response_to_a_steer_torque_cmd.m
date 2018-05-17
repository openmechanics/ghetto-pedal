//by @wocsor. use this shit at your own risk, fam.

//Code to respond to steering message at address 0x2e4. Ensure that we are on CAN0 before starting.
//The 2nd and 3rd byte = steer_torque_cmd and should be a signed Big Endian message in DBC. This is based on Toyotas STEERING_LKA message/
//The 1st bye, last bit is the steer_request. This should be set to 1 before sending a torque cmd.


#include <SPI.h>         
#include <mcp_can.h>

MCP_CAN CAN(10); //SPI pin for CAN shield

unsigned char len = 0;         
unsigned char buf[8];
unsigned int canID;
unsigned int pwm;
int steer_torque_cmd;
unsigned int steer_request;

void setup()
{
  Serial.begin(115200);  

//INIT loop. If the CAN board is not detected, this will loop.
START_INIT:

  if (CAN_OK == CAN.begin(CAN_500KBPS))     //setting CAN baud rate to 500Kbps
  {
    Serial.println("CAN BUS Shield init ok!");
  }
  else
  {
    Serial.println("CAN BUS Shield init fail");
    Serial.println("Init CAN BUS Shield again");
    delay(100);
    goto START_INIT;
  }
}


void loop()
{
  if (CAN_MSGAVAIL == CAN.checkReceive())       //check if data coming
  {
    CAN.readMsgBuf(&len, buf);    //read data,  len: data length, buf: data buffer
    canID = CAN.getCanId();       //getting the ID of the incoming message

    if (canID == 0x2e4)            //Read msg with ID 0x2e4, do whatever is below.
    {
      //steer_torque_cmd is on 1st and 2nd bytes of ID 0x2e4
      steer_torque_cmd = buf[1];
      steer_torque_cmd = steer_torque_cmd << 8;
      steer_torque_cmd = steer_torque_cmd + buf[2];

      //we also need to ensure that steering is being requested
      steer_request = buf[0] & 0xFE; //can only be 1 or 0


      //now we do something with the data
      if (steer_request == 0) {
        if (steer_torque_cmd > 0) {
          //divide by 32 to get 1024 values for analogWrite
          pwm = abs(steer_torque_cmd / 32); 
          analogWrite(4, 0);
          analogWrite(3, pwm);
        }

        if (steer_torque_cmd < 0) {
          //divide by 32 to get 1024 values for analogWrite
          pwm = abs(steer_torque_cmd / 32);
          analogWrite(3, 0);          
          analogWrite(4, pwm);
        }      
      }
      else {
        //if there's no request, we want to make our motor flaccid. that's what she said. uh..
        pwm = 0;
        analogWrite(3, 0);
        analogWrite(4,0);
      }
    }
  }
}
