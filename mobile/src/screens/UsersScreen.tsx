import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Text, TouchableOpacity, View} from 'react-native';

import {apiClient} from '../api/ApiClient';
import {User} from '../types';
import {colors, styles} from '../styles';

export function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setUsers(await apiClient.request<User[]>('/users/'));
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
    <View style={styles.screen}>
      {message ? <Text style={styles.subtitle}>{message}</Text> : null}
      <FlatList
        data={users}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={{fontWeight: '700', color: colors.ink}}>
              {item.nombres} {item.apellidos}
            </Text>
            <Text style={styles.small}>{item.email}</Text>
            <Text style={styles.small}>Roles: {item.roles.join(', ')}</Text>
            <Text style={styles.small}>Estado: {item.is_active ? 'Activo' : 'Inactivo'}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => toggleStatus(item)}>
              <Text style={styles.secondaryText}>
                {item.is_active ? 'Desactivar' : 'Activar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => toggleRole(item)}>
              <Text style={styles.secondaryText}>Cambiar rol</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => tempPassword(item)}>
              <Text style={styles.secondaryText}>Clave temporal</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
