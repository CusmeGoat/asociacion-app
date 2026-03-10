import 'package:flutter/material.dart';

import '../../../core/storage/session_storage.dart';
import '../../announcements/services/announcement_service.dart';
import '../../auth/presentation/login_page.dart';

class HomePage extends StatefulWidget {
  final String token;
  final Map<String, dynamic> userData;

  const HomePage({
    super.key,
    required this.token,
    required this.userData,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final announcementService = AnnouncementService();

  List<dynamic> announcements = [];
  bool isLoadingAnnouncements = true;
  String announcementsError = '';

  final titleController = TextEditingController();
  final contentController = TextEditingController();
  final categoryController = TextEditingController();

  bool isPublishing = false;

  bool get isAdmin {
    final roles = widget.userData['roles'] as List<dynamic>;
    return roles.contains('ADMIN');
  }

  @override
  void initState() {
    super.initState();
    loadAnnouncements();
  }

  Future<void> loadAnnouncements() async {
    setState(() {
      isLoadingAnnouncements = true;
      announcementsError = '';
    });

    try {
      final data = await announcementService.getAnnouncements(widget.token);

      setState(() {
        announcements = data;
      });
    } catch (e) {
      setState(() {
        announcementsError = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      setState(() {
        isLoadingAnnouncements = false;
      });
    }
  }

  Future<void> publishAnnouncement() async {
    setState(() {
      isPublishing = true;
    });

    try {
      await announcementService.createAnnouncement(
        token: widget.token,
        title: titleController.text,
        content: contentController.text,
        category: categoryController.text,
      );

      titleController.clear();
      contentController.clear();
      categoryController.clear();

      if (!mounted) return;
      Navigator.pop(context);

      await loadAnnouncements();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      setState(() {
        isPublishing = false;
      });
    }
  }

  Future<void> logout() async {
    await SessionStorage.clearToken();

    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }

  void openCreateAnnouncementDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Nuevo anuncio'),
          content: SizedBox(
            width: 450,
            child: SingleChildScrollView(
              child: Column(
                children: [
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(labelText: 'Título'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: categoryController,
                    decoration: const InputDecoration(labelText: 'Categoría'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: contentController,
                    maxLines: 4,
                    decoration: const InputDecoration(labelText: 'Contenido'),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isPublishing ? null : () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: isPublishing ? null : publishAnnouncement,
              child: isPublishing
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Publicar'),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    titleController.dispose();
    contentController.dispose();
    categoryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final roles = (widget.userData['roles'] as List<dynamic>).join(', ');

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        title: const Text('Inicio'),
        actions: [
          if (isAdmin)
            TextButton(
              onPressed: openCreateAnnouncementDialog,
              child: const Text(
                'Nuevo anuncio',
                style: TextStyle(color: Colors.white),
              ),
            ),
          TextButton(
            onPressed: logout,
            child: const Text(
              'Salir',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: SizedBox(
            width: 900,
            child: ListView(
              children: [
                Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Usuario autenticado',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text('ID: ${widget.userData['id']}'),
                        Text('Nombres: ${widget.userData['nombres']}'),
                        Text('Apellidos: ${widget.userData['apellidos']}'),
                        Text('Correo: ${widget.userData['email']}'),
                        Text('Activo: ${widget.userData['is_active']}'),
                        Text('Roles: $roles'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Tablón de anuncios',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                if (isLoadingAnnouncements)
                  const Center(child: CircularProgressIndicator())
                else if (announcementsError.isNotEmpty)
                  Text(
                    announcementsError,
                    style: const TextStyle(color: Colors.red),
                  )
                else if (announcements.isEmpty)
                  const Text('No hay anuncios disponibles.')
                else
                  ...announcements.map(
                    (item) => Card(
                      elevation: 3,
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['title'],
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text('Categoría: ${item['category']}'),
                            Text('Publicado por: ${item['publisher_name']}'),
                            Text('Fecha: ${item['created_at']}'),
                            const SizedBox(height: 12),
                            Text(item['content']),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}