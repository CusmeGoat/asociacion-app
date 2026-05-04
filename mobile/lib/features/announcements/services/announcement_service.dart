import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';

import '../../../core/config/api_config.dart';

class AnnouncementService {
  Future<List<dynamic>> getAnnouncements({
    required String token,
    String? categories,
    String? search,
    bool includeInactive = false,
  }) async {
    final queryParams = <String, String>{};
    if (categories != null && categories.isNotEmpty) {
      queryParams['categories'] = categories;
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }
    if (includeInactive) {
      queryParams['include_inactive'] = 'true';
    }

    final uri = Uri.parse('$baseUrl/announcements/').replace(queryParameters: queryParams);

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

  Future<Map<String, dynamic>> createAnnouncement({
    required String token,
    required String title,
    required String content,
    required String category,
    String? otrosSubtype,
  }) async {
    final body = <String, dynamic>{
      'title': title.trim(),
      'content': content.trim(),
      'category': category.trim(),
    };
    if (otrosSubtype != null && otrosSubtype.isNotEmpty) {
      body['otros_subtype'] = otrosSubtype;
    }

    final response = await http.post(
      Uri.parse('$baseUrl/announcements/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode != 200) {
      final resBody = jsonDecode(response.body);
      throw Exception(resBody['detail'] ?? 'No se pudo publicar el anuncio');
    }

    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> updateAnnouncement({
    required String token,
    required int id,
    String? title,
    String? content,
    String? category,
    String? otrosSubtype,
  }) async {
    final Map<String, dynamic> body = {};
    if (title != null) body['title'] = title.trim();
    if (content != null) body['content'] = content.trim();
    if (category != null) body['category'] = category.trim();
    if (otrosSubtype != null) body['otros_subtype'] = otrosSubtype;

    final response = await http.put(
      Uri.parse('$baseUrl/announcements/$id'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode != 200) {
      final resBody = jsonDecode(response.body);
      throw Exception(resBody['detail'] ?? 'No se pudo editar el anuncio');
    }

    return jsonDecode(response.body);
  }

  Future<void> deactivateAnnouncement(String token, int id) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/announcements/$id/deactivate'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo desactivar el anuncio');
    }
  }

  Future<void> activateAnnouncement(String token, int id) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/announcements/$id/activate'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo activar el anuncio');
    }
  }

  Future<void> uploadImage({
    required String token,
    required int id,
    required PlatformFile file,
  }) async {
    final uri = Uri.parse('$baseUrl/announcements/$id/image');
    final request = http.MultipartRequest('PATCH', uri)
      ..headers['Authorization'] = 'Bearer $token';

    if (file.bytes != null) {
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        file.bytes!,
        filename: file.name,
      ));
    } else if (file.path != null) {
      request.files.add(await http.MultipartFile.fromPath(
        'file',
        file.path!,
      ));
    } else {
      throw Exception('No se encontró el archivo');
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'Error al subir la imagen');
    }
  }

  Future<void> deleteImage(String token, int id) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/announcements/$id/image'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo eliminar la imagen');
    }
  }
}