import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useAuth} from '../auth/AuthContext';
import {AnnouncementFormScreen} from '../screens/AnnouncementFormScreen';
import {ChatScreen} from '../screens/ChatScreen';
import {DocumentsScreen} from '../screens/DocumentsScreen';
import {ForceChangePasswordScreen} from '../screens/ForceChangePasswordScreen';
import {ForgotPasswordScreen} from '../screens/ForgotPasswordScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {ResetPasswordScreen} from '../screens/ResetPasswordScreen';
import {UsersScreen} from '../screens/UsersScreen';
import {colors} from '../styles';
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  animation: 'fade_from_bottom' as const,
  contentStyle: {backgroundColor: colors.appBg},
};

export function AppNavigator() {
  const {user, isSecretary} = useAuth();

  if (!user) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="Login" component={LoginScreen} options={{title: 'Login'}} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{title: 'Registro'}} />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{title: 'Recuperar contrasena'}}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{title: 'Restablecer contrasena'}}
        />
      </Stack.Navigator>
    );
  }

  if (user.must_change_password) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="ForceChangePassword"
          component={ForceChangePasswordScreen}
          options={{title: 'Cambiar contrasena'}}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Asociacion'}} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{title: 'Asistente documental'}} />
      <Stack.Screen name="Documents" component={DocumentsScreen} options={{title: 'Documentos'}} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notificaciones'}}
      />
      {isSecretary ? (
        <Stack.Screen name="Users" component={UsersScreen} options={{title: 'Usuarios'}} />
      ) : null}
      <Stack.Screen
        name="AnnouncementForm"
        component={AnnouncementFormScreen}
        options={{title: 'Anuncio'}}
      />
    </Stack.Navigator>
  );
}
