import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useAuth} from '../auth/AuthContext';
import {RootStackParamList} from '../navigation/types';
import {styles} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({navigation}: Props) {
  const {register} = useAuth();
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');

  const update = (key: keyof typeof form, value: string) => setForm({...form, [key]: value});

  const submit = async () => {
    setMessage('');
    try {
      await register(form);
      setMessage('Registro creado correctamente. Ya puedes iniciar sesion.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo registrar');
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Registro de socio</Text>
      {message ? <Text style={styles.subtitle}>{message}</Text> : null}
      {Object.keys(form).map(key => (
        <TextInput
          key={key}
          style={styles.input}
          placeholder={key}
          secureTextEntry={key === 'password'}
          value={form[key as keyof typeof form]}
          onChangeText={value => update(key as keyof typeof form, value)}
        />
      ))}
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Registrarse</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.secondaryText}>Volver al login</Text>
      </TouchableOpacity>
    </View>
  );
}
