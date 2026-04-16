import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/user_service.dart';

class UsersPage extends StatefulWidget {
  final String token;

  const UsersPage({super.key, required this.token});

  @override
  State<UsersPage> createState() => _UsersPageState();
}

class _UsersPageState extends State<UsersPage> {
  final userService = UserService();
  
  List<dynamic> users = [];
  bool isLoading = true;
  String errorMsg = '';

  String searchText = '';
  String? selectedRole;
  bool? selectedStatus;

  final searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    loadUsers();
  }

  Future<void> loadUsers() async {
    setState(() {
      isLoading = true;
      errorMsg = '';
    });

    try {
      final data = await userService.getUsers(
        token: widget.token,
        search: searchText,
        role: selectedRole,
        isActive: selectedStatus,
      );
      setState(() {
        users = data;
      });
    } catch (e) {
      setState(() => errorMsg = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> toggleStatus(int id, bool toActivate) async {
    try {
      await userService.toggleStatus(widget.token, id, toActivate);
      if (mounted) loadUsers();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', '')), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> changeRole(int id, String newRole) async {
    try {
      await userService.changeRole(widget.token, id, newRole);
      if (mounted) loadUsers();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', '')), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> generateTempPassword(int id, String userName) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Resetear Contraseña'),
        content: Text('¿Seguro que deseas generar una contraseña temporal para $userName? Perderá acceso con su contraseña actual.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Sí, resetear'),
          ),
        ],
      )
    );

    if (confirm != true || !mounted) return;

    try {
      final tempPass = await userService.generateTempPassword(widget.token, id);
      if (!mounted) return;
      
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('Contraseña Temporal Generada'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Envía esta clave al usuario de forma segura. El sistema le pedirá que la cambie al ingresar:'),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                color: Colors.grey[200],
                child: SelectableText(
                  tempPass,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 2),
                ),
              ),
            ],
          ),
          actions: [
            TextButton.icon(
              icon: const Icon(Icons.copy),
              label: const Text('Copiar al portapapeles'),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: tempPass));
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copiado')));
              },
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cerrar'),
            ),
          ],
        )
      );
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestión de Usuarios'),
        backgroundColor: Colors.blueGrey,
        foregroundColor: Colors.white,
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sidebar de filtros
          Container(
            width: 280,
            padding: const EdgeInsets.all(24),
            color: Colors.grey[50],
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Filtros', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextField(
                  controller: searchController,
                  decoration: InputDecoration(
                    labelText: 'Buscar nombre/email',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear, size: 16),
                      onPressed: () {
                        searchController.clear();
                        setState(() => searchText = '');
                        loadUsers();
                      },
                    ),
                  ),
                  onSubmitted: (val) {
                    setState(() => searchText = val);
                    loadUsers();
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String?>(
                  decoration: const InputDecoration(labelText: 'Rol', border: OutlineInputBorder()),
                  value: selectedRole,
                  items: const [
                    DropdownMenuItem(value: null, child: Text('Todos')),
                    DropdownMenuItem(value: 'ADMIN', child: Text('Admin')),
                    DropdownMenuItem(value: 'SOCIO', child: Text('Socio')),
                  ],
                  onChanged: (val) {
                    setState(() => selectedRole = val);
                    loadUsers();
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<bool?>(
                  decoration: const InputDecoration(labelText: 'Estado', border: OutlineInputBorder()),
                  value: selectedStatus,
                  items: const [
                    DropdownMenuItem(value: null, child: Text('Todos')),
                    DropdownMenuItem(value: true, child: Text('Activos')),
                    DropdownMenuItem(value: false, child: Text('Inactivos')),
                  ],
                  onChanged: (val) {
                    setState(() => selectedStatus = val);
                    loadUsers();
                  },
                ),
              ],
            ),
          ),
          
          // Tabla principal
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Listado de Usuarios', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  
                  if (isLoading)
                    const Expanded(child: Center(child: CircularProgressIndicator()))
                  else if (errorMsg.isNotEmpty)
                    Expanded(child: Center(child: Text(errorMsg, style: const TextStyle(color: Colors.red))))
                  else if (users.isEmpty)
                     const Expanded(child: Center(child: Text('No se han encontrado usuarios')))
                  else
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: SingleChildScrollView(
                          child: DataTable(
                            headingRowColor: MaterialStateProperty.all(Colors.grey[200]),
                            columns: const [
                              DataColumn(label: Text('ID')),
                              DataColumn(label: Text('Nombres')),
                              DataColumn(label: Text('Email/Cédula')),
                              DataColumn(label: Text('Rol')),
                              DataColumn(label: Text('Estado')),
                              DataColumn(label: Text('Acciones')),
                            ],
                            rows: users.map((u) {
                              final roles = u['roles'] as List<dynamic>;
                              final isAdmin = roles.contains('ADMIN');
                              final isActive = u['is_active'] == true;
                              final mustChange = u['must_change_password'] == true;

                              return DataRow(cells: [
                                DataCell(Text(u['id'].toString())),
                                DataCell(
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text('${u['nombres']} ${u['apellidos']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                      if (mustChange) const Text('Clave temp. pendiente', style: TextStyle(color: Colors.orange, fontSize: 12))
                                    ],
                                  )
                                ),
                                DataCell(
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(u['email']),
                                      Text(u['cedula'] ?? '', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                    ],
                                  )
                                ),
                                DataCell(
                                  DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: isAdmin ? 'ADMIN' : 'SOCIO',
                                      icon: const Icon(Icons.arrow_drop_down, size: 16),
                                      style: TextStyle(
                                        color: isAdmin ? Colors.blueGrey : Colors.blue,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      items: const [
                                        DropdownMenuItem(value: 'ADMIN', child: Text('ADMIN')),
                                        DropdownMenuItem(value: 'SOCIO', child: Text('SOCIO')),
                                      ],
                                      onChanged: (val) {
                                        if (val != null) changeRole(u['id'], val);
                                      },
                                    ),
                                  )
                                ),
                                DataCell(
                                  Switch(
                                    value: isActive,
                                    activeColor: Colors.green,
                                    onChanged: (val) => toggleStatus(u['id'], val),
                                  ),
                                ),
                                DataCell(
                                  OutlinedButton.icon(
                                    icon: const Icon(Icons.lock_reset, size: 16),
                                    label: const Text('Generar Clave'),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.orange[800],
                                      side: BorderSide(color: Colors.orange[800]!),
                                    ),
                                    onPressed: () => generateTempPassword(u['id'], '${u['nombres']}'),
                                  )
                                ),
                              ]);
                            }).toList(),
                          ),
                        ),
                      ),
                    )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
