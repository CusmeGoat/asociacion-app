import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';

class AuthService {
  Future<String> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email.trim(),
        'password': password.trim(),
      }),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'Error en el login');
    }

    final data = jsonDecode(response.body);
    return data['access_token'];
  }

  Future<Map<String, dynamic>> register({
    required String nombres,
    required String apellidos,
    required String cedula,
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/users/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'nombres': nombres.trim(),
        'apellidos': apellidos.trim(),
        'email': email.trim(),
        'password': password,
        'role_name': 'SOCIO',
        'cedula': cedula,
      }),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'Error al registrar el usuario');
    }

    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> getMe(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo obtener el usuario autenticado');
    }

    return jsonDecode(response.body);
  }
}