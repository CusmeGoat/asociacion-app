import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'dart:typed_data';

import '../../../core/config/api_config.dart';

class DocumentService {
  Future<List<dynamic>> getDocuments(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/documentos/'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode != 200) {
      throw Exception('Error al cargar documentos institucionales');
    }

    return jsonDecode(response.body);
  }

  Future<void> uploadDocument({
    required String token,
    required Uint8List fileBytes,
    required String fileName,
  }) async {
    final uri = Uri.parse('$baseUrl/documentos/cargar');
    var request = http.MultipartRequest('POST', uri);

    request.headers.addAll({
      'Authorization': 'Bearer $token',
    });

    final multipartFile = http.MultipartFile.fromBytes(
      'file',
      fileBytes,
      filename: fileName,
      contentType: MediaType('application', 'pdf'),
    );

    request.files.add(multipartFile);

    var response = await request.send();

    if (response.statusCode != 200) {
      final respBody = await response.stream.bytesToString();
      try {
        final error = jsonDecode(respBody);
        throw Exception(error['detail'] ?? 'Error desconocido al subir PDF');
      } catch (_) {
        throw Exception('Error inesperado del servidor HTTP ${response.statusCode}');
      }
    }
  }
}
