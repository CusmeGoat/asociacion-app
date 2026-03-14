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

  // Formulario crear / editar
  final titleController = TextEditingController();
  final contentController = TextEditingController();
  String selectedFormCategory = 'GENERAL';

  // Filtros
  final searchController = TextEditingController();
  String selectedCategory = 'TODAS';
  bool showInactive = false; // Solo ADMIN

  final List<String> filterCategories = [
    'TODAS',
    'INSTITUCIONAL',
    'Universitario',
    'GENERAL',
  ];

  final List<String> formCategories = [
    'INSTITUCIONAL',
    'Universitario',
    'GENERAL',
  ];

  bool isSubmitting = false;

  bool get isAdmin {
    final roles = widget.userData['roles'] as List<dynamic>;
    return roles.contains('ADMIN');
  }

  @override
  void initState() {
    super.initState();
    loadAnnouncements();
  }

  @override
  void dispose() {
    searchController.dispose();
    titleController.dispose();
    contentController.dispose();
    super.dispose();
  }

  // ── Carga ──────────────────────────────────────────────────────────────────

  Future<void> loadAnnouncements() async {
    setState(() {
      isLoadingAnnouncements = true;
      announcementsError = '';
    });

    try {
      final data = await announcementService.getAnnouncements(
        widget.token,
        category: selectedCategory,
        search: searchController.text,
        includeInactive: isAdmin && showInactive,
      );
      setState(() => announcements = data);
    } catch (e) {
      setState(() {
        announcementsError = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      setState(() => isLoadingAnnouncements = false);
    }
  }

  void clearFilters() {
    setState(() {
      searchController.clear();
      selectedCategory = 'TODAS';
      showInactive = false;
    });
    loadAnnouncements();
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  Future<void> logout() async {
    await SessionStorage.clearToken();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }

  // ── Diálogo crear / editar ─────────────────────────────────────────────────

  void openCreateDialog() {
    // Limpia el formulario antes de abrir
    titleController.clear();
    contentController.clear();
    selectedFormCategory = formCategories.first;
    _openAnnouncementDialog(existingItem: null);
  }

  void openEditDialog(Map<String, dynamic> item) {
    titleController.text = item['title'] ?? '';
    contentController.text = item['content'] ?? '';
    // Si la categoría guardada no está en la lista, cae a GENERAL
    selectedFormCategory = formCategories.contains(item['category'])
        ? item['category']
        : 'GENERAL';
    _openAnnouncementDialog(existingItem: item);
  }

  void _openAnnouncementDialog({required Map<String, dynamic>? existingItem}) {
    final isEditing = existingItem != null;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(isEditing ? 'Editar anuncio' : 'Nuevo anuncio'),
              content: SizedBox(
                width: 450,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: titleController,
                        decoration:
                            const InputDecoration(labelText: 'Título', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedFormCategory,
                        decoration: const InputDecoration(
                            labelText: 'Categoría', border: OutlineInputBorder()),
                        items: formCategories
                            .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                            .toList(),
                        onChanged: (v) =>
                            setDialogState(() => selectedFormCategory = v ?? formCategories.first),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: contentController,
                        maxLines: 4,
                        decoration: const InputDecoration(
                            labelText: 'Contenido', border: OutlineInputBorder()),
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(context),
                  child: const Text('Cancelar'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          setDialogState(() => isSubmitting = true);
                          try {
                            if (isEditing) {
                              await announcementService.updateAnnouncement(
                                token: widget.token,
                                id: existingItem['id'],
                                title: titleController.text,
                                content: contentController.text,
                                category: selectedFormCategory,
                              );
                            } else {
                              await announcementService.createAnnouncement(
                                token: widget.token,
                                title: titleController.text,
                                content: contentController.text,
                                category: selectedFormCategory,
                              );
                            }

                            if (!mounted) return;
                            Navigator.pop(context);
                            await loadAnnouncements();
                            _showSnack(
                              isEditing ? 'Anuncio actualizado' : 'Anuncio publicado',
                              Colors.green,
                            );
                          } catch (e) {
                            setDialogState(() => isSubmitting = false);
                            _showSnack(
                              e.toString().replaceFirst('Exception: ', ''),
                              Colors.red,
                            );
                          } finally {
                            if (mounted) setState(() => isSubmitting = false);
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          isEditing ? 'Guardar' : 'Publicar',
                          style: const TextStyle(color: Colors.white),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ── Desactivar / Activar ───────────────────────────────────────────────────

  Future<void> toggleActive(Map<String, dynamic> item) async {
    final isActive = item['is_active'] as bool;
    final action = isActive ? 'desactivar' : 'activar';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('¿Confirmar $action?'),
        content: Text(
          isActive
              ? 'El anuncio dejará de ser visible para los socios.'
              : 'El anuncio volverá a estar visible para todos.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: isActive ? Colors.red : Colors.green,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              isActive ? 'Desactivar' : 'Activar',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      if (isActive) {
        await announcementService.deactivateAnnouncement(
          token: widget.token,
          id: item['id'],
        );
        _showSnack('Anuncio desactivado', Colors.orange);
      } else {
        await announcementService.activateAnnouncement(
          token: widget.token,
          id: item['id'],
        );
        _showSnack('Anuncio activado', Colors.green);
      }
      await loadAnnouncements();
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''), Colors.red);
    }
  }

  // ── Snack helper ───────────────────────────────────────────────────────────

  void _showSnack(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // ── BUILD ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final roles = (widget.userData['roles'] as List<dynamic>).join(', ');

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        title: const Text('Inicio'),
        actions: [
          // Toggle ver inactivos — solo ADMIN
          if (isAdmin)
            Row(
              children: [
                const Text('Ver inactivos', style: TextStyle(fontSize: 13)),
                Switch(
                  value: showInactive,
                  activeColor: Colors.white,
                  onChanged: (v) {
                    setState(() => showInactive = v);
                    loadAnnouncements();
                  },
                ),
                const SizedBox(width: 4),
              ],
            ),
          if (isAdmin)
            TextButton(
              onPressed: openCreateDialog,
              child: const Text(
                'Nuevo anuncio',
                style: TextStyle(color: Colors.white),
              ),
            ),
          TextButton(
            onPressed: logout,
            child: const Text('Salir', style: TextStyle(color: Colors.white)),
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
                // ── Card usuario ─────────────────────────────────────────────
                Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Usuario autenticado',
                            style: TextStyle(
                                fontSize: 24, fontWeight: FontWeight.bold)),
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
                const Text('Tablón de anuncios',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),

                // ── Filtros ──────────────────────────────────────────────────
                Card(
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Wrap(
                      runSpacing: 12,
                      spacing: 12,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        SizedBox(
                          width: 280,
                          child: TextField(
                            controller: searchController,
                            decoration: const InputDecoration(
                              labelText: 'Buscar anuncio',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 220,
                          child: DropdownButtonFormField<String>(
                            value: selectedCategory,
                            decoration: const InputDecoration(
                              labelText: 'Categoría',
                              border: OutlineInputBorder(),
                            ),
                            items: filterCategories
                                .map((item) => DropdownMenuItem(
                                    value: item, child: Text(item)))
                                .toList(),
                            onChanged: (value) => setState(
                                () => selectedCategory = value ?? 'TODAS'),
                          ),
                        ),
                        ElevatedButton(
                          onPressed: loadAnnouncements,
                          child: const Text('Filtrar'),
                        ),
                        OutlinedButton(
                          onPressed: clearFilters,
                          child: const Text('Limpiar'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // ── Lista de anuncios ────────────────────────────────────────
                if (isLoadingAnnouncements)
                  const Center(child: CircularProgressIndicator())
                else if (announcementsError.isNotEmpty)
                  Text(announcementsError,
                      style: const TextStyle(color: Colors.red))
                else if (announcements.isEmpty)
                  const Text('No hay anuncios disponibles.')
                else
                  ...announcements.map((item) => _AnnouncementCard(
                        item: item,
                        isAdmin: isAdmin,
                        onEdit: () => openEditDialog(item),
                        onToggleActive: () => toggleActive(item),
                      )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TARJETA DE ANUNCIO
// ─────────────────────────────────────────────────────────────────────────────

class _AnnouncementCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final bool isAdmin;
  final VoidCallback onEdit;
  final VoidCallback onToggleActive;

  const _AnnouncementCard({
    required this.item,
    required this.isAdmin,
    required this.onEdit,
    required this.onToggleActive,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = item['is_active'] as bool? ?? true;

    return Opacity(
      opacity: isActive ? 1.0 : 0.55,
      child: Card(
        elevation: isActive ? 3 : 1,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: isActive
              ? BorderSide.none
              : const BorderSide(color: Colors.red, width: 1),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Cabecera: título + acciones ────────────────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item['title'],
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        // Badge "Inactivo" visible solo para ADMIN
                        if (!isActive && isAdmin) ...[
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: const Text(
                              'Inactivo',
                              style: TextStyle(
                                  color: Colors.red,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  // Botones editar / desactivar — solo ADMIN
                  if (isAdmin) ...[
                    IconButton(
                      icon: const Icon(Icons.edit_outlined),
                      tooltip: 'Editar',
                      color: Colors.blueGrey,
                      onPressed: onEdit,
                    ),
                    IconButton(
                      icon: Icon(isActive
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined),
                      tooltip: isActive ? 'Desactivar' : 'Activar',
                      color: isActive ? Colors.orange : Colors.green,
                      onPressed: onToggleActive,
                    ),
                  ],
                ],
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
    );
  }
}