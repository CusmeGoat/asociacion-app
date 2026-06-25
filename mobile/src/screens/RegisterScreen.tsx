import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
import {RootStackParamList} from '../navigation/types';
import {colors} from '../styles';

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
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm({...form, [key]: value});

  const submit = async () => {
    setLoading(true);
    setMessage('');
    try {
      await register(form);
      setMessage('Registro creado correctamente. Ya puedes iniciar sesion.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  };

  const success = message.includes('correctamente');

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <AppHeader
        title="Registro de socio"
        subtitle="Crea una cuenta para consultar anuncios, documentos y el asistente documental."
        onBack={() => navigation.navigate('Login')}
        right={
          <View style={registerStyles.headerIcon}>
            <Icon name="how-to-reg" size={25} color={colors.green} />
          </View>
        }
      />

      {message ? <Notice message={message} type={success ? 'success' : 'error'} /> : null}

      <AnimatedPanel delay={120} style={registerStyles.card}>
        <AppInput
          label="Nombres"
          icon="person"
          placeholder="Juan Carlos"
          value={form.nombres}
          onChangeText={value => update('nombres', value)}
        />
        <AppInput
          label="Apellidos"
          icon="badge"
          placeholder="Salas Cox"
          value={form.apellidos}
          onChangeText={value => update('apellidos', value)}
        />
        <AppInput
          label="Cedula"
          icon="credit-card"
          placeholder="0920000000"
          value={form.cedula}
          onChangeText={value => update('cedula', value)}
          keyboardType="number-pad"
        />
        <AppInput
          label="Correo electronico"
          icon="email"
          placeholder="socio@correo.com"
          value={form.email}
          onChangeText={value => update('email', value)}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <AppInput
          label="Contrasena"
          icon="lock"
          placeholder="Crea una contrasena"
          value={form.password}
          onChangeText={value => update('password', value)}
          secureTextEntry
        />
        <AppButton
          label={loading ? 'Creando cuenta...' : 'Registrarse'}
          icon="person-add"
          onPress={submit}
          loading={loading}
        />
      </AnimatedPanel>

      <AnimatedPressable
        style={registerStyles.backLink}
        onPress={() => navigation.navigate('Login')}>
        <Icon name="arrow-back" size={18} color={colors.green} />
        <Text style={registerStyles.backText}>Volver al inicio de sesion</Text>
      </AnimatedPressable>
    </ScrollView>
  );
}

const registerStyles = StyleSheet.create({
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
