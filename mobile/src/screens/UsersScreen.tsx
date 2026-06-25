import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {
  AnimatedListItem,
  AnimatedPressable,
  AppHeader,
  EmptyState,
  Notice,
  SkeletonBlock,
  StatusBadge,
  ui,
} from '../components/ui';
import {RootStackParamList} from '../navigation/types';
import {User} from '../types';
import {colors} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

export function UsersScreen({navigation}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setUsers(await apiClient.request<User[]>('/users/'));
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    await apiClient.request(`/users/${user.id}/${action}`, {method: 'PATCH'});
    await load();
  };

  const toggleRole = async (user: User) => {
    const nextRole = user.roles.includes('SECRETARIO') ? 'SOCIO' : 'SECRETARIO';
    await apiClient.request(`/users/${user.id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({role_name: nextRole}),
    });
    await load();
  };

  const tempPassword = async (user: User) => {
    const response = await apiClient.request<{temp_password: string}>(
      `/users/${user.id}/temp-password`,
      {method: 'POST'},
    );
    setMessage(`Clave temporal para ${user.email}: ${response.temp_password}`);
  };

  return (
    <View style={ui.screen}>
      <View style={usersStyles.content}>
        <AppHeader
          title="Administracion de usuarios"
          subtitle="Gestiona socios, secretarios, roles y claves temporales."
          onBack={() => navigation.navigate('Home')}
          right={
            <View style={usersStyles.headerIcon}>
              <Icon name="groups" size={25} color={colors.green} />
            </View>
          }
        />

        {message ? <Notice message={message} type="info" /> : null}

        <FlatList
          data={users}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          contentContainerStyle={usersStyles.listContent}
          ListEmptyComponent={
            !loaded && refreshing ? <UsersSkeleton /> : (
              <EmptyState
                icon="person-search"
                title="No hay usuarios registrados"
                detail="Los socios y secretarios apareceran aqui cuando existan registros."
              />
            )
          }
          renderItem={({item, index}) => (
            <AnimatedListItem index={index}>
              <View style={usersStyles.card}>
                <View style={usersStyles.avatar}>
                  <Text style={usersStyles.avatarText}>
                    {(item.nombres?.[0] ?? 'U') + (item.apellidos?.[0] ?? '')}
                  </Text>
                </View>
                <View style={usersStyles.userCopy}>
                  <Text style={usersStyles.name}>
                    {item.nombres} {item.apellidos}
                  </Text>
                  <Text style={usersStyles.email}>{item.email}</Text>
                  <View style={usersStyles.pillRow}>
                    <StatusBadge
                      label={item.is_active ? 'Activo' : 'Inactivo'}
                      tone={item.is_active ? 'success' : 'error'}
                      icon={item.is_active ? 'check-circle' : 'block'}
                    />
                    <StatusBadge
                      label={item.roles.join(', ')}
                      tone={item.roles.includes('SECRETARIO') ? 'warning' : 'neutral'}
                      icon="admin-panel-settings"
                    />
                  </View>
                  <View style={usersStyles.actions}>
                    <AnimatedPressable
                      style={usersStyles.actionButton}
                      onPress={() => toggleStatus(item)}>
                      <Icon
                        name={item.is_active ? 'block' : 'check-circle'}
                        size={17}
                        color={colors.green}
                      />
                      <Text style={usersStyles.actionText}>
                        {item.is_active ? 'Desactivar' : 'Activar'}
                      </Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={usersStyles.actionButton}
                      onPress={() => toggleRole(item)}>
                      <Icon name="admin-panel-settings" size={17} color={colors.green} />
                      <Text style={usersStyles.actionText}>Rol</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={usersStyles.actionButton}
                      onPress={() => tempPassword(item)}>
                      <Icon name="key" size={17} color={colors.green} />
                      <Text style={usersStyles.actionText}>Clave</Text>
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            </AnimatedListItem>
          )}
        />
      </View>
    </View>
  );
}

function UsersSkeleton() {
  return (
    <View style={usersStyles.skeletonCard}>
      <SkeletonBlock width={46} height={46} borderRadius={13} />
      <View style={usersStyles.skeletonCopy}>
        <SkeletonBlock height={16} width="68%" />
        <SkeletonBlock height={13} width="88%" style={usersStyles.skeletonLine} />
        <SkeletonBlock height={30} width="70%" style={usersStyles.skeletonLine} />
      </View>
    </View>
  );
}

const usersStyles = StyleSheet.create({
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
    alignItems: 'flex-start',
    shadowColor: colors.greenDark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.green,
    fontWeight: '900',
  },
  userCopy: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 15,
  },
  email: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
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
  actionText: {
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
