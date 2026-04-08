import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';

import '../../../core/storage/session_storage.dart';
import '../../../core/config/api_config.dart';
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

  // Filtros
  String searchFilter = '';
  String categoryFilter = '';
  bool includeInactive = false;
  
  final searchController = TextEditingController();

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
      final data = await announcementService.getAnnouncements(
        token: widget.token,
        category: categoryFilter,
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
          onSaved: loadAnnouncements,
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
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', '')), backgroundColor: Colors.red),
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
          if (isAdmin)
            TextButton.icon(
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Nuevo anuncio', style: TextStyle(color: Colors.white)),
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
          // Sidebar de filtros e información
          Container(
            width: 300,
            padding: const EdgeInsets.all(24),
            color: Colors.grey[50],
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Info usuario
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
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const Divider(),
                        Text('${widget.userData['nombres']} ${widget.userData['apellidos']}'),
                        Text(widget.userData['email'], style: TextStyle(color: Colors.grey[600])),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(roles, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                
                // Filtros
                const Text(
                  'Filtros',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: searchController,
                  decoration: InputDecoration(
                    labelText: 'Buscar...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
                DropdownButtonFormField<String>(
                  value: categoryFilter.isEmpty ? null : categoryFilter,
                  decoration: InputDecoration(
                    labelText: 'Categoría',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: const [
                    DropdownMenuItem(value: '', child: Text('Todas')),
                    DropdownMenuItem(value: 'INSTITUCIONAL', child: Text('Institucional')),
                    DropdownMenuItem(value: 'PRODUCTOS', child: Text('Productos/Insumos')),
                    DropdownMenuItem(value: 'OTROS', child: Text('Otros')),
                  ],
                  onChanged: (val) {
                    setState(() => categoryFilter = val ?? '');
                    loadAnnouncements();
                  },
                ),
                
                if (isAdmin) ...[
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Ver inactivos'),
                    value: includeInactive,
                    onChanged: (val) {
                      setState(() => includeInactive = val);
                      loadAnnouncements();
                    },
                    contentPadding: EdgeInsets.zero,
                  ),
                ]
              ],
            ),
          ),
          
          // Área principal de anuncios
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Tablón de anuncios',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  
                  if (isLoadingAnnouncements)
                    const Expanded(child: Center(child: CircularProgressIndicator()))
                  else if (announcementsError.isNotEmpty)
                    Expanded(child: Center(child: Text(announcementsError, style: const TextStyle(color: Colors.red))))
                  else if (announcements.isEmpty)
                    Expanded(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No hay anuncios disponibles', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
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
                                color: isActive ? Colors.transparent : Colors.red.withOpacity(0.5),
                                width: 2,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (item['image_url'] != null)
                                  ClipRRect(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                    child: Image.network(
                                      '$baseUrl${item['image_url']}',
                                      width: double.infinity,
                                      height: 250,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) => 
                                        Container(
                                          height: 100, 
                                          color: Colors.grey[200], 
                                          child: const Center(child: Icon(Icons.broken_image, color: Colors.grey))
                                        ),
                                    ),
                                  ),
                                Padding(
                                  padding: const EdgeInsets.all(20),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              item['title'],
                                              style: TextStyle(
                                                fontSize: 22, 
                                                fontWeight: FontWeight.bold,
                                                color: isActive ? Colors.black87 : Colors.grey,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.blue.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(20),
                                            ),
                                            child: Text(
                                              item['category'], 
                                              style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        item['content'],
                                        style: const TextStyle(fontSize: 16, height: 1.5),
                                      ),
                                      const SizedBox(height: 20),
                                      const Divider(),
                                      Row(
                                        children: [
                                          const Icon(Icons.person_outline, size: 16, color: Colors.grey),
                                          const SizedBox(width: 4),
                                          Text('${item['publisher_name']}', style: const TextStyle(color: Colors.grey)),
                                          const SizedBox(width: 16),
                                          const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                                          const SizedBox(width: 4),
                                          Text(
                                            item['created_at'] != null ? item['created_at'].toString().split('T')[0] : 'N/A', 
                                            style: const TextStyle(color: Colors.grey)
                                          ),
                                          const Spacer(),
                                          if (isAdmin) ...[
                                            TextButton.icon(
                                              icon: const Icon(Icons.edit, size: 18),
                                              label: const Text('Editar'),
                                              onPressed: () => showAnnouncementDialog(announcement: item),
                                            ),
                                            TextButton.icon(
                                              icon: Icon(isActive ? Icons.visibility_off : Icons.visibility, size: 18, color: isActive ? Colors.red : Colors.green),
                                              label: Text(isActive ? 'Desactivar' : 'Activar', style: TextStyle(color: isActive ? Colors.red : Colors.green)),
                                              onPressed: () => toggleActiveStatus(item),
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

// Widget Dialog para Crear/Editar
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
  String selectedCategory = 'INSTITUCIONAL';
  
  PlatformFile? pickedImage;
  bool isSaving = false;
  String errorMsg = '';

  bool get isEdit => widget.announcement != null;

  @override
  void initState() {
    super.initState();
    if (isEdit) {
      titleController.text = widget.announcement!['title'];
      contentController.text = widget.announcement!['content'];
      selectedCategory = widget.announcement!['category'];
      // validando que la categoria exista en las opciones basicas
      if (!['INSTITUCIONAL', 'PRODUCTOS', 'OTROS'].contains(selectedCategory)) {
        selectedCategory = 'OTROS'; 
      }
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
    if (titleController.text.trim().isEmpty || contentController.text.trim().isEmpty) {
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
        );
      } else {
        final newAnn = await announcementService.createAnnouncement(
          token: widget.token,
          title: titleController.text,
          content: contentController.text,
          category: selectedCategory,
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
      await announcementService.deleteImage(widget.token, widget.announcement!['id']);
      widget.announcement!['image_url'] = null; // actualizar UI local
      widget.onSaved(); // recargar parent
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
                decoration: const InputDecoration(labelText: 'Título', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: selectedCategory,
                decoration: const InputDecoration(labelText: 'Categoría', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'INSTITUCIONAL', child: Text('Institucional')),
                  DropdownMenuItem(value: 'PRODUCTOS', child: Text('Productos/Insumos')),
                  DropdownMenuItem(value: 'OTROS', child: Text('Otros')),
                ],
                onChanged: (val) => setState(() => selectedCategory = val!),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: contentController,
                maxLines: 5,
                decoration: const InputDecoration(labelText: 'Contenido', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 24),
              
              // Sección de imagen
              const Text('Imagen del anuncio', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              
              if (pickedImage != null) ...[
                Text('Nueva imagen seleccionada: ${pickedImage!.name}'),
                TextButton(
                  onPressed: () => setState(() => pickedImage = null),
                  child: const Text('Cancelar selección', style: TextStyle(color: Colors.red)),
                )
              ] else if (isEdit && widget.announcement!['image_url'] != null) ...[
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
                  label: const Text('Eliminar imagen existente', style: TextStyle(color: Colors.red)),
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
                  label: const Text('Seleccionar imagen (JPG/PNG max 10MB)'),
                ),
              ],
              
              if (errorMsg.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(errorMsg, style: const TextStyle(color: Colors.red)),
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
            ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
            : Text(isEdit ? 'Guardar Cambios' : 'Publicar Anuncio'),
        ),
      ],
    );
  }
}