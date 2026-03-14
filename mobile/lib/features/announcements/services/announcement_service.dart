import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';

class AnnouncementService {
  // ── Listar ─────────────────────────────────────────────────────────────────

  Future<List<dynamic>> getAnnouncements(
    String token, {
    String? category,
    String? search,
    bool includeInactive = false,
  }) async {
    final queryParams = <String, String>{};

    if (category != null && category.isNotEmpty && category != 'TODAS') {
      queryParams['category'] = category;
    }
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (includeInactive) {
      queryParams['include_inactive'] = 'true';
    }

    final uri = Uri.parse('$baseUrl/announcements/').replace(
      queryParameters: queryParams.isEmpty ? null : queryParams,
    );

    final response = await http.get(
      uri,
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

  // ── Crear ──────────────────────────────────────────────────────────────────

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

  // ── Editar ─────────────────────────────────────────────────────────────────

  Future<void> updateAnnouncement({
    required String token,
    required int id,
    required String title,
    required String content,
    required String category,
  }) async {
    final response = await http.put(
      Uri.parse('$baseUrl/announcements/$id'),
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
      throw Exception(body['detail'] ?? 'No se pudo editar el anuncio');
    }
  }

  // ── Desactivar ─────────────────────────────────────────────────────────────

  Future<void> deactivateAnnouncement({
    required String token,
    required int id,
  }) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/announcements/$id/deactivate'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'No se pudo desactivar el anuncio');
    }
  }

  // ── Activar ────────────────────────────────────────────────────────────────

  Future<void> activateAnnouncement({
    required String token,
    required int id,
  }) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/announcements/$id/activate'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'No se pudo activar el anuncio');
    }
  }
}