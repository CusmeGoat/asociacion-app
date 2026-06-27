import React, {useState} from 'react';
import {Modal, ScrollView, StyleSheet, Text, View} from 'react-native';
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
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [showSuccess, setShowSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submitRequest = async () => {
    setLoading(true);
    setMessage('');
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
      if (response.reset_token) {
        setToken(response.reset_token);
      }
      setStep('reset');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    setMessage('');
    if (password.length < 8) {
      setMessage('La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Las contrasenas no coinciden. Revisa ambos campos.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.request<{message: string}>('/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({token, new_password: password}),
      });
      setShowSuccess(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo restablecer la contrasena');
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = () => setShowPassword(current => !current);
  const renderPasswordEye = () => (
    <AnimatedPressable
      style={forgotStyles.eyeButton}
      accessibilityLabel={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
      onPress={togglePassword}>
      <Icon
        name={showPassword ? 'visibility-off' : 'visibility'}
        size={21}
        color={colors.muted}
      />
    </AnimatedPressable>
  );
  const normalizedMessage = message.toLowerCase();
  const isError =
    normalizedMessage.includes('no se pudo') ||
    normalizedMessage.includes('no coinciden') ||
    normalizedMessage.includes('debe tener');

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
      keyboardShouldPersistTaps="handled">
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

      <AnimatedPanel delay={120} layout={false} style={forgotStyles.card}>
        {step === 'request' ? (
          <>
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
              onPress={submitRequest}
              loading={loading}
              disabled={!email}
            />
            <AppButton
              label="Ya tengo un codigo"
              icon="vpn-key"
              onPress={() => {
                setStep('reset');
                setMessage('');
              }}
              variant="secondary"
            />
          </>
        ) : (
          <>
            <AppInput
              label="Codigo de recuperacion"
              icon="vpn-key"
              placeholder="Ingresa el codigo"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
            />
            <AppInput
              label="Nueva contrasena"
              icon="lock"
              placeholder="Escribe la nueva contrasena"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              right={renderPasswordEye()}
            />
            <AppInput
              label="Confirmar contrasena"
              icon="lock-outline"
              placeholder="Repite la nueva contrasena"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              right={renderPasswordEye()}
            />
            <AppButton
              label={loading ? 'Guardando...' : 'Cambiar contrasena'}
              icon="check-circle"
              onPress={submitReset}
              loading={loading}
              disabled={!token || !password || !confirmPassword}
            />
          </>
        )}
      </AnimatedPanel>

      <AnimatedPressable
        style={forgotStyles.backLink}
        onPress={() => navigation.navigate('Login')}>
        <Icon name="arrow-back" size={18} color={colors.green} />
        <Text style={forgotStyles.backText}>Volver al login</Text>
      </AnimatedPressable>

      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={forgotStyles.modalOverlay}>
          <AnimatedPanel entrance="up" style={forgotStyles.modalCard}>
            <View style={forgotStyles.modalIconContainer}>
              <Icon name="check-circle" size={54} color={colors.green} />
            </View>
            <Text style={forgotStyles.modalTitle}>Contrasena cambiada</Text>
            <Text style={forgotStyles.modalText}>
              Tu contrasena ha sido actualizada correctamente. Ya puedes acceder a tu cuenta
              con tu nueva clave.
            </Text>
            <AppButton
              label="Ir a iniciar sesion"
              icon="login"
              onPress={() => {
                setShowSuccess(false);
                navigation.navigate('Login');
              }}
            />
          </AnimatedPanel>
        </View>
      </Modal>
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
  eyeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
});
