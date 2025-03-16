import React, {useEffect} from 'react';
import {View, Text} from 'react-native';
import LottieView from 'lottie-react-native';

const SuccessScreen: React.FC = ({navigation, route}) => {
  const {partnerId, message = 'Delivery Partner Registered!'} = route.params;

  useEffect(() => {
    const timer = setTimeout(
      () => navigation.navigate('DeliveryService'),
      2000,
    );
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <LottieView
        source={require('../assets/animations/confirm.json')} // Replace with your Lottie file
        autoPlay
        loop={false}
        style={{width: 200, height: 200}}
      />
      <Text>
        {message} ID: {partnerId}
      </Text>
    </View>
  );
};

export default SuccessScreen;
