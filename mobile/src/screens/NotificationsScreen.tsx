import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Text, TouchableOpacity, View} from 'react-native';

import {apiClient} from '../api/ApiClient';
import {NotificationItem} from '../types';
import {colors, styles} from '../styles';

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    setNotifications(await apiClient.request<NotificationItem[]>('/notificaciones/'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await apiClient.request('/notificaciones/leer-todas', {method: 'PATCH'});
    await load();
  };

  const markOne = async (id: number) => {
    await apiClient.request(`/notificaciones/${id}/leer`, {method: 'PATCH'});
    await load();
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.button} onPress={markAll}>
        <Text style={styles.buttonText}>Marcar todas como leidas</Text>
      </TouchableOpacity>
      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <View style={[styles.card, !item.is_read && {borderColor: colors.green}]}>
            <Text style={{fontWeight: '700', color: colors.ink}}>{item.title}</Text>
            <Text style={{color: colors.ink}}>{item.message}</Text>
            <Text style={styles.small}>{item.announcement_type}</Text>
            {!item.is_read ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={() => markOne(item.id)}>
                <Text style={styles.secondaryText}>Marcar como leida</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
