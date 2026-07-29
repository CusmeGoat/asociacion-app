import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {
  AnimatedListItem,
  AnimatedPressable,
  AppButton,
  AppHeader,
  BottomNav,
  EmptyState,
  SkeletonBlock,
  StatusBadge,
  ui,
} from '../components/ui';
import {NotificationItem} from '../types';
import {colors} from '../styles';

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setNotifications(await apiClient.request<NotificationItem[]>('/notificaciones/'));
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    setUpdating(true);
    try {
      await apiClient.request('/notificaciones/leer-todas', {method: 'PATCH'});
      await load();
    } finally {
      setUpdating(false);
    }
  };

  const markOne = async (id: string) => {
    await apiClient.request(`/notificaciones/${id}/leer`, {method: 'PATCH'});
    await load();
  };

  const unreadCount = notifications.filter(item => !item.is_read).length;

  return (
    <View style={ui.screen}>
      <View style={notificationsStyles.content}>
        <AppHeader
          title="Notificaciones"
          subtitle={`${unreadCount} aviso${unreadCount === 1 ? '' : 's'} pendiente${unreadCount === 1 ? '' : 's'} por leer.`}
          right={
            <View style={notificationsStyles.headerIcon}>
              <Icon name="notifications" size={25} color={colors.green} />
            </View>
          }
        />

        <AppButton
          label={updating ? 'Actualizando...' : 'Marcar todas como leidas'}
          icon="done-all"
          onPress={markAll}
          variant="secondary"
          loading={updating}
        />

        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          contentContainerStyle={notificationsStyles.listContent}
          ListEmptyComponent={
            !loaded && refreshing ? <NotificationSkeleton /> : (
              <EmptyState
                icon="notifications-none"
                title="No tienes notificaciones"
                detail="Los avisos nuevos de la asociacion apareceran en esta seccion."
              />
            )
          }
          renderItem={({item, index}) => (
            <AnimatedListItem index={index}>
              <View style={[notificationsStyles.card, !item.is_read ? notificationsStyles.unread : null]}>
                <View style={notificationsStyles.iconShell}>
                  <Icon
                    name={item.is_read ? 'drafts' : 'mark-email-unread'}
                    size={22}
                    color={item.is_read ? colors.muted : colors.green}
                  />
                </View>
                <View style={notificationsStyles.copy}>
                  <View style={notificationsStyles.titleRow}>
                    <Text style={notificationsStyles.title}>{item.title}</Text>
                    {!item.is_read ? (
                      <StatusBadge label="Nuevo" tone="warning" />
                    ) : (
                      <StatusBadge label="Leida" tone="neutral" icon="check" />
                    )}
                  </View>
                  <Text style={notificationsStyles.message}>{item.message}</Text>
                  <Text style={notificationsStyles.type}>{item.announcement_type}</Text>
                  {!item.is_read ? (
                    <AnimatedPressable
                      style={notificationsStyles.readButton}
                      onPress={() => markOne(item.id)}>
                      <Icon name="check-circle" size={18} color={colors.green} />
                      <Text style={notificationsStyles.readText}>Marcar como leida</Text>
                    </AnimatedPressable>
                  ) : null}
                </View>
              </View>
            </AnimatedListItem>
          )}
        />
      </View>
      <BottomNav active="notifications" />
    </View>
  );
}

function NotificationSkeleton() {
  return (
    <View style={notificationsStyles.skeletonCard}>
      <SkeletonBlock width={42} height={42} borderRadius={12} />
      <View style={notificationsStyles.skeletonCopy}>
        <SkeletonBlock height={16} width="72%" />
        <SkeletonBlock height={14} width="94%" style={notificationsStyles.skeletonLine} />
        <SkeletonBlock height={14} width="42%" style={notificationsStyles.skeletonLine} />
      </View>
    </View>
  );
}

const notificationsStyles = StyleSheet.create({
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: colors.greenDark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  unread: {
    borderColor: colors.green,
    backgroundColor: '#fbfff8',
  },
  iconShell: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 20,
  },
  message: {
    color: colors.ink,
    lineHeight: 19,
    marginTop: 8,
  },
  type: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  readButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fbfff8',
  },
  readText: {
    color: colors.green,
    fontWeight: '900',
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
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
