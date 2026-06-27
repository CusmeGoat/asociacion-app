import React, {useCallback, useState} from 'react';
import {FlatList, Image, RefreshControl, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {useAuth} from '../auth/AuthContext';
import {
  ActionCard,
  AnimatedListItem,
  AnimatedPanel,
  AnimatedPressable,
  AppButton,
  BottomNav,
  ConfirmDialog,
  EmptyState,
  Notice,
  SkeletonBlock,
} from '../components/ui';
import {API_BASE_URL} from '../config/api';
import {RootStackParamList} from '../navigation/types';
import {Announcement} from '../types';
import {colors} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function categoryLabel(item: Announcement) {
  if (item.category === 'GENERAL') return 'General';
  if (item.category === 'Otros' && item.otros_subtype) return item.otros_subtype;
  return item.category;
}

export function HomeScreen({navigation}: Props) {
  const {user, isSecretary, logout} = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const [itemsResult, countResult] = await Promise.allSettled([
        apiClient.request<Announcement[]>(
          isSecretary ? '/announcements/?include_inactive=true' : '/announcements/',
        ),
        apiClient.request<{count: number}>('/notificaciones/no-leidas/count'),
      ]);

      if (itemsResult.status === 'fulfilled') {
        setAnnouncements(itemsResult.value);
      } else {
        setAnnouncements([]);
        setError(errorText(itemsResult.reason, 'No se pudieron cargar los anuncios.'));
      }

      if (countResult.status === 'fulfilled') {
        setUnread(countResult.value.count);
      } else {
        setUnread(0);
        if (itemsResult.status === 'fulfilled') {
          setError(errorText(countResult.reason, 'No se pudo cargar el contador de notificaciones.'));
        }
      }
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, [isSecretary]);

  const confirmDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    const previous = announcements;
    const id = announcementToDelete.id;
    setDeleting(true);
    setError('');
    setAnnouncements(current => current.filter(announcement => announcement.id !== id));
    try {
      await apiClient.request(`/announcements/${id}`, {method: 'DELETE'});
      setAnnouncementToDelete(null);
    } catch (err) {
      setAnnouncements(previous);
      setError(errorText(err, 'No se pudo eliminar el anuncio.'));
    } finally {
      setDeleting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const actions = [
    {
      label: 'Asistente',
      detail: 'Consulta documental',
      icon: 'chat',
      onPress: () => navigation.navigate('Chat'),
    },
    {
      label: 'Notificaciones',
      detail: `${unread} sin leer`,
      icon: 'notifications',
      onPress: () => navigation.navigate('Notifications'),
    },
    ...(isSecretary
      ? [
          {
            label: 'Documentos',
            detail: 'Biblioteca PDF',
            icon: 'folder',
            onPress: () => navigation.navigate('Documents'),
          },
          {
            label: 'Usuarios',
            detail: 'Administracion',
            icon: 'people',
            onPress: () => navigation.navigate('Users'),
          },
        ]
      : [
          {
            label: 'Documentos',
            detail: 'Biblioteca',
            icon: 'folder',
            onPress: () => navigation.navigate('Documents'),
          },
        ]),
  ];

  const renderHeader = () => (
    <View>
      <AnimatedPanel style={homeStyles.hero} entrance="down">
        <View style={homeStyles.heroText}>
          <View style={homeStyles.eyebrowRow}>
            <Icon name="grass" size={18} color={colors.riceGold} />
            <Text style={homeStyles.eyebrow}>Asociacion Agricola 10 de Mayo</Text>
          </View>
          <Text style={homeStyles.greeting}>Hola, {user?.nombres}</Text>
          <Text style={homeStyles.role}>{isSecretary ? 'Secretario' : 'Socio'}</Text>
        </View>
        <AnimatedPressable style={homeStyles.logoutButton} onPress={logout}>
          <Icon name="logout" size={18} color={colors.danger} />
          <Text style={homeStyles.logoutText}>Salir</Text>
        </AnimatedPressable>
      </AnimatedPanel>

      <View style={homeStyles.actionGrid}>
        {actions.map((action, index) => (
          <ActionCard
            key={action.label}
            label={action.label}
            detail={action.detail}
            icon={action.icon}
            onPress={action.onPress}
            delay={120 + index * 70}
          />
        ))}
      </View>

      {isSecretary ? (
        <AnimatedPanel delay={260}>
          <AppButton
            label="Crear anuncio"
            icon="add-circle-outline"
            onPress={() => navigation.navigate('AnnouncementForm')}
          />
        </AnimatedPanel>
      ) : null}

      {error ? <Notice message={error} type="error" /> : null}

      <AnimatedPanel delay={320} style={homeStyles.sectionHeader}>
        <View>
          <Text style={homeStyles.sectionTitle}>Anuncios</Text>
          <Text style={homeStyles.sectionHint}>Comunicados publicados para la asociacion</Text>
        </View>
        <Text style={homeStyles.sectionMeta}>
          {announcements.length} {isSecretary ? 'registrados' : 'publicados'}
        </Text>
      </AnimatedPanel>
    </View>
  );

  return (
    <View style={homeStyles.screen}>
      <FlatList
        data={announcements}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={homeStyles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={
          !loaded && refreshing ? <AnnouncementSkeleton /> : (
            <EmptyState
              icon="campaign"
              title="No hay anuncios disponibles"
              detail="Cuando se publiquen avisos, apareceran aqui para socios y secretarios."
            />
          )
        }
        renderItem={({item, index}) => (
          <AnimatedListItem index={index}>
            <View
              style={[
                homeStyles.announcementCard,
                !item.is_active ? homeStyles.inactiveCard : null,
              ]}>
              {item.image_url ? (
                <Image
                  source={{uri: `${API_BASE_URL}${item.image_url}`}}
                  style={[
                    homeStyles.announcementImage,
                    !item.is_active ? homeStyles.inactiveImage : null,
                  ]}
                />
              ) : (
                <View style={homeStyles.announcementImageFallback}>
                  <Icon name="campaign" size={34} color={colors.green} />
                </View>
              )}
              <View style={homeStyles.cardTop}>
                <View style={homeStyles.categoryPill}>
                  <Icon name="eco" size={14} color={colors.green} />
                  <Text style={homeStyles.categoryText}>{categoryLabel(item)}</Text>
                </View>
                {isSecretary ? (
                  <View
                    style={[
                      homeStyles.statusPill,
                      item.is_active ? homeStyles.activePill : homeStyles.inactivePill,
                    ]}>
                    <Icon
                      name={item.is_active ? 'visibility' : 'visibility-off'}
                      size={13}
                      color={item.is_active ? colors.green : colors.muted}
                    />
                    <Text
                      style={[
                        homeStyles.statusText,
                        item.is_active ? homeStyles.activeText : homeStyles.inactiveText,
                      ]}>
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                ) : null}
                <Text style={homeStyles.announcementMeta}>{item.publisher_name}</Text>
              </View>
              <Text style={homeStyles.announcementTitle}>{item.title}</Text>
              <Text style={homeStyles.announcementBody}>{item.content}</Text>
              <View style={homeStyles.cardActions}>
                {isSecretary ? (
                  <AnimatedPressable
                    style={homeStyles.editButton}
                    onPress={() => navigation.navigate('AnnouncementForm', {announcement: item})}>
                    <Icon name="edit" size={17} color={colors.green} />
                    <Text style={homeStyles.editText}>
                      {item.is_active ? 'Editar' : 'Editar / activar'}
                    </Text>
                  </AnimatedPressable>
                ) : null}
                {isSecretary || user?.id === item.published_by ? (
                  <AnimatedPressable
                    style={homeStyles.deleteButton}
                    onPress={() => setAnnouncementToDelete(item)}>
                    <Icon name="delete-outline" size={17} color={colors.danger} />
                    <Text style={homeStyles.deleteText}>Eliminar</Text>
                  </AnimatedPressable>
                ) : null}
              </View>
            </View>
          </AnimatedListItem>
        )}
      />
      <ConfirmDialog
        visible={Boolean(announcementToDelete)}
        title="Eliminar anuncio"
        message={`Se eliminara "${announcementToDelete?.title ?? ''}" y dejara de mostrarse en la aplicacion.`}
        confirmLabel="Eliminar"
        icon="campaign"
        destructive
        loading={deleting}
        onCancel={() => {
          if (!deleting) setAnnouncementToDelete(null);
        }}
        onConfirm={confirmDeleteAnnouncement}
      />
      <BottomNav active="home" />
    </View>
  );
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function AnnouncementSkeleton() {
  return (
    <AnimatedPanel style={homeStyles.skeletonCard}>
      <SkeletonBlock height={132} borderRadius={12} />
      <SkeletonBlock height={18} width="72%" style={homeStyles.skeletonLine} />
      <SkeletonBlock height={14} width="48%" style={homeStyles.skeletonLine} />
      <SkeletonBlock height={14} width="92%" style={homeStyles.skeletonLine} />
    </AnimatedPanel>
  );
}

const homeStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.greenDark,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  heroText: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 7,
  },
  eyebrow: {
    color: colors.riceGold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  greeting: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  role: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
  },
  logoutButton: {
    minHeight: 40,
    borderColor: '#efcaca',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffafa',
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 18,
    gap: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  announcementCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.greenDark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  inactiveCard: {
    opacity: 0.84,
    borderStyle: 'dashed',
  },
  announcementImage: {
    height: 150,
    borderRadius: 13,
    marginBottom: 12,
    backgroundColor: '#eef2f1',
  },
  inactiveImage: {
    opacity: 0.65,
  },
  announcementImageFallback: {
    height: 116,
    borderRadius: 13,
    marginBottom: 12,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  categoryPill: {
    minHeight: 30,
    borderRadius: 999,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
  },
  statusPill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activePill: {
    backgroundColor: colors.greenSoft,
  },
  inactivePill: {
    backgroundColor: '#eef2f1',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  activeText: {
    color: colors.green,
  },
  inactiveText: {
    color: colors.muted,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
  },
  announcementMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  announcementBody: {
    color: colors.ink,
    lineHeight: 20,
    marginTop: 9,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    minWidth: 130,
    minHeight: 40,
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fbfff8',
  },
  editText: {
    color: colors.green,
    fontWeight: '900',
  },
  deleteButton: {
    flex: 1,
    minWidth: 120,
    minHeight: 40,
    borderColor: '#efcaca',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
  skeletonLine: {
    marginTop: 12,
  },
});
