import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {
  AnimatedPanel,
  AnimatedPressable,
  AppButton,
  AppHeader,
  AppInput,
  Notice,
  ui,
} from '../components/ui';
import {RootStackParamList} from '../navigation/types';
import {colors} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({navigation}: Props) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await apiClient.request<{message: string}>('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({email}),
      });
      setMessage(response.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const isError = message.toLowerCase().includes('no se pudo');

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <AppHeader
        title="Recuperar contrasena"
        subtitle="Solicita un token de restablecimiento en tu correo registrado."
        onBack={() => navigation.navigate('Login')}
        right={
          <View style={forgotStyles.headerIcon}>
            <Icon name="lock-reset" size={25} color={colors.green} />
          </View>
        }
      />

      {message ? <Notice message={message} type={isError ? 'error' : 'success'} /> : null}

      <AnimatedPanel delay={120} style={forgotStyles.card}>
        <AppInput
          label="Correo electronico"
          icon="email"
          placeholder="socio@correo.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <AppButton
          label={loading ? 'Enviando...' : 'Enviar solicitud'}
          icon="send"
          onPress={submit}
          loading={loading}
        />
        <AppButton
          label="Ya tengo un token"
          icon="vpn-key"
          onPress={() => navigation.navigate('ResetPassword')}
          variant="secondary"
        />
      </AnimatedPanel>

      <AnimatedPressable
        style={forgotStyles.backLink}
        onPress={() => navigation.navigate('Login')}>
        <Icon name="arrow-back" size={18} color={colors.green} />
        <Text style={forgotStyles.backText}>Volver al login</Text>
      </AnimatedPressable>
    </ScrollView>
  );
}

const forgotStyles = StyleSheet.create({
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
  backLink: {
    minHeight: 44,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backText: {
    color: colors.green,
    fontWeight: '900',
  },
});
