// src/config.ts
export const config = {
  BASE_URL: 'http://dokirana.ap-south-1.elasticbeanstalk.com/api', // API base URL for axios
  SOCKET_URL: 'http://dokirana.ap-south-1.elasticbeanstalk.com/', // WebSocket URL for socket.io - removed /api for socket connection
  
  // Testing configuration
  TESTING: {
    // Enable/disable testing mode - set to false in production
    ENABLED: true,
    // Test phone numbers that will bypass OTP verification
    // Format should match your app's phone number format (with or without country code)
    TEST_PHONE_NUMBERS: [
      '+919999999999',  // Test number 1

    ],
    // Default OTP code to use for test numbers (for logging purposes)
    DEFAULT_TEST_OTP: '1234'
  }
};