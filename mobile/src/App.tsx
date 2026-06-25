import React from 'react';
import {View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';

import {AuthProvider, useAuth} from './auth/AuthContext';
import {LoadingState} from './components/ui';
import {AppNavigator} from './navigation/AppNavigator';
import {styles} from './styles';

function Root() {
  const {loading} = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState
          title="Preparando la aplicacion"
          detail="Validando la sesion guardada del usuario."
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
