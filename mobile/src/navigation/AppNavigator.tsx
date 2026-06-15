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
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const {user} = useAuth();

  if (!user) {
    return (
      <Stack.Navigator>
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
      <Stack.Navigator>
        <Stack.Screen
          name="ForceChangePassword"
          component={ForceChangePasswordScreen}
          options={{title: 'Cambiar contrasena'}}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Asociacion'}} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{title: 'Asistente documental'}} />
      <Stack.Screen name="Documents" component={DocumentsScreen} options={{title: 'Documentos'}} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notificaciones'}}
      />
      <Stack.Screen name="Users" component={UsersScreen} options={{title: 'Usuarios'}} />
      <Stack.Screen
        name="AnnouncementForm"
        component={AnnouncementFormScreen}
        options={{title: 'Anuncio'}}
      />
    </Stack.Navigator>
  );
}
