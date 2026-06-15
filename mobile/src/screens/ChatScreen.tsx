import React, {useState} from 'react';
import {FlatList, Text, TextInput, TouchableOpacity, View} from 'react-native';

import {apiClient} from '../api/ApiClient';
import {ChatSource} from '../types';
import {colors, styles} from '../styles';

type Message = {
  role: 'user' | 'bot';
  text: string;
  fuentes: ChatSource[];
};

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Soy el asistente documental. Consulto unicamente los documentos cargados por la asociacion.',
      fuentes: [],
    },
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const pregunta = text.trim();
    if (!pregunta) return;
    setText('');
    setLoading(true);
    setMessages(current => [...current, {role: 'user', text: pregunta, fuentes: []}]);

    try {
      const response = await apiClient.request<{respuesta: string; fuentes: ChatSource[]}>(
        '/chatbot/consultar',
        {
          method: 'POST',
          body: JSON.stringify({pregunta}),
        },
      );
      setMessages(current => [
        ...current,
        {role: 'bot', text: response.respuesta, fuentes: response.fuentes},
      ]);
    } catch (err) {
      setMessages(current => [
        ...current,
        {
          role: 'bot',
          text: err instanceof Error ? err.message : 'No se pudo consultar',
          fuentes: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={messages}
        keyExtractor={(_, index) => String(index)}
        renderItem={({item}) => (
          <View
            style={[
              styles.card,
              {backgroundColor: item.role === 'user' ? colors.greenSoft : '#fff'},
            ]}>
            <Text style={{color: colors.ink}}>{item.text}</Text>
            {item.fuentes.map(source => (
              <Text key={`${source.document_name}-${source.page_number}`} style={styles.small}>
                Pag. {source.page_number} | {source.document_name}
              </Text>
            ))}
          </View>
        )}
      />
      <TextInput
        style={styles.input}
        placeholder="Pregunta sobre estatutos, actas o documentos..."
        value={text}
        onChangeText={setText}
      />
      <TouchableOpacity style={styles.button} onPress={send} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Consultando...' : 'Enviar'}</Text>
      </TouchableOpacity>
    </View>
  );
}
