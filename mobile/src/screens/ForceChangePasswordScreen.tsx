import React, {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {useAuth} from '../auth/AuthContext';
import {
  AnimatedPanel,
  AnimatedPressable,
  AppButton,
  AppHeader,
  AppInput,
  Notice,
  ui,
} from '../components/ui';
import {colors} from '../styles';

export function ForceChangePasswordScreen() {
  const {reloadMe} = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden. Revisa ambos campos.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.request('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({new_password: password}),
      });
      await reloadMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <AppHeader
        title="Cambio obligatorio"
        subtitle="Actualiza tu contrasena temporal para continuar usando la aplicacion."
        right={
          <View style={forceStyles.headerIcon}>
            <Icon name="security" size={25} color={colors.green} />
          </View>
        }
      />

      {error ? <Notice message={error} type="error" /> : null}

      <AnimatedPanel delay={120} style={forceStyles.card}>
        <AppInput
          label="Nueva contrasena"
          icon="lock"
          placeholder="Ingresa una nueva clave"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          right={
            <AnimatedPressable
              style={forceStyles.eyeButton}
              accessibilityLabel={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              onPress={() => setShowPassword(current => !current)}>
              <Icon
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={21}
                color={colors.muted}
              />
            </AnimatedPressable>
          }
        />
        <AppInput
          label="Confirmar contrasena"
          icon="lock-outline"
          placeholder="Vuelve a escribir la clave"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          right={
            <AnimatedPressable
              style={forceStyles.eyeButton}
              accessibilityLabel={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              onPress={() => setShowPassword(current => !current)}>
              <Icon
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={21}
                color={colors.muted}
              />
            </AnimatedPressable>
          }
        />
        <AppButton
          label={loading ? 'Guardando...' : 'Guardar contrasena'}
          icon="save"
          onPress={submit}
          loading={loading}
          disabled={!password || !confirmPassword}
        />
      </AnimatedPanel>
    </ScrollView>
  );
}

const forceStyles = StyleSheet.create({
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
});
