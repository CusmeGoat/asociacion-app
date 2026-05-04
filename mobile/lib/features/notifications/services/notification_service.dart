import 'dart:convert';
import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';

class NotificationService {
  Future<List<dynamic>> getNotifications(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/notificaciones/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('Error al cargar notificaciones');
    }

    return jsonDecode(response.body);
  }

  Future<int> getUnreadCount(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/notificaciones/no-leidas/count'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      return 0;
    }

    final data = jsonDecode(response.body);
    return data['count'] ?? 0;
  }

  Future<void> markAsRead(String token, int id) async {
    await http.patch(
      Uri.parse('$baseUrl/notificaciones/$id/leer'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
  }

  Future<void> markAllAsRead(String token) async {
    await http.patch(
      Uri.parse('$baseUrl/notificaciones/leer-todas'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
  }
}