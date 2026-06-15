import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

import {apiClient} from '../api/ApiClient';
import {useAuth} from '../auth/AuthContext';
import {styles} from '../styles';

export function ForceChangePasswordScreen() {
  const {reloadMe} = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      await apiClient.request('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({new_password: password}),
      });
      await reloadMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Cambio obligatorio</Text>
      <Text style={styles.subtitle}>Actualiza tu contrasena temporal para continuar.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Nueva contrasena"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Guardar contrasena</Text>
      </TouchableOpacity>
    </View>
  );
}
