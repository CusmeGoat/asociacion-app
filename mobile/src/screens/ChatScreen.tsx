import React, {useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {
  AnimatedListItem,
  AnimatedPanel,
  AnimatedPressable,
  AppHeader,
  BottomNav,
  LoadingState,
  ui,
} from '../components/ui';
import {ChatSource} from '../types';
import {colors} from '../styles';

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
    if (!pregunta || loading) return;
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
    <KeyboardAvoidingView
      style={ui.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={chatStyles.content}>
        <AppHeader
          title="Asistente documental"
          subtitle="Responde con base en documentos institucionales indexados."
          right={
            <View style={chatStyles.headerIcon}>
              <Icon name="auto-awesome" size={24} color={colors.green} />
            </View>
          }
        />

        <FlatList
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={chatStyles.thread}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            loading ? (
              <LoadingState
                title="Consultando documentos..."
                detail="Buscando fragmentos relevantes en la biblioteca indexada."
              />
            ) : null
          }
          renderItem={({item, index}) => {
            const user = item.role === 'user';
            return (
              <AnimatedListItem index={index} entrance={user ? 'right' : 'left'}>
                <View style={[chatStyles.messageRow, user ? chatStyles.userRow : null]}>
                  <View
                    style={[
                      chatStyles.bubble,
                      user ? chatStyles.userBubble : chatStyles.botBubble,
                    ]}>
                    <Text style={[chatStyles.messageText, user ? chatStyles.userText : null]}>
                      {item.text}
                    </Text>
                    {item.fuentes.length ? (
                      <View style={chatStyles.sources}>
                        <Text style={chatStyles.sourceTitle}>Fuentes consultadas</Text>
                        {item.fuentes.map(source => (
                          <View
                            key={`${source.document_name}-${source.page_number}`}
                            style={chatStyles.sourceChip}>
                            <Icon name="description" size={15} color={colors.green} />
                            <Text style={chatStyles.sourceText}>
                              Pag. {source.page_number} | {source.document_name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              </AnimatedListItem>
            );
          }}
        />
      </View>

      <AnimatedPanel entrance="down" style={chatStyles.composer}>
        <TextInput
          style={chatStyles.input}
          placeholder="Pregunta sobre estatutos, actas o documentos..."
          placeholderTextColor="#8a97a3"
          value={text}
          onChangeText={setText}
          showSoftInputOnFocus
          multiline
        />
        <AnimatedPressable style={chatStyles.sendButton} onPress={send} disabled={loading}>
          <Icon name={loading ? 'hourglass-top' : 'send'} size={22} color="#fff" />
        </AnimatedPressable>
      </AnimatedPanel>
      <BottomNav active="chat" />
    </KeyboardAvoidingView>
  );
}

const chatStyles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: {
    paddingBottom: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: colors.greenDark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 1,
  },
  botBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  userBubble: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  messageText: {
    color: colors.ink,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  sources: {
    marginTop: 10,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 9,
  },
  sourceTitle: {
    color: colors.muted,
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 6,
  },
  sourceChip: {
    backgroundColor: '#fbfff8',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  sourceText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
  },
  composer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    backgroundColor: '#f8faf7',
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.greenDark,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 5},
    elevation: 3,
  },
});
