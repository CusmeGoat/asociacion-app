import React, {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {useAuth} from '../auth/AuthContext';
import {AnimatedPanel, AppButton, AppHeader, AppInput, Notice, ui} from '../components/ui';
import {colors} from '../styles';

export function ForceChangePasswordScreen() {
  const {reloadMe} = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError('');
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
          secureTextEntry
        />
        <AppButton
          label={loading ? 'Guardando...' : 'Guardar contrasena'}
          icon="save"
          onPress={submit}
          loading={loading}
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
});
