import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardEvent,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {useAuth} from '../auth/AuthContext';
import {
  AnimatedListItem,
  AnimatedPressable,
  AppHeader,
  BottomNav,
  LoadingState,
  ui,
} from '../components/ui';
import {API_BASE_URL} from '../config/api';
import {ChatbotResponse, ChatSource, ChatTable} from '../types';
import {colors} from '../styles';

type Message = {
  role: 'user' | 'bot';
  text: string;
  fuentes: ChatSource[];
  respuestaDirecta?: string;
  resumen?: string;
  puntos?: string[];
  tabla?: ChatTable | null;
  aclaracion?: string | null;
  fragmentos?: ChatSource[];
};

const CHAT_HISTORY_KEY_PREFIX = 'chat_history_v1';
const INITIAL_MESSAGES: Message[] = [
  {
    role: 'bot',
    text: 'Soy el asistente documental. Consulto unicamente los documentos cargados por la asociacion.',
    fuentes: [],
  },
];

export function ChatScreen() {
  const {user} = useAuth();
  const listRef = useRef<FlatList<Message>>(null);
  const historyKey = useMemo(
    () => (user?.id ? `${CHAT_HISTORY_KEY_PREFIX}:${user.id}` : null),
    [user?.id],
  );
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [historyReady, setHistoryReady] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null);

  useEffect(() => {
    let active = true;
    setHistoryReady(false);

    const loadHistory = async () => {
      if (!historyKey) {
        setMessages(INITIAL_MESSAGES);
        setHistoryReady(true);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(historyKey);
        const parsed = stored ? JSON.parse(stored) : null;
        if (active && isStoredMessages(parsed)) {
          setMessages(parsed.length ? parsed : INITIAL_MESSAGES);
        } else if (active) {
          setMessages(INITIAL_MESSAGES);
        }
      } catch {
        if (active) {
          setMessages(INITIAL_MESSAGES);
        }
      } finally {
        if (active) {
          setHistoryReady(true);
          setTimeout(() => listRef.current?.scrollToEnd({animated: false}), 80);
        }
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, [historyKey]);

  useEffect(() => {
    if (!historyReady || !historyKey) return;
    AsyncStorage.setItem(historyKey, JSON.stringify(messages)).catch(() => undefined);
  }, [historyKey, historyReady, messages]);

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
          respuestaDirecta: response.respuesta_directa ?? response.resumen,
          resumen: response.resumen,
          puntos: response.puntos,
          tabla: response.tabla ?? null,
          aclaracion: response.aclaracion,
          fragmentos: response.fragmentos,
          fuentes: response.fuentes,
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
                detail="Buscando informacion relevante en la biblioteca indexada."
              />
            ) : null
          }
          renderItem={({item, index}) => {
            const user = item.role === 'user';
            const structuredBot =
              !user &&
              (Boolean(item.respuestaDirecta || item.resumen) ||
                Boolean(item.puntos?.length) ||
                Boolean(item.tabla?.rows.length) ||
                Boolean(item.aclaracion));
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
                        {item.respuestaDirecta || item.resumen ? (
                          <Text style={chatStyles.answerSummary}>
                            {item.respuestaDirecta || item.resumen}
                          </Text>
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
                        {item.tabla?.rows.length ? <AnswerTable table={item.tabla} /> : null}
                        {item.aclaracion ? (
                          <View style={chatStyles.clarification}>
                            <Icon name="info-outline" size={18} color={colors.riceGold} />
                            <Text style={chatStyles.clarificationText}>{item.aclaracion}</Text>
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
                          <AnimatedPressable
                            key={`${source.document_name}-${source.page_number}-${sourceIndex}`}
                            style={chatStyles.sourceCard}
                            onPress={() => setSelectedSource(source)}>
                            <View style={chatStyles.sourceHeader}>
                              <Icon name="description" size={17} color={colors.green} />
                              <Text style={chatStyles.sourceText}>
                                Pag. {source.page_number} | {source.document_name}
                              </Text>
                              <Icon name="open-in-new" size={15} color={colors.muted} />
                            </View>
                            {source.excerpt ? (
                              <Text style={chatStyles.sourceExcerpt}>{source.excerpt}</Text>
                            ) : null}
                          </AnimatedPressable>
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

      <SourcePreviewModal
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />

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

function isStoredMessages(value: unknown): value is Message[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        item &&
        typeof item === 'object' &&
        ((item as Message).role === 'user' || (item as Message).role === 'bot') &&
        typeof (item as Message).text === 'string' &&
        Array.isArray((item as Message).fuentes),
    )
  );
}

function AnswerTable({table}: {table: ChatTable}) {
  if (table.kind === 'socio_lookup') {
    return (
      <View style={chatStyles.lookupBox}>
        {table.caption ? <Text style={chatStyles.lookupCaption}>{table.caption}</Text> : null}
        {table.rows.map((row, index) => (
          <View key={`${row[0]}-${row[1]}-${index}`} style={chatStyles.lookupCard}>
            <View style={chatStyles.lookupIcon}>
              <Icon name="person-search" size={20} color="#fff" />
            </View>
            <View style={chatStyles.lookupInfo}>
              <Text style={chatStyles.lookupName}>{row[0]}</Text>
              <Text style={chatStyles.lookupCedula}>Cedula: {row[1]}</Text>
              {row[2] ? <Text style={chatStyles.lookupSource}>{row[2]}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (table.kind === 'socios') {
    return (
      <View style={chatStyles.sociosBox}>
        {table.caption ? <Text style={chatStyles.sociosCaption}>{table.caption}</Text> : null}
        {table.rows.map(row => (
          <View key={`${row[0]}-${row[1]}`} style={chatStyles.socioRow}>
            <View style={chatStyles.socioNumber}>
              <Text style={chatStyles.socioNumberText}>{row[0]}</Text>
            </View>
            <View style={chatStyles.socioInfo}>
              <Text style={chatStyles.socioName}>{row[1]}</Text>
              <Text style={chatStyles.socioMeta}>Cedula: {row[2]}</Text>
              {row[3] ? <Text style={chatStyles.socioSource}>{row[3]}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={chatStyles.tableBox}>
      {table.caption ? <Text style={chatStyles.tableCaption}>{table.caption}</Text> : null}
      <View style={chatStyles.tableHeader}>
        {table.columns.map(column => (
          <Text key={column} style={chatStyles.tableHeaderText}>
            {column}
          </Text>
        ))}
      </View>
      {table.rows.map((row, rowIndex) => (
        <View key={`${rowIndex}-${row.join('-').slice(0, 24)}`} style={chatStyles.tableRow}>
          {row.map((cell, cellIndex) => (
            <Text
              key={`${cellIndex}-${cell.slice(0, 16)}`}
              style={[
                chatStyles.tableCell,
                cellIndex === 0 ? chatStyles.tableTopicCell : null,
              ]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function SourcePreviewModal({
  source,
  onClose,
}: {
  source: ChatSource | null;
  onClose: () => void;
}) {
  if (!source) return null;

  const pagePreviewUrl = absoluteUrl(source.page_preview_url);
  const pdfUrl = absoluteUrl(source.preview_url);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={chatStyles.modalOverlay}>
        <View style={chatStyles.previewModal}>
          <View style={chatStyles.previewModalHeader}>
            <View style={chatStyles.previewTitleWrap}>
              <Text style={chatStyles.previewModalTitle}>Pagina {source.page_number}</Text>
              <Text style={chatStyles.previewModalSubtitle}>{source.document_name}</Text>
            </View>
            <AnimatedPressable style={chatStyles.closeButton} onPress={onClose}>
              <Icon name="close" size={22} color={colors.muted} />
            </AnimatedPressable>
          </View>

          <ScrollView contentContainerStyle={chatStyles.previewContent}>
            {pagePreviewUrl ? (
              <Image
                source={{uri: pagePreviewUrl}}
                style={chatStyles.pagePreview}
                resizeMode="contain"
              />
            ) : (
              <View style={chatStyles.previewFallback}>
                <Icon name="image-not-supported" size={34} color={colors.muted} />
                <Text style={chatStyles.previewFallbackText}>
                  No hay miniatura disponible para esta fuente.
                </Text>
              </View>
            )}

            <View style={chatStyles.excerptBox}>
              <Text style={chatStyles.excerptTitle}>Referencia encontrada</Text>
              <Text style={chatStyles.excerptText}>
                {source.excerpt || source.content || 'Sin fragmento disponible.'}
              </Text>
            </View>
          </ScrollView>

          <View style={chatStyles.previewActions}>
            <AnimatedPressable
              style={chatStyles.previewActionButton}
              onPress={() => pdfUrl && Linking.openURL(pdfUrl)}>
              <Icon name="visibility" size={18} color={colors.green} />
              <Text style={chatStyles.previewActionText}>Ver PDF</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={chatStyles.previewActionButton}
              onPress={() => pdfUrl && Linking.openURL(pdfUrl)}>
              <Icon name="file-download" size={18} color={colors.green} />
              <Text style={chatStyles.previewActionText}>Descargar</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function absoluteUrl(path?: string) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const chatStyles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  contentWithNav: {
    paddingBottom: 0,
  },
  contentWithKeyboard: {
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
  threadWithNav: {
    paddingBottom: 88,
  },
  threadWithKeyboard: {
    paddingBottom: 82,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '98%',
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
  tableBox: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableCaption: {
    color: colors.ink,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fbfff8',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  lookupBox: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fbfff8',
  },
  lookupCaption: {
    color: colors.green,
    fontWeight: '900',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.greenSoft,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  lookupCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    alignItems: 'flex-start',
  },
  lookupIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  lookupInfo: {
    flex: 1,
  },
  lookupName: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 20,
  },
  lookupCedula: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  lookupSource: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
    lineHeight: 17,
  },
  sociosBox: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fbfff8',
  },
  sociosCaption: {
    color: colors.green,
    fontWeight: '900',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.greenSoft,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  socioRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  socioNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  socioNumberText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  socioInfo: {
    flex: 1,
  },
  socioName: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 19,
  },
  socioMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  socioSource: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.greenSoft,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    flex: 1,
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    backgroundColor: '#fbfff8',
  },
  tableCell: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tableTopicCell: {
    color: colors.ink,
    fontWeight: '900',
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
  sourceCard: {
    backgroundColor: '#fbfff8',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 9,
    marginTop: 7,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sourceText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  sourceExcerpt: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.48)',
    justifyContent: 'center',
    padding: 16,
  },
  previewModal: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  previewTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  previewModalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  previewModalSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '700',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3f6f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    padding: 14,
    gap: 12,
  },
  pagePreview: {
    width: '100%',
    height: 330,
    backgroundColor: '#f8faf7',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
  },
  previewFallback: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8faf7',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  previewFallbackText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  excerptBox: {
    backgroundColor: '#fbfff8',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  excerptTitle: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
  },
  excerptText: {
    color: colors.ink,
    lineHeight: 20,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  previewActionButton: {
    flex: 1,
    minHeight: 44,
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#fbfff8',
  },
  previewActionText: {
    color: colors.green,
    fontWeight: '900',
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
