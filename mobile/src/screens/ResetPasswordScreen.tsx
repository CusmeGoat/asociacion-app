import React, {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {AnimatedPanel, AppButton, AppHeader, AppInput, Notice, ui} from '../components/ui';
import {RootStackParamList} from '../navigation/types';
import {colors} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({navigation}: Props) {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await apiClient.request<{message: string}>('/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({token, new_password: password}),
      });
      setMessage(response.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo restablecer la contrasena');
    } finally {
      setLoading(false);
    }
  };

  const isError = message.toLowerCase().includes('no se pudo');

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <AppHeader
        title="Restablecer contrasena"
        subtitle="Ingresa el token recibido por correo y define una nueva clave."
        onBack={() => navigation.navigate('ForgotPassword')}
        right={
          <View style={resetStyles.headerIcon}>
            <Icon name="password" size={25} color={colors.green} />
          </View>
        }
      />

      {message ? <Notice message={message} type={isError ? 'error' : 'success'} /> : null}

      <AnimatedPanel delay={120} style={resetStyles.card}>
        <AppInput
          label="Token"
          icon="vpn-key"
          placeholder="Codigo de recuperacion"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
        />
        <AppInput
          label="Nueva contrasena"
          icon="lock"
          placeholder="Nueva contrasena"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <AppButton
          label={loading ? 'Restableciendo...' : 'Restablecer'}
          icon="check-circle"
          onPress={submit}
          loading={loading}
        />
      </AnimatedPanel>
    </ScrollView>
  );
}

const resetStyles = StyleSheet.create({
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.greenDark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
});
