import 'package:flutter/material.dart';

import '../../../core/storage/session_storage.dart';
import '../../home/presentation/home_page.dart';
import '../services/auth_service.dart';

class ForceChangePasswordPage extends StatefulWidget {
  final String token;
  final Map<String, dynamic> userData;

  const ForceChangePasswordPage({
    super.key,
    required this.token,
    required this.userData,
  });

  @override
  State<ForceChangePasswordPage> createState() => _ForceChangePasswordPageState();
}

class _ForceChangePasswordPageState extends State<ForceChangePasswordPage> {
  final newPasswordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  final authService = AuthService();

  bool isLoading = false;
  String errorMessage = '';

  Future<void> saveNewPassword() async {
    final pass = newPasswordController.text;
    final confirm = confirmPasswordController.text;

    if (pass.length < 8) {
      setState(() => errorMessage = 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (pass != confirm) {
      setState(() => errorMessage = 'Las contraseñas no coinciden');
      return;
    }

    setState(() {
      isLoading = true;
      errorMessage = '';
    });

    try {
      await authService.updatePassword(token: widget.token, newPassword: pass);
      
      // Volver a obtener la metadata limpia (ya sin must_change_password)
      final updatedData = await authService.getMe(widget.token);

      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contraseña actualizada con éxito'), backgroundColor: Colors.green),
      );

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => HomePage(
            token: widget.token,
            userData: updatedData,
          ),
        ),
      );
    } catch (e) {
      setState(() {
        errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  void dispose() {
    newPasswordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Actualizar Contraseña'),
        automaticallyImplyLeading: false, // Force them to stay or logout
        actions: [
          TextButton(
            onPressed: () async {
              await SessionStorage.clearToken();
              if (mounted) Navigator.pop(context);
            },
            child: const Text('Cancelar', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
      body: Center(
        child: SizedBox(
          width: 420,
          child: Card(
            elevation: 4,
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.security, size: 48, color: Colors.amber),
                  const SizedBox(height: 16),
                  const Text(
                    'Es necesario actualizar tu contraseña por motivos de seguridad.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: newPasswordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Nueva Contraseña',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: confirmPasswordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Confirmar Contraseña',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (errorMessage.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        errorMessage,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isLoading ? null : saveNewPassword,
                      child: isLoading
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Guardar y Entrar'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
