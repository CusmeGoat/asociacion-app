import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/notification_service.dart';

class NotificationsPage extends StatefulWidget {
  final String token;

  const NotificationsPage({super.key, required this.token});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final notificationService = NotificationService();
  List<dynamic> notifications = [];
  bool isLoading = true;
  String errorMsg = '';

  @override
  void initState() {
    super.initState();
    loadNotifications();
  }

  Future<void> loadNotifications() async {
    setState(() {
      isLoading = true;
      errorMsg = '';
    });
    try {
      final data = await notificationService.getNotifications(widget.token);
      setState(() {
        notifications = data;
      });
    } catch (e) {
      setState(() => errorMsg = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> markAsRead(int id) async {
    try {
      await notificationService.markAsRead(widget.token, id);
      loadNotifications();
    } catch (_) {}
  }

  Future<void> markAllAsRead() async {
    try {
      await notificationService.markAllAsRead(widget.token);
      loadNotifications();
    } catch (_) {}
  }

  IconData getTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'producto':
        return Icons.shopping_bag;
      case 'insumo':
        return Icons.inventory;
      case 'subsidio':
        return Icons.monetization_on;
      case 'convocatoria':
        return Icons.campaign;
      case 'programa':
        return Icons.event_note;
      case 'normativa':
        return Icons.gavel;
      case 'noticia':
        return Icons.newspaper;
      default:
        return Icons.notifications;
    }
  }

  Color getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'producto':
        return Colors.orange;
      case 'insumo':
        return Colors.teal;
      case 'subsidio':
        return Colors.green;
      case 'convocatoria':
        return Colors.purple;
      case 'programa':
        return Colors.blue;
      case 'normativa':
        return Colors.red;
      case 'noticia':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        actions: [
          if (notifications.any((n) => n['is_read'] == false))
            TextButton.icon(
              onPressed: markAllAsRead,
              icon: const Icon(Icons.done_all, color: Colors.white),
              label: const Text('Leer todas', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : errorMsg.isNotEmpty
              ? Center(child: Text(errorMsg, style: const TextStyle(color: Colors.red)))
              : notifications.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.notifications_off, size: 80, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text('No tienes notificaciones', style: TextStyle(color: Colors.grey[600], fontSize: 18)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: loadNotifications,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(8),
                        itemCount: notifications.length,
                        itemBuilder: (context, index) {
                          final n = notifications[index];
                          final isRead = n['is_read'] == true;
                          final rawDate = n['created_at'];
                          final formattedDate = rawDate != null
                              ? DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(rawDate).toLocal())
                              : '';
                          final type = n['announcement_type'] ?? 'anuncio';

                          return Card(
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            color: isRead ? null : Colors.blue[50],
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: getTypeColor(type).withOpacity(0.2),
                                child: Icon(getTypeIcon(type), color: getTypeColor(type)),
                              ),
                              title: Text(
                                n['title'] ?? '',
                                style: TextStyle(
                                  fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(n['message'] ?? ''),
                                  const SizedBox(height: 4),
                                  Text(formattedDate, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                              trailing: isRead
                                  ? null
                                  : TextButton(
                                      onPressed: () => markAsRead(n['id']),
                                      child: const Text('Leer'),
                                    ),
                              onTap: isRead ? null : () => markAsRead(n['id']),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}