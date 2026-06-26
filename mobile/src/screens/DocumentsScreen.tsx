import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Linking, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {pick, types, errorCodes, isErrorWithCode} from '@react-native-documents/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {useAuth} from '../auth/AuthContext';
import {
  AnimatedListItem,
  AnimatedPanel,
  AnimatedPressable,
  AppButton,
  AppHeader,
  AppInput,
  BottomNav,
  EmptyState,
  Notice,
  SkeletonBlock,
  StatusBadge,
  ui,
} from '../components/ui';
import {API_BASE_URL} from '../config/api';
import {DocumentItem} from '../types';
import {blobUtilUploadData, copyPickedFileToCache} from '../utils/upload';
import {colors} from '../styles';

export function DocumentsScreen() {
  const {isSecretary} = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setDocuments(await apiClient.request<DocumentItem[]>('/documentos/'));
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async () => {
    setUploading(true);
    setMessage('');
    try {
      const [file] = await pick({type: [types.pdf]});
      const localFile = await copyPickedFileToCache(file, 'documento.pdf', 'application/pdf');

      await apiClient.uploadForm('/documentos/cargar', [
        {
          name: 'file',
          filename: localFile.name,
          type: localFile.type,
          data: blobUtilUploadData(localFile.uri),
        },
      ], {
        method: 'POST',
        timeoutMs: 60000,
      });
      setMessage('Documento subido. La indexacion semantica se procesa en segundo plano.');
      await load();
    } catch (err) {
      // Cancelacion silenciosa: el usuario cerro el selector sin elegir archivo
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      // Operacion en curso: el selector ya esta abierto
      if (isErrorWithCode(err) && err.code === errorCodes.IN_PROGRESS) {
        return;
      }
      const text = err instanceof Error ? err.message : 'No se pudo subir el documento';
      setMessage(text);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: number) => {
    await apiClient.request(`/documentos/${id}`, {method: 'DELETE'});
    await load();
  };

  const documentUrl = (item: DocumentItem, mode: 'preview' | 'download') => {
    const path =
      mode === 'download'
        ? item.download_url ?? item.preview_url ?? item.file_path
        : item.preview_url ?? item.file_path;
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const openDocument = async (item: DocumentItem, mode: 'preview' | 'download' = 'preview') => {
    try {
      await Linking.openURL(documentUrl(item, mode));
    } catch {
      setMessage('No se pudo abrir el documento. Verifica que el dispositivo tenga visor PDF.');
    }
  };

  const statusTone = (status: string) => {
    if (status === 'completado') return 'success' as const;
    if (status === 'error') return 'error' as const;
    return 'warning' as const;
  };

  const messageType = message.toLowerCase().includes('no se pudo') ? 'error' : 'info';
  const searchTerm = normalizeSearch(search);
  const filteredDocuments = searchTerm
    ? documents.filter(item => normalizeSearch(item.filename).includes(searchTerm))
    : documents;

  return (
    <View style={ui.screen}>
      <View style={documentsStyles.content}>
        <AppHeader
          title="Biblioteca documental"
          subtitle="PDF institucionales usados por el asistente documental."
          right={
            <View style={documentsStyles.headerIcon}>
              <Icon name="folder" size={25} color={colors.green} />
            </View>
          }
        />

        {isSecretary ? (
          <AnimatedPanel delay={120}>
            <AppButton
              label={uploading ? 'Subiendo documento...' : 'Subir PDF'}
              icon="upload-file"
              onPress={upload}
              loading={uploading}
            />
          </AnimatedPanel>
        ) : null}

        {message ? <Notice message={message} type={messageType} /> : null}

        <AnimatedPanel delay={160} style={documentsStyles.searchPanel}>
          <AppInput
            label="Buscar documento"
            icon="search"
            placeholder="Ej. Vida juridica, acta, nombramiento..."
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            right={
              search ? (
                <AnimatedPressable
                  style={documentsStyles.clearButton}
                  onPress={() => setSearch('')}>
                  <Icon name="close" size={18} color={colors.muted} />
                </AnimatedPressable>
              ) : null
            }
          />
          <Text style={documentsStyles.searchMeta}>
            {filteredDocuments.length} de {documents.length} documentos
          </Text>
        </AnimatedPanel>

        <FlatList
          data={filteredDocuments}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          contentContainerStyle={documentsStyles.listContent}
          ListEmptyComponent={
            !loaded && refreshing ? <DocumentsSkeleton /> : (
              <EmptyState
                icon={searchTerm ? 'search-off' : 'library-books'}
                title={searchTerm ? 'No hay coincidencias' : 'No hay documentos cargados'}
                detail={
                  searchTerm
                    ? 'Intenta buscar por otra palabra del nombre del archivo.'
                    : 'Cuando se suban PDFs, apareceran aqui con su estado de indexacion.'
                }
              />
            )
          }
          renderItem={({item, index}) => (
            <AnimatedListItem index={index}>
              <View style={documentsStyles.card}>
                <View style={documentsStyles.docIcon}>
                  <Icon name="picture-as-pdf" size={24} color={colors.green} />
                </View>
                <View style={documentsStyles.docCopy}>
                  <View style={documentsStyles.titleRow}>
                    <Text style={documentsStyles.filename}>{item.filename}</Text>
                    <StatusBadge
                      label={item.status}
                      tone={statusTone(item.status)}
                      icon={item.status === 'completado' ? 'check-circle' : undefined}
                    />
                  </View>
                  <Text style={documentsStyles.small}>Subido por {item.uploader_name}</Text>
                  {item.status !== 'completado' && !item.error_message ? (
                    <Text style={documentsStyles.processingHint}>
                      El asistente podra usarlo cuando termine la indexacion.
                    </Text>
                  ) : null}
                  {item.error_message ? (
                    <Text style={documentsStyles.error}>{item.error_message}</Text>
                  ) : null}
                  <View style={documentsStyles.actions}>
                    <AnimatedPressable
                      style={documentsStyles.previewButton}
                      onPress={() => openDocument(item, 'preview')}>
                      <Icon name="visibility" size={18} color={colors.green} />
                      <Text style={documentsStyles.previewText}>Ver PDF</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={documentsStyles.previewButton}
                      onPress={() => openDocument(item, 'download')}>
                      <Icon name="file-download" size={18} color={colors.green} />
                      <Text style={documentsStyles.previewText}>Descargar</Text>
                    </AnimatedPressable>
                    {isSecretary ? (
                      <AnimatedPressable
                        style={documentsStyles.deleteButton}
                        onPress={() => remove(item.id)}>
                        <Icon name="delete-outline" size={18} color={colors.danger} />
                        <Text style={documentsStyles.deleteText}>Eliminar</Text>
                      </AnimatedPressable>
                    ) : null}
                  </View>
                </View>
              </View>
            </AnimatedListItem>
          )}
        />
      </View>
      <BottomNav active="documents" />
    </View>
  );
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function DocumentsSkeleton() {
  return (
    <AnimatedPanel style={documentsStyles.skeletonCard}>
      <View style={documentsStyles.skeletonRow}>
        <SkeletonBlock width={42} height={42} borderRadius={12} />
        <View style={documentsStyles.skeletonCopy}>
          <SkeletonBlock height={16} width="82%" />
          <SkeletonBlock height={13} width="52%" style={documentsStyles.skeletonLine} />
          <SkeletonBlock height={30} width="44%" style={documentsStyles.skeletonLine} />
        </View>
      </View>
    </AnimatedPanel>
  );
}

const documentsStyles = StyleSheet.create({
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
  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  searchPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    shadowColor: colors.greenDark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 5},
    elevation: 1,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef3ef',
  },
  searchMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: colors.greenDark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docCopy: {
    flex: 1,
  },
  titleRow: {
    gap: 8,
  },
  filename: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
  },
  small: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
  },
  processingHint: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  error: {
    color: colors.danger,
    marginTop: 8,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  previewButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fbfff8',
  },
  previewText: {
    color: colors.green,
    fontWeight: '900',
  },
  deleteButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderColor: '#efcaca',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffafa',
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '900',
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  skeletonRow: {
    flexDirection: 'row',
  },
  skeletonCopy: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonLine: {
    marginTop: 10,
  },
});
