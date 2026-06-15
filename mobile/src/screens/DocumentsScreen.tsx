import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Text, TouchableOpacity, View} from 'react-native';
import {pick, types} from '@react-native-documents/picker';

import {apiClient} from '../api/ApiClient';
import {DocumentItem} from '../types';
import {colors, styles} from '../styles';

export function DocumentsScreen() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setDocuments(await apiClient.request<DocumentItem[]>('/documentos/'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async () => {
    const [file] = await pick({type: [types.pdf]});
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name ?? 'documento.pdf',
      type: file.type ?? 'application/pdf',
    } as unknown as Blob);

    await apiClient.request('/documentos/cargar', {
      method: 'POST',
      body: form,
    });
    setMessage('Documento subido. La indexacion semantica se procesa en segundo plano.');
    await load();
  };

  const remove = async (id: number) => {
    await apiClient.request(`/documentos/${id}`, {method: 'DELETE'});
    await load();
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.button} onPress={upload}>
        <Text style={styles.buttonText}>Subir PDF</Text>
      </TouchableOpacity>
      {message ? <Text style={styles.subtitle}>{message}</Text> : null}
      <FlatList
        data={documents}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={{fontWeight: '700', color: colors.ink}}>{item.filename}</Text>
            <Text style={styles.small}>Estado: {item.status}</Text>
            {item.error_message ? <Text style={styles.error}>{item.error_message}</Text> : null}
            <TouchableOpacity style={styles.secondaryButton} onPress={() => remove(item.id)}>
              <Text style={styles.secondaryText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
