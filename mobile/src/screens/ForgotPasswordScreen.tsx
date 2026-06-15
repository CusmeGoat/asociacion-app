import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {apiClient} from '../api/ApiClient';
import {RootStackParamList} from '../navigation/types';
import {styles} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({navigation}: Props) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    const response = await apiClient.request<{message: string}>('/auth/forgot-password', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({email}),
    });
    setMessage(response.message);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Recuperar contrasena</Text>
      <TextInput style={styles.input} placeholder="Correo" value={email} onChangeText={setEmail} />
      {message ? <Text style={styles.subtitle}>{message}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Enviar solicitud</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('ResetPassword')}>
        <Text style={styles.secondaryText}>Ya tengo un token</Text>
      </TouchableOpacity>
    </View>
  );
}
