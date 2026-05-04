import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';

import '../../../core/storage/session_storage.dart';
import '../../../core/config/api_config.dart';
import '../../announcements/services/announcement_service.dart';
import '../../auth/presentation/login_page.dart';
import '../../documents/presentation/documents_page.dart';
import '../../users/presentation/users_page.dart';
import '../../chat/presentation/chat_page.dart';
import '../../notifications/presentation/notifications_page.dart';
import '../../notifications/services/notification_service.dart';

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
  final notificationService = NotificationService();

  List<dynamic> announcements = [];
  bool isLoadingAnnouncements = true;
  String announcementsError = '';
  int unreadNotifications = 0;

  String searchFilter = '';
  List<String> selectedCategories = [];
  bool includeInactive = false;

  final searchController = TextEditingController();

  bool get isSecretario {
    final roles = widget.userData['roles'] as List<dynamic>;
    return roles.contains('SECRETARIO');
  }

  final List<Map<String, String>> categoryOptions = [
    {'value': 'PRODUCTO', 'label': 'Producto'},
    {'value': 'INSUMO', 'label': 'Insumo'},
    {'value': 'SUBSIDIO', 'label': 'Subsidio'},
    {'value': 'CONVOCATORIA', 'label': 'Convocatoria'},
    {'value': 'PROGRAMA', 'label': 'Programa'},
    {'value': 'NORMATIVA', 'label': 'Normativa'},
    {'value': 'NOTICIA', 'label': 'Noticia'},
    {'value': 'OTROS', 'label': 'Otros'},
  ];

  @override
  void initState() {
    super.initState();
    loadAnnouncements();
    loadUnreadCount();
  }

  Future<void> loadUnreadCount() async {
    try {
      final count = await notificationService.getUnreadCount(widget.token);
      if (mounted) {
        setState(() => unreadNotifications = count);
      }
    } catch (_) {}
  }

  Future<void> loadAnnouncements() async {
    setState(() {
      isLoadingAnnouncements = true;
      announcementsError = '';
    });

    try {
      final categoriesParam =
          selectedCategories.isNotEmpty ? selectedCategories.join(',') : null;

      final data = await announcementService.getAnnouncements(
        token: widget.token,
        categories: categoriesParam,
        search: searchFilter,
        includeInactive: includeInactive,
      );

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

  Future<void> logout() async {
    await SessionStorage.clearToken();

    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }

  void showAnnouncementDialog({Map<String, dynamic>? announcement}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return _AnnouncementDialog(
          token: widget.token,
          announcement: announcement,
          onSaved: () {
            loadAnnouncements();
            loadUnreadCount();
          },
        );
      },
    );
  }

  Future<void> toggleActiveStatus(Map<String, dynamic> item) async {
    try {
      if (item['is_active'] == true) {
        await announcementService.deactivateAnnouncement(widget.token, item['id']);
      } else {
        await announcementService.activateAnnouncement(widget.token, item['id']);
      }
      loadAnnouncements();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final roles = (widget.userData['roles'] as List<dynamic>).join(', ');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inicio'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        actions: [
          if (isSecretario) ...[
            TextButton.icon(
              icon: const Icon(Icons.people, color: Colors.white),
              label: const Text('Gestión de Usuarios',
                  style: TextStyle(color: Colors.white)),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => UsersPage(token: widget.token)),
                );
              },
            ),
            TextButton.icon(
              icon: const Icon(Icons.library_books, color: Colors.white),
              label: const Text('Biblioteca y Docs',
                  style: TextStyle(color: Colors.white)),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => DocumentsPage(token: widget.token)),
                );
              },
            ),
          ],
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications, color: Colors.white),
                onPressed: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          NotificationsPage(token: widget.token),
                    ),
                  );
                  loadUnreadCount();
                },
              ),
              if (unreadNotifications > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      unreadNotifications > 99
                          ? '99+'
                          : unreadNotifications.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          TextButton.icon(
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('Nuevo anuncio',
                style: TextStyle(color: Colors.white)),
            onPressed: () => showAnnouncementDialog(),
          ),
          TextButton.icon(
            icon: const Icon(Icons.exit_to_app, color: Colors.white),
            label: const Text('Salir', style: TextStyle(color: Colors.white)),
            onPressed: logout,
          ),
        ],
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 300,
            padding: const EdgeInsets.all(24),
            color: Colors.grey[50],
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Card(
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.person, color: Colors.green),
                            SizedBox(width: 8),
                            Text(
                              'Mi Perfil',
                              style: TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const Divider(),
                        Text(
                            '${widget.userData['nombres']} ${widget.userData['apellidos']}'),
                        Text(widget.userData['email'],
                            style: TextStyle(color: Colors.grey[600])),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(roles,
                              style: const TextStyle(
                                  color: Colors.green,
                                  fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                const Text(
                  'Filtros',
                  style:
                      TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: searchController,
                  decoration: InputDecoration(
                    labelText: 'Buscar...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8)),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        searchController.clear();
                        setState(() => searchFilter = '');
                        loadAnnouncements();
                      },
                    ),
                  ),
                  onSubmitted: (val) {
                    setState(() => searchFilter = val);
                    loadAnnouncements();
                  },
                ),
                const SizedBox(height: 16),
                const Text(
                  'Categorías',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView(
                    children: [
                      ...categoryOptions.map((cat) {
                        final isSelected =
                            selectedCategories.contains(cat['value']);
                        return FilterChip(
                          label: Text(cat['label']!),
                          selected: isSelected,
                          onSelected: (selected) {
                            setState(() {
                              if (selected) {
                                selectedCategories.add(cat['value']!);
                              } else {
                                selectedCategories.remove(cat['value']);
                              }
                            });
                            loadAnnouncements();
                          },
                        );
                      }),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: () {
                          setState(() => selectedCategories.clear());
                          loadAnnouncements();
                        },
                        icon: const Icon(Icons.clear, size: 16),
                        label: const Text('Limpiar filtros'),
                      ),
                    ],
                  ),
                ),
                if (isSecretario) ...[
                  SwitchListTile(
                    title: const Text('Ver inactivos'),
                    value: includeInactive,
                    onChanged: (val) {
                      setState(() => includeInactive = val);
                      loadAnnouncements();
                    },
                    contentPadding: EdgeInsets.zero,
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChatPage(token: widget.token),
                        ),
                      );
                    },
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Preguntar al Asistente'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green[800],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Tablón de anuncios',
                    style:
                        TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  if (isLoadingAnnouncements)
                    const Expanded(
                        child: Center(child: CircularProgressIndicator()))
                  else if (announcementsError.isNotEmpty)
                    Expanded(
                        child: Center(
                            child: Text(announcementsError,
                                style: const TextStyle(color: Colors.red))))
                  else if (announcements.isEmpty)
                    Expanded(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.inbox,
                                size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No hay anuncios disponibles',
                                style: TextStyle(
                                    fontSize: 18,
                                    color: Colors.grey[600])),
                          ],
                        ),
                      ),
                    )
                  else
                    Expanded(
                      child: ListView.builder(
                        itemCount: announcements.length,
                        itemBuilder: (context, index) {
                          final item = announcements[index];
                          final isActive = item['is_active'] == true;

                          return Card(
                            elevation: 3,
                            margin: const EdgeInsets.only(bottom: 20),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(
                                color: isActive
                                    ? Colors.transparent
                                    : Colors.red.withOpacity(0.5),
                                width: 2,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (item['image_url'] != null)
                                  ClipRRect(
                                    borderRadius: const BorderRadius.vertical(
                                        top: Radius.circular(12)),
                                    child: Image.network(
                                      '$baseUrl${item['image_url']}',
                                      width: double.infinity,
                                      height: 250,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) =>
                                              Container(
                                        height: 100,
                                        color: Colors.grey[200],
                                        child: const Center(
                                            child: Icon(Icons.broken_image,
                                                color: Colors.grey)),
                                      ),
                                    ),
                                  ),
                                Padding(
                                  padding: const EdgeInsets.all(20),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              item['title'],
                                              style: TextStyle(
                                                fontSize: 22,
                                                fontWeight: FontWeight.bold,
                                                color: isActive
                                                    ? Colors.black87
                                                    : Colors.grey,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.blue
                                                  .withOpacity(0.1),
                                              borderRadius:
                                                  BorderRadius.circular(20),
                                            ),
                                            child: Text(
                                              item['category'],
                                              style: const TextStyle(
                                                  color: Colors.blue,
                                                  fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        item['content'],
                                        style: const TextStyle(
                                            fontSize: 16, height: 1.5),
                                      ),
                                      const SizedBox(height: 20),
                                      const Divider(),
                                      Row(
                                        children: [
                                          const Icon(Icons.person_outline,
                                              size: 16, color: Colors.grey),
                                          const SizedBox(width: 4),
                                          Text('${item['publisher_name']}',
                                              style: const TextStyle(
                                                  color: Colors.grey)),
                                          const SizedBox(width: 16),
                                          const Icon(Icons.calendar_today,
                                              size: 16, color: Colors.grey),
                                          const SizedBox(width: 4),
                                          Text(
                                            item['created_at'] != null
                                                ? item['created_at']
                                                    .toString()
                                                    .split('T')[0]
                                                : 'N/A',
                                            style: const TextStyle(
                                                color: Colors.grey),
                                          ),
                                          const Spacer(),
                                          if (isSecretario) ...[
                                            TextButton.icon(
                                              icon: const Icon(Icons.edit,
                                                  size: 18),
                                              label: const Text('Editar'),
                                              onPressed: () =>
                                                  showAnnouncementDialog(
                                                      announcement: item),
                                            ),
                                            TextButton.icon(
                                              icon: Icon(
                                                isActive
                                                    ? Icons.visibility_off
                                                    : Icons.visibility,
                                                size: 18,
                                                color: isActive
                                                    ? Colors.red
                                                    : Colors.green,
                                              ),
                                              label: Text(
                                                isActive
                                                    ? 'Desactivar'
                                                    : 'Activar',
                                                style: TextStyle(
                                                    color: isActive
                                                        ? Colors.red
                                                        : Colors.green),
                                              ),
                                              onPressed: () =>
                                                  toggleActiveStatus(item),
                                            ),
                                          ]
                                        ],
                                      )
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AnnouncementDialog extends StatefulWidget {
  final String token;
  final Map<String, dynamic>? announcement;
  final VoidCallback onSaved;

  const _AnnouncementDialog({
    required this.token,
    this.announcement,
    required this.onSaved,
  });

  @override
  State<_AnnouncementDialog> createState() => _AnnouncementDialogState();
}

class _AnnouncementDialogState extends State<_AnnouncementDialog> {
  final announcementService = AnnouncementService();

  final titleController = TextEditingController();
  final contentController = TextEditingController();
  final otrosSubtypeController = TextEditingController();
  String selectedCategory = 'PRODUCTO';

  PlatformFile? pickedImage;
  bool isSaving = false;
  String errorMsg = '';

  bool get isEdit => widget.announcement != null;

  final List<Map<String, String>> categoryOptions = [
    {'value': 'PRODUCTO', 'label': 'Producto'},
    {'value': 'INSUMO', 'label': 'Insumo'},
    {'value': 'SUBSIDIO', 'label': 'Subsidio'},
    {'value': 'CONVOCATORIA', 'label': 'Convocatoria'},
    {'value': 'PROGRAMA', 'label': 'Programa'},
    {'value': 'NORMATIVA', 'label': 'Normativa'},
    {'value': 'NOTICIA', 'label': 'Noticia'},
    {'value': 'OTROS', 'label': 'Otros'},
  ];

  @override
  void initState() {
    super.initState();
    if (isEdit) {
      titleController.text = widget.announcement!['title'];
      contentController.text = widget.announcement!['content'];
      selectedCategory = widget.announcement!['category'];
      otrosSubtypeController.text =
          widget.announcement!['otros_subtype'] ?? '';
    }
  }

  Future<void> pickImage() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png'],
      withData: true,
    );

    if (result != null) {
      setState(() {
        pickedImage = result.files.first;
      });
    }
  }

  Future<void> save() async {
    if (titleController.text.trim().isEmpty ||
        contentController.text.trim().isEmpty) {
      setState(() => errorMsg = 'Título y contenido son obligatorios');
      return;
    }

    setState(() {
      isSaving = true;
      errorMsg = '';
    });

    try {
      int announcementId;

      if (isEdit) {
        announcementId = widget.announcement!['id'];
        await announcementService.updateAnnouncement(
          token: widget.token,
          id: announcementId,
          title: titleController.text,
          content: contentController.text,
          category: selectedCategory,
          otrosSubtype: selectedCategory == 'OTROS'
              ? otrosSubtypeController.text
              : null,
        );
      } else {
        final newAnn = await announcementService.createAnnouncement(
          token: widget.token,
          title: titleController.text,
          content: contentController.text,
          category: selectedCategory,
          otrosSubtype: selectedCategory == 'OTROS'
              ? otrosSubtypeController.text
              : null,
        );
        announcementId = newAnn['id'];
      }

      if (pickedImage != null) {
        await announcementService.uploadImage(
          token: widget.token,
          id: announcementId,
          file: pickedImage!,
        );
      }

      widget.onSaved();
      if (!mounted) return;
      Navigator.pop(context);
    } catch (e) {
      setState(() {
        errorMsg = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      setState(() => isSaving = false);
    }
  }

  Future<void> removeExistingImage() async {
    setState(() => isSaving = true);
    try {
      await announcementService.deleteImage(
          widget.token, widget.announcement!['id']);
      widget.announcement!['image_url'] = null;
      widget.onSaved();
      setState(() {});
    } catch (e) {
      setState(() => errorMsg = e.toString());
    } finally {
      setState(() => isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(isEdit ? 'Editar Anuncio' : 'Nuevo Anuncio'),
      content: SizedBox(
        width: 500,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                    labelText: 'Título', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: categoryOptions
                    .any((o) => o['value'] == selectedCategory)
                    ? selectedCategory
                    : 'PRODUCTO',
                decoration: const InputDecoration(
                    labelText: 'Categoría', border: OutlineInputBorder()),
                items: categoryOptions
                    .map((o) => DropdownMenuItem(
                        value: o['value'], child: Text(o['label']!)))
                    .toList(),
                onChanged: (val) =>
                    setState(() => selectedCategory = val!),
              ),
              if (selectedCategory == 'OTROS') ...[
                const SizedBox(height: 16),
                TextField(
                  controller: otrosSubtypeController,
                  decoration: const InputDecoration(
                    labelText: 'Subtipo personalizado',
                    border: OutlineInputBorder(),
                    hintText: 'Ej: Evento especial',
                  ),
                ),
              ],
              const SizedBox(height: 16),
              TextField(
                controller: contentController,
                maxLines: 5,
                decoration: const InputDecoration(
                    labelText: 'Contenido', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 24),
              const Text('Imagen del anuncio',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (pickedImage != null) ...[
                Text('Nueva imagen seleccionada: ${pickedImage!.name}'),
                TextButton(
                  onPressed: () => setState(() => pickedImage = null),
                  child: const Text('Cancelar selección',
                      style: TextStyle(color: Colors.red)),
                )
              ] else if (isEdit &&
                  widget.announcement!['image_url'] != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    '$baseUrl${widget.announcement!['image_url']}',
                    height: 150,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                TextButton.icon(
                  onPressed: isSaving ? null : removeExistingImage,
                  icon: const Icon(Icons.delete, color: Colors.red),
                  label: const Text('Eliminar imagen existente',
                      style: TextStyle(color: Colors.red)),
                ),
                TextButton.icon(
                  onPressed: isSaving ? null : pickImage,
                  icon: const Icon(Icons.upload),
                  label: const Text('Reemplazar imagen'),
                )
              ] else ...[
                OutlinedButton.icon(
                  onPressed: pickImage,
                  icon: const Icon(Icons.image),
                  label: const Text(
                      'Seleccionar imagen (JPG/PNG max 10MB)'),
                ),
              ],
              if (errorMsg.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(errorMsg,
                    style: const TextStyle(color: Colors.red)),
              ]
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: isSaving ? null : () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        ElevatedButton(
          onPressed: isSaving ? null : save,
          child: isSaving
              ? const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : Text(isEdit ? 'Guardar Cambios' : 'Publicar Anuncio'),
        ),
      ],
    );
  }
}