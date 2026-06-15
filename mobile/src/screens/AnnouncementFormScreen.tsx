import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {apiClient} from '../api/ApiClient';
import {RootStackParamList} from '../navigation/types';
import {styles} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AnnouncementForm'>;

export function AnnouncementFormScreen({navigation, route}: Props) {
  const current = route.params?.announcement;
  const [title, setTitle] = useState(current?.title ?? '');
  const [content, setContent] = useState(current?.content ?? '');
  const [category, setCategory] = useState(current?.category ?? 'GENERAL');
  const [message, setMessage] = useState('');

  const submit = async () => {
    const body = JSON.stringify({title, content, category});
    if (current) {
      await apiClient.request(`/announcements/${current.id}`, {method: 'PUT', body});
    } else {
      await apiClient.request('/announcements/', {method: 'POST', body});
    }
    setMessage('Anuncio guardado correctamente');
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
    <View style={styles.screen}>
      <Text style={styles.title}>{current ? 'Editar anuncio' : 'Crear anuncio'}</Text>
      {message ? <Text style={styles.subtitle}>{message}</Text> : null}
      <TextInput style={styles.input} placeholder="Titulo" value={title} onChangeText={setTitle} />
      <TextInput
        style={styles.input}
        placeholder="Categoria"
        value={category}
        onChangeText={setCategory}
      />
      <TextInput
        style={[styles.input, {height: 120, textAlignVertical: 'top'}]}
        placeholder="Contenido"
        value={content}
        onChangeText={setContent}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Guardar</Text>
      </TouchableOpacity>
      {current ? (
        <>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setActive(false)}>
            <Text style={styles.secondaryText}>Desactivar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setActive(true)}>
            <Text style={styles.secondaryText}>Activar</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}
