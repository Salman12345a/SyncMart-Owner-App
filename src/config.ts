// src/config.ts
export const config = {
  BASE_URL: 'http://10.0.2.2:3000/api', // API base URL for axios
  SOCKET_URL: 'http://10.0.2.2:3000/', // WebSocket URL for socket.io - removed /api for socket connection,
  TESTING: {
    ENABLED: false,
    TEST_PHONE_NUMBERS: [] as string[],
    DEFAULT_TEST_OTP: '1234',
  }
  
 
};

//https://dokirana-85740.el.r.appspot.com/
//http://10.0.2.2:3000/

