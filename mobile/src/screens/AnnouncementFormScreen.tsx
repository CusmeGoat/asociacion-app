import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {AnimatedPanel, AppButton, AppHeader, AppInput, Notice, ui} from '../components/ui';
import {RootStackParamList} from '../navigation/types';
import {colors} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AnnouncementForm'>;

export function AnnouncementFormScreen({navigation, route}: Props) {
  const current = route.params?.announcement;
  const [title, setTitle] = useState(current?.title ?? '');
  const [content, setContent] = useState(current?.content ?? '');
  const [category, setCategory] = useState(current?.category ?? 'GENERAL');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setMessage('');
    try {
      const body = JSON.stringify({title, content, category});
      if (current) {
        await apiClient.request(`/announcements/${current.id}`, {method: 'PUT', body});
      } else {
        await apiClient.request('/announcements/', {method: 'POST', body});
      }
      setMessage('Anuncio guardado correctamente');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (active: boolean) => {
    if (!current) return;
    await apiClient.request(
      `/announcements/${current.id}/${active ? 'activate' : 'deactivate'}`,
      {method: 'PATCH'},
    );
    navigation.goBack();
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <AppHeader
        title={current ? 'Editar anuncio' : 'Crear anuncio'}
        subtitle="Publica informacion institucional para los socios de la asociacion."
        onBack={() => navigation.navigate('Home')}
        right={
          <View style={announcementStyles.headerIcon}>
            <Icon name="campaign" size={25} color={colors.green} />
          </View>
        }
      />

      {message ? <Notice message={message} type="success" /> : null}

      <AnimatedPanel delay={120} style={announcementStyles.card}>
        <View style={announcementStyles.formIntro}>
          <Icon name="eco" size={20} color={colors.riceGold} />
          <Text style={announcementStyles.formIntroText}>
            El anuncio se mostrara en el inicio y generara avisos para los socios.
          </Text>
        </View>
        <AppInput
          label="Titulo"
          icon="title"
          placeholder="Convocatoria a reunion"
          value={title}
          onChangeText={setTitle}
        />
        <AppInput
          label="Categoria"
          icon="category"
          placeholder="GENERAL"
          value={category}
          onChangeText={setCategory}
          autoCapitalize="characters"
        />
        <Text style={announcementStyles.label}>Contenido</Text>
        <TextInput
          style={announcementStyles.textArea}
          placeholder="Escribe el detalle del anuncio..."
          placeholderTextColor="#8a97a3"
          value={content}
          onChangeText={setContent}
          multiline
        />
        <AppButton
          label={saving ? 'Guardando...' : 'Guardar anuncio'}
          icon="save"
          onPress={submit}
          loading={saving}
        />
      </AnimatedPanel>

      {current ? (
        <AnimatedPanel delay={220} style={announcementStyles.actionRow}>
          <AppButton
            label="Desactivar"
            icon="visibility-off"
            onPress={() => setActive(false)}
            variant="secondary"
          />
          <AppButton
            label="Activar"
            icon="visibility"
            onPress={() => setActive(true)}
            variant="secondary"
          />
        </AnimatedPanel>
      ) : null}
    </ScrollView>
  );
}

const announcementStyles = StyleSheet.create({
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
  formIntro: {
    backgroundColor: colors.riceSoft,
    borderColor: '#ecdca8',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  formIntroText: {
    flex: 1,
    color: colors.muted,
    lineHeight: 18,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textArea: {
    minHeight: 140,
    backgroundColor: '#fbfdf9',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  actionRow: {
    marginTop: 8,
  },
});
