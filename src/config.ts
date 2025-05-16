// src/config.ts
export const config = {
  BASE_URL: 'http://10.0.2.2:3000/api', // API base URL for axios
  SOCKET_URL: 'http://10.0.2.2:3000/', // WebSocket URL for socket.io - removed /api for socket connection
  
  // Testing configuration
  TESTING: {
    // Enable/disable testing mode - set to false in production
    ENABLED: true,
    // Test phone numbers that will bypass OTP verification
    // Format should match your app's phone number format (with or without country code)
    TEST_PHONE_NUMBERS: [
      '+919999999999',  // Test number 1
      '+918888888888',  // Test number 2
      '+911234567890'   // Test number 3
    ],
    // Default OTP code to use for test numbers (for logging purposes)
    DEFAULT_TEST_OTP: '1234'
  }
};