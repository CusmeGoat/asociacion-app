import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/api_config.dart';

class ChatService {
  Future<Map<String, dynamic>> consultarBot({
    required String token,
    required String pregunta,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chatbot/consultar'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'pregunta': pregunta,
      }),
    );

    if (response.statusCode == 200) {
      // Decode with proper UTF8
      return jsonDecode(utf8.decode(response.bodyBytes));
    } else {
      throw Exception('Error al consultar al bot: ${response.statusCode}');
    }
  }
}
