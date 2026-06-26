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
  const [resetCode, setResetCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setMessage('');
    setResetCode('');
    try {
      const response = await apiClient.request<{message: string; reset_token?: string | null}>(
        '/auth/forgot-password',
        {
          method: 'POST',
          auth: false,
          body: JSON.stringify({email}),
        },
      );
      setMessage(response.message);
      setResetCode(response.reset_token ?? '');
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
        subtitle="Solicita un codigo de restablecimiento en tu correo registrado."
        onBack={() => navigation.navigate('Login')}
        right={
          <View style={forgotStyles.headerIcon}>
            <Icon name="lock-reset" size={25} color={colors.green} />
          </View>
        }
      />

      {message ? <Notice message={message} type={isError ? 'error' : 'success'} /> : null}
      {resetCode ? (
        <AnimatedPanel delay={80} style={forgotStyles.codeBox}>
          <Text style={forgotStyles.codeLabel}>Codigo para pruebas</Text>
          <Text style={forgotStyles.codeText}>{resetCode}</Text>
        </AnimatedPanel>
      ) : null}

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
          label="Ya tengo un codigo"
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
  codeBox: {
    backgroundColor: colors.riceSoft,
    borderColor: '#ecdca8',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  codeLabel: {
    color: colors.muted,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  codeText: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 4,
    marginTop: 6,
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
