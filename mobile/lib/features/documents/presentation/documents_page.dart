import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';

import '../../../core/config/api_config.dart';
import '../services/document_service.dart';

class DocumentsPage extends StatefulWidget {
  final String token;
  const DocumentsPage({super.key, required this.token});

  @override
  State<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends State<DocumentsPage> {
  final _documentService = DocumentService();
  List<dynamic> documents = [];
  bool isLoading = true;
  bool isUploading = false;
  String errorMsg = '';

  @override
  void initState() {
    super.initState();
    loadDocuments();
  }

  Future<void> loadDocuments() async {
    setState(() {
      isLoading = true;
      errorMsg = '';
    });
    try {
      final docs = await _documentService.getDocuments(widget.token);
      setState(() {
        documents = docs;
      });
    } catch (e) {
      setState(() => errorMsg = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> openDocument(String staticPath) async {
    final url = Uri.parse('$baseUrl/${staticPath.replaceFirst("static/", "static/")}');
    if (!await launchUrl(url)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir el documento')),
        );
      }
    }
  }

  Future<void> deleteDocument(int docId, String filename) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar documento'),
        content: Text(
            '¿Estás seguro de que deseas eliminar "$filename"?\n\nEsta acción también eliminará sus datos del índice RAG y no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      await _documentService.deleteDocument(
        token: widget.token,
        documentId: docId,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('"$filename" eliminado correctamente.',
                style: const TextStyle(color: Colors.white)),
            backgroundColor: Colors.green,
          ),
        );
        loadDocuments();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', ''),
                style: const TextStyle(color: Colors.white)),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> pickAndUploadFile() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
      withData: true,
    );

    if (result != null && result.files.first.bytes != null && mounted) {
      setState(() => isUploading = true);
      try {
        await _documentService.uploadDocument(
          token: widget.token,
          fileBytes: result.files.first.bytes!,
          fileName: result.files.first.name,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Documento subido. La indexación se procesa en segundo plano.',
                  style: TextStyle(color: Colors.white)),
              backgroundColor: Colors.green,
            ),
          );
          loadDocuments();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString().replaceFirst('Exception: ', ''),
                  style: const TextStyle(color: Colors.white)),
              backgroundColor: Colors.red,
            ),
          );
        }
      } finally {
        if (mounted) setState(() => isUploading = false);
      }
    }
  }

  Color statusColor(String? status) {
    switch (status) {
      case 'pendiente':
        return Colors.orange;
      case 'en_proceso':
        return Colors.blue;
      case 'completado':
        return Colors.green;
      case 'error':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String statusLabel(String? status) {
    switch (status) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_proceso':
        return 'Indexando...';
      case 'completado':
        return 'Indexado';
      case 'error':
        return 'Error';
      default:
        return 'Desconocido';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Biblioteca y Documentos (RAG)'),
        backgroundColor: Colors.brown[600],
        foregroundColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: isUploading ? null : pickAndUploadFile,
        icon: isUploading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(color: Colors.white))
            : const Icon(Icons.upload_file),
        label: Text(isUploading ? 'Subiendo...' : 'Subir Documento (PDF)'),
        backgroundColor: Colors.brown[700],
        foregroundColor: Colors.white,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : errorMsg.isNotEmpty
              ? Center(
                  child: Text(errorMsg, style: const TextStyle(color: Colors.red)))
              : documents.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.description,
                              size: 80, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text('Aún no hay documentos subidos',
                              style: TextStyle(
                                  color: Colors.grey[600], fontSize: 18)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: documents.length,
                      itemBuilder: (context, index) {
                        final doc = documents[index];
                        final rawDate = doc['created_at'];
                        final formattedDate = rawDate != null
                            ? DateFormat('dd/MM/yyyy HH:mm')
                                .format(DateTime.parse(rawDate).toLocal())
                            : 'Desconocida';
                        final status = doc['status'] as String?;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          elevation: 2,
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 12),
                            leading: CircleAvatar(
                              backgroundColor: statusColor(status),
                              child: const Icon(Icons.picture_as_pdf,
                                  color: Colors.white),
                            ),
                            title: Text(
                              doc['filename'] ?? 'Documento',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 8.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.person,
                                          size: 14, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Text(
                                        doc['uploader_name'] ?? 'Desconocido',
                                        style: const TextStyle(
                                            color: Colors.grey),
                                      ),
                                      const SizedBox(width: 16),
                                      const Icon(Icons.calendar_today,
                                          size: 14, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Text(formattedDate,
                                          style: const TextStyle(
                                              color: Colors.grey)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: statusColor(status)
                                              .withOpacity(0.1),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          statusLabel(status),
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: statusColor(status),
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      if (status == 'error' &&
                                          doc['error_message'] != null) ...[
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            doc['error_message'],
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: Colors.red,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ]
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                OutlinedButton.icon(
                                  icon: const Icon(Icons.download, size: 16),
                                  label: const Text('Descargar'),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 6),
                                    textStyle: const TextStyle(fontSize: 13),
                                  ),
                                  onPressed: () =>
                                      openDocument(doc['file_path']),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  icon: const Icon(Icons.delete_outline,
                                      size: 16, color: Colors.red),
                                  label: const Text('Eliminar',
                                      style: TextStyle(color: Colors.red)),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 6),
                                    textStyle: const TextStyle(fontSize: 13),
                                    side: const BorderSide(color: Colors.red),
                                  ),
                                  onPressed: () => deleteDocument(
                                      doc['id'] as int, doc['filename'] ?? ''),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}