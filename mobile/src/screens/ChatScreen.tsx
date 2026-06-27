import React, {useEffect, useRef, useState} from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardEvent,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {
  AnimatedListItem,
  AnimatedPressable,
  AppHeader,
  BottomNav,
  LoadingState,
  ui,
} from '../components/ui';
import {ChatbotResponse, ChatSource} from '../types';
import {colors} from '../styles';

type Message = {
  role: 'user' | 'bot';
  text: string;
  fuentes: ChatSource[];
  resumen?: string;
  puntos?: string[];
  aclaracion?: string | null;
  fragmentos?: ChatSource[];
  showFragments?: boolean;
};

export function ChatScreen() {
  const listRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Soy el asistente documental. Consulto unicamente los documentos cargados por la asociacion.',
      fuentes: [],
    },
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 80);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const send = async () => {
    const pregunta = text.trim();
    if (!pregunta || loading) return;
    setText('');
    setLoading(true);
    setMessages(current => [...current, {role: 'user', text: pregunta, fuentes: []}]);

    try {
      const response = await apiClient.request<ChatbotResponse>(
        '/chatbot/consultar',
        {
          method: 'POST',
          body: JSON.stringify({pregunta}),
        },
      );
      setMessages(current => [
        ...current,
        {
          role: 'bot',
          text: response.respuesta,
          resumen: response.resumen,
          puntos: response.puntos,
          aclaracion: response.aclaracion,
          fragmentos: response.fragmentos,
          fuentes: response.fuentes,
          showFragments: false,
        },
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

  const toggleFragments = (messageIndex: number) => {
    setMessages(current =>
      current.map((message, index) =>
        index === messageIndex
          ? {...message, showFragments: !message.showFragments}
          : message,
      ),
    );
  };

  return (
    <View style={ui.screen}>
      <View
        style={[
          chatStyles.content,
          keyboardHeight ? chatStyles.contentWithKeyboard : chatStyles.contentWithNav,
        ]}>
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
          ref={listRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={[
            chatStyles.thread,
            keyboardHeight ? chatStyles.threadWithKeyboard : chatStyles.threadWithNav,
          ]}
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
            const structuredBot =
              !user && (Boolean(item.resumen) || Boolean(item.puntos?.length) || Boolean(item.aclaracion));
            const fragments = item.fragmentos?.length ? item.fragmentos : item.fuentes;
            return (
              <AnimatedListItem index={index} entrance={user ? 'right' : 'left'}>
                <View style={[chatStyles.messageRow, user ? chatStyles.userRow : null]}>
                  <View
                    style={[
                      chatStyles.bubble,
                      user ? chatStyles.userBubble : chatStyles.botBubble,
                    ]}>
                    {structuredBot ? (
                      <View style={chatStyles.answerCard}>
                        {item.resumen ? (
                          <Text style={chatStyles.answerSummary}>{item.resumen}</Text>
                        ) : null}
                        {item.puntos?.length ? (
                          <View style={chatStyles.pointsList}>
                            {item.puntos.map((point, pointIndex) => (
                              <View key={`${pointIndex}-${point.slice(0, 24)}`} style={chatStyles.pointRow}>
                                <View style={chatStyles.pointBullet}>
                                  <Icon name="check" size={14} color="#fff" />
                                </View>
                                <Text style={chatStyles.pointText}>{point}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        {item.aclaracion ? (
                          <View style={chatStyles.clarification}>
                            <Icon name="info-outline" size={18} color={colors.riceGold} />
                            <Text style={chatStyles.clarificationText}>{item.aclaracion}</Text>
                          </View>
                        ) : null}
                        {fragments.length ? (
                          <AnimatedPressable
                            style={chatStyles.fragmentsButton}
                            onPress={() => toggleFragments(index)}>
                            <Icon
                              name={item.showFragments ? 'visibility-off' : 'visibility'}
                              size={17}
                              color={colors.green}
                            />
                            <Text style={chatStyles.fragmentsButtonText}>
                              {item.showFragments ? 'Ocultar fragmentos originales' : 'Ver fragmentos originales'}
                            </Text>
                          </AnimatedPressable>
                        ) : null}
                        {item.showFragments ? (
                          <View style={chatStyles.fragmentsBox}>
                            {fragments.map((fragment, fragmentIndex) => (
                              <View
                                key={`${fragment.document_name}-${fragment.page_number}-${fragment.chunk_index ?? fragmentIndex}`}
                                style={chatStyles.fragmentItem}>
                                <Text style={chatStyles.fragmentTitle}>
                                  Pag. {fragment.page_number} | {fragment.document_name}
                                </Text>
                                <Text style={chatStyles.fragmentText}>{fragment.content}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={[chatStyles.messageText, user ? chatStyles.userText : null]}>
                        {item.text}
                      </Text>
                    )}
                    {item.fuentes.length ? (
                      <View style={chatStyles.sources}>
                        <Text style={chatStyles.sourceTitle}>Fuentes consultadas</Text>
                        {item.fuentes.map((source, sourceIndex) => (
                          <View
                            key={`${source.document_name}-${source.page_number}-${sourceIndex}`}
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
          onContentSizeChange={() => listRef.current?.scrollToEnd({animated: true})}
        />
      </View>

      <View
        style={[
          chatStyles.composer,
          {bottom: keyboardHeight ? 0 : 74},
        ]}>
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
      </View>
      {keyboardHeight ? null : <BottomNav active="chat" />}
    </View>
  );
}

const chatStyles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  contentWithNav: {
    paddingBottom: 154,
  },
  contentWithKeyboard: {
    paddingBottom: 96,
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
  threadWithNav: {
    paddingBottom: 96,
  },
  threadWithKeyboard: {
    paddingBottom: 96,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '94%',
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
  answerCard: {
    gap: 10,
  },
  answerSummary: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  pointsList: {
    gap: 10,
  },
  pointRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  pointBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pointText: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
  },
  clarification: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fff9e8',
    borderColor: '#f0db9b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  clarificationText: {
    flex: 1,
    color: '#7a5a10',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  fragmentsButton: {
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fbfff8',
  },
  fragmentsButtonText: {
    color: colors.green,
    fontWeight: '900',
    fontSize: 13,
  },
  fragmentsBox: {
    gap: 8,
  },
  fragmentItem: {
    backgroundColor: '#f8faf7',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  fragmentTitle: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
  },
  fragmentText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
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
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 50,
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
