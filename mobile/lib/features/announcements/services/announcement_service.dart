import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';

class AnnouncementService {
  Future<List<dynamic>> getAnnouncements(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/announcements/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudieron cargar los anuncios');
    }

    return jsonDecode(response.body);
  }

  Future<void> createAnnouncement({
    required String token,
    required String title,
    required String content,
    required String category,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/announcements/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'title': title.trim(),
        'content': content.trim(),
        'category': category.trim(),
      }),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'No se pudo publicar el anuncio');
    }
  }
}