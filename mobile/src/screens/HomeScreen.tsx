import React, {useCallback, useEffect, useState} from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {useAuth} from '../auth/AuthContext';
import {API_BASE_URL} from '../config/api';
import {RootStackParamList} from '../navigation/types';
import {Announcement} from '../types';
import {colors, styles} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const {user, isSecretary, logout} = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [items, count] = await Promise.all([
        apiClient.request<Announcement[]>('/announcements/'),
        apiClient.request<{count: number}>('/notificaciones/no-leidas/count'),
      ]);
      setAnnouncements(items);
      setUnread(count.count);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <View>
          <Text style={styles.title}>Hola, {user?.nombres}</Text>
          <Text style={styles.subtitle}>{isSecretary ? 'Secretario' : 'Socio'}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Icon name="logout" size={26} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Chat')}>
          <Text style={styles.secondaryText}>Asistente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.secondaryText}>Notificaciones ({unread})</Text>
        </TouchableOpacity>
      </View>

      {isSecretary ? (
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Documents')}>
            <Text style={styles.secondaryText}>Documentos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Users')}>
            <Text style={styles.secondaryText}>Usuarios</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isSecretary ? (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AnnouncementForm')}>
          <Text style={styles.buttonText}>Crear anuncio</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={announcements}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({item}) => (
          <View style={styles.card}>
            {item.image_url ? (
              <Image
                source={{uri: `${API_BASE_URL}${item.image_url}`}}
                style={{height: 160, borderRadius: 8, marginBottom: 10}}
              />
            ) : null}
            <Text style={{fontSize: 18, fontWeight: '700', color: colors.ink}}>{item.title}</Text>
            <Text style={styles.small}>{item.category} | {item.publisher_name}</Text>
            <Text style={{marginTop: 8, color: colors.ink}}>{item.content}</Text>
            {isSecretary ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('AnnouncementForm', {announcement: item})}>
                <Text style={styles.secondaryText}>Editar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
