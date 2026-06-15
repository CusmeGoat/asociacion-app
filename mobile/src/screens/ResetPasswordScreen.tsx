import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

import {apiClient} from '../api/ApiClient';
import {styles} from '../styles';

export function ResetPasswordScreen() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    const response = await apiClient.request<{message: string}>('/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({token, new_password: password}),
    });
    setMessage(response.message);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Restablecer contrasena</Text>
      <TextInput style={styles.input} placeholder="Token" value={token} onChangeText={setToken} />
      <TextInput
        style={styles.input}
        placeholder="Nueva contrasena"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {message ? <Text style={styles.subtitle}>{message}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Restablecer</Text>
      </TouchableOpacity>
    </View>
  );
}
