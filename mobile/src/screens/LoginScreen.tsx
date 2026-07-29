import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useAuth} from '../auth/AuthContext';
import {AnimatedPanel, AnimatedPressable, AppButton, AppInput, Notice} from '../components/ui';
import {RootStackParamList} from '../navigation/types';
import {colors} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({navigation}: Props) {
  const {login} = useAuth();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await login(cedula.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={loginStyles.screen} contentContainerStyle={loginStyles.content}>
      <AnimatedPanel entrance="down" style={loginStyles.hero}>
        <View style={loginStyles.logo}>
          <Icon name="grass" size={44} color={colors.green} />
        </View>
        <Text style={loginStyles.brand}>Asociacion Agricola</Text>
        <Text style={loginStyles.brandStrong}>10 de Mayo</Text>
        <Text style={loginStyles.brandSub}>Daule | Informacion institucional</Text>
      </AnimatedPanel>

      <AnimatedPanel delay={120} style={loginStyles.formCard}>
        <Text style={loginStyles.formTitle}>Iniciar sesion</Text>
        <Text style={loginStyles.formSubtitle}>Accede con tu cedula y contrasena.</Text>
        {error ? <Notice message={error} type="error" /> : null}
        <AppInput
          label="Cedula"
          icon="credit-card"
          placeholder="0920000000"
          value={cedula}
          onChangeText={setCedula}
          autoCapitalize="none"
          keyboardType="number-pad"
        />
        <AppInput
          label="Contrasena"
          icon="lock"
          placeholder="Tu contrasena"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          right={
            <AnimatedPressable
              style={loginStyles.eyeButton}
              accessibilityLabel={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              onPress={() => setShowPassword(current => !current)}>
              <Icon
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={22}
                color={colors.muted}
              />
            </AnimatedPressable>
          }
        />
        <AppButton
          label={loading ? 'Ingresando...' : 'Ingresar'}
          icon="login"
          onPress={submit}
          loading={loading}
        />
        <View style={loginStyles.linkRow}>
          <AnimatedPressable
            style={loginStyles.linkTouch}
            onPress={() => navigation.navigate('Register')}>
            <Text style={loginStyles.link}>Crear cuenta</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={loginStyles.linkTouch}
            onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={loginStyles.link}>Olvide mi clave</Text>
          </AnimatedPressable>
        </View>
      </AnimatedPanel>

      <AnimatedPanel delay={220} entrance="up" style={loginStyles.infoCard}>
        <Icon name="verified-user" size={24} color={colors.green} />
        <View style={loginStyles.infoCopy}>
          <Text style={loginStyles.infoTitle}>Acceso seguro</Text>
          <Text style={loginStyles.infoText}>
            Socios y secretarios consultan anuncios, documentos y asistencia documental.
          </Text>
        </View>
      </AnimatedPanel>
    </ScrollView>
  );
}

const loginStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  content: {
    paddingBottom: 28,
  },
  hero: {
    minHeight: 360,
    backgroundColor: '#dfeecf',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.surface,
    borderColor: colors.green,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: colors.greenDark,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  brand: {
    color: colors.greenDark,
    fontSize: 22,
    fontWeight: '900',
  },
  brandStrong: {
    color: colors.green,
    fontSize: 34,
    fontWeight: '900',
  },
  brandSub: {
    color: colors.muted,
    marginTop: 6,
  },
  formCard: {
    margin: 16,
    marginTop: -24,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowColor: colors.greenDark,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
  formTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  formSubtitle: {
    color: colors.muted,
    marginTop: 5,
    marginBottom: 14,
  },
  eyeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  linkTouch: {
    minHeight: 34,
    justifyContent: 'center',
  },
  link: {
    color: colors.green,
    fontWeight: '800',
  },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: colors.riceSoft,
    borderColor: '#ecdca8',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoCopy: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    color: colors.ink,
    fontWeight: '900',
    marginBottom: 4,
  },
  infoText: {
    color: colors.muted,
    lineHeight: 19,
  },
});
