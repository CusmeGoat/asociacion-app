import 'dart:convert';
import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';

class UserService {
  Future<List<dynamic>> getUsers({
    required String token,
    String? search,
    String? role,
    bool? isActive,
  }) async {
    final queryParams = <String, String>{};
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (role != null && role.isNotEmpty) queryParams['role'] = role;
    if (isActive != null) queryParams['is_active'] = isActive.toString();

    final uri = Uri.parse('$baseUrl/users/').replace(queryParameters: queryParams);

    final response = await http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudieron cargar los usuarios');
    }

    return jsonDecode(response.body);
  }

  Future<void> toggleStatus(String token, int id, bool activate) async {
    final action = activate ? 'activate' : 'deactivate';
    final response = await http.patch(
      Uri.parse('$baseUrl/users/$id/$action'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'Error al actualizar estado del usuario');
    }
  }

  Future<void> changeRole(String token, int id, String roleName) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/users/$id/role'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'role_name': roleName}),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'Error al cambiar el rol');
    }
  }

  Future<String> generateTempPassword(String token, int id) async {
    final response = await http.post(
      Uri.parse('$baseUrl/users/$id/temp-password'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'Error al generar contraseña temporal');
    }

    final data = jsonDecode(response.body);
    return data['temp_password'];
  }
}
