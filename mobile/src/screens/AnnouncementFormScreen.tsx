import React, {useState} from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {pick, types} from '@react-native-documents/picker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {apiClient} from '../api/ApiClient';
import {useAuth} from '../auth/AuthContext';
import {
  AnimatedPanel,
  AnimatedPressable,
  AppButton,
  AppHeader,
  AppInput,
  ConfirmDialog,
  Notice,
  ui,
} from '../components/ui';
import {API_BASE_URL} from '../config/api';
import {RootStackParamList} from '../navigation/types';
import {Announcement} from '../types';
import {blobUtilUploadData, copyPickedFileToCache} from '../utils/upload';
import {colors} from '../styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AnnouncementForm'>;

const CATEGORIES = [
  'General',
  'Asamblea/Reunion',
  'Legal',
  'Tramites',
  'Insumos',
  'Produccion arrocera',
  'Capacitacion',
  'Urgente',
  'Otros',
];

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

function imageExtensionFor(type?: string | null, name?: string | null) {
  const lowerName = (name ?? '').toLowerCase();
  if (lowerName.endsWith('.png')) return 'png';
  if (lowerName.endsWith('.jpg')) return 'jpg';
  if (lowerName.endsWith('.jpeg')) return 'jpg';
  if (type === 'image/png') return 'png';
  return 'jpg';
}

function normalizeImageType(type?: string | null, name?: string | null) {
  if (type === 'image/png') return 'image/png';
  if (type === 'image/jpg' || type === 'image/jpeg') return 'image/jpeg';
  const extension = imageExtensionFor(type, name);
  return extension === 'png' ? 'image/png' : 'image/jpeg';
}

function normalizeImageName(name?: string | null, type?: string | null) {
  const cleanName = name?.trim();
  const extension = imageExtensionFor(type, cleanName);
  if (!cleanName) return `imagen-anuncio.${extension}`;
  if (/\.(png|jpe?g)$/i.test(cleanName)) return cleanName;
  return `${cleanName}.${extension}`;
}

function resolveInitialCategory(category?: string, subtype?: string | null) {
  if (!category || category === 'GENERAL') {
    return {category: 'General', subtype: ''};
  }
  if (CATEGORIES.includes(category)) {
    return {category, subtype: subtype ?? ''};
  }
  return {category: 'Otros', subtype: subtype ?? category};
}

function assetUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function AnnouncementFormScreen({navigation, route}: Props) {
  const {user, isSecretary} = useAuth();
  const current = route.params?.announcement;
  const initialCategory = resolveInitialCategory(current?.category, current?.otros_subtype);
  const [title, setTitle] = useState(current?.title ?? '');
  const [content, setContent] = useState(current?.content ?? '');
  const [category, setCategory] = useState(initialCategory.category);
  const [otherCategory, setOtherCategory] = useState(initialCategory.subtype);
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('success');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const currentImageUri = current?.image_url && !removeImage ? assetUrl(current.image_url) : null;
  const previewUri = selectedImage?.uri ?? currentImageUri;
  const canDelete = Boolean(current && (isSecretary || user?.id === current.published_by));

  const pickImage = async () => {
    setMessage('');
    try {
      const [file] = await pick({type: [types.images]});
      if (!file.hasRequestedType) {
        throw new Error('El archivo seleccionado no es una imagen valida.');
      }
      const name = normalizeImageName(file.name, file.type);
      const type = normalizeImageType(file.type, name);
      const localFile = await copyPickedFileToCache(
        {uri: file.uri, name, type},
        name,
        type,
      );

      setSelectedImage({
        uri: localFile.uri,
        name: localFile.name,
        type: localFile.type,
      });
      setRemoveImage(false);
      setMessageType('info');
      setMessage('Imagen seleccionada. Se subira al guardar el anuncio.');
    } catch (err) {
      const text = err instanceof Error ? err.message.toLowerCase() : '';
      if (!text.includes('cancel')) {
        setMessageType('error');
        setMessage('No se pudo seleccionar la imagen.');
      }
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setRemoveImage(Boolean(current?.image_url));
  };

  const buildMultipartBody = (image: PickedImage) => {
    return [
      {name: 'title', data: title.trim()},
      {name: 'content', data: content.trim()},
      {name: 'category', data: category},
      {name: 'otros_subtype', data: category === 'Otros' ? otherCategory.trim() : ''},
      {
        name: 'file',
        filename: image.name,
        type: image.type,
        data: blobUtilUploadData(image.uri),
      },
    ];
  };

  const buildJsonBody = () => {
    return JSON.stringify({
      title: title.trim(),
      content: content.trim(),
      category,
      otros_subtype: category === 'Otros' ? otherCategory.trim() || null : null,
    });
  };

  const submit = async () => {
    if (saving) return;
    if (!title.trim() || !content.trim()) {
      setMessageType('error');
      setMessage('Completa el titulo y el contenido del anuncio.');
      return;
    }
    if (category === 'Otros' && !otherCategory.trim()) {
      setMessageType('error');
      setMessage('Escribe el detalle de la categoria Otros.');
      return;
    }

    setSaving(true);
    setMessageType('info');
    setMessage(
      selectedImage
        ? current
          ? 'Actualizando anuncio e imagen...'
          : 'Creando anuncio con imagen...'
        : current
          ? 'Actualizando anuncio...'
          : 'Creando anuncio...',
    );
    try {
      let saved: Announcement;
      if (selectedImage && current) {
        saved = await apiClient.uploadForm<Announcement>(`/announcements/${current.id}`, buildMultipartBody(selectedImage), {
          method: 'PUT',
          timeoutMs: 60000,
        });
      } else if (selectedImage) {
        saved = await apiClient.uploadForm<Announcement>('/announcements/', buildMultipartBody(selectedImage), {
          method: 'POST',
          timeoutMs: 60000,
        });
      } else if (current) {
        saved = await apiClient.request<Announcement>(`/announcements/${current.id}`, {
          method: 'PUT',
          body: buildJsonBody(),
        });
      } else {
        saved = await apiClient.request<Announcement>('/announcements/', {
          method: 'POST',
          body: buildJsonBody(),
        });
      }

      if (selectedImage && !saved.image_url) {
        throw new Error('El anuncio se guardo, pero el servidor no registro la imagen.');
      }

      if (!selectedImage && current && removeImage) {
        setMessage('Quitando imagen del anuncio...');
        await apiClient.request(`/announcements/${saved.id}/image`, {method: 'DELETE'});
      }

      setSelectedImage(null);
      setRemoveImage(false);
      setMessageType('success');
      setMessage('Anuncio guardado correctamente');
      if (!current) {
        setTimeout(() => navigation.navigate('Home'), 900);
      }
    } catch (err) {
      setMessageType('error');
      setMessage(err instanceof Error ? err.message : 'No se pudo guardar el anuncio.');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (active: boolean) => {
    if (!current) return;
    await apiClient.request(
      `/announcements/${current.id}/${active ? 'activate' : 'deactivate'}`,
      {method: 'PATCH'},
    );
    navigation.goBack();
  };

  const deleteAnnouncement = () => {
    if (!current || deleting) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAnnouncement = async () => {
    if (!current || deleting) return;
    setDeleting(true);
    setMessageType('info');
    setMessage('Eliminando anuncio...');
    try {
      await apiClient.request(`/announcements/${current.id}`, {method: 'DELETE'});
      setShowDeleteConfirm(false);
      setMessageType('success');
      setMessage('Anuncio eliminado correctamente');
      setTimeout(() => navigation.navigate('Home'), 700);
    } catch (err) {
      setMessageType('error');
      setMessage(err instanceof Error ? err.message : 'No se pudo eliminar el anuncio.');
    } finally {
      setDeleting(false);
    }
  };

  const footerIcon =
    messageType === 'success'
      ? 'check-circle'
      : messageType === 'error'
        ? 'error-outline'
        : 'info';
  const footerColor =
    messageType === 'success'
      ? colors.green
      : messageType === 'error'
        ? colors.danger
        : colors.info;

  return (
    <View style={announcementStyles.screenShell}>
    <ScrollView
      style={ui.screen}
      contentContainerStyle={[ui.content, announcementStyles.scrollContent]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="always">
      <AppHeader
        title={current ? 'Editar anuncio' : 'Crear anuncio'}
        subtitle="Publica informacion institucional para los socios de la asociacion."
        onBack={() => navigation.navigate('Home')}
        right={
          <View style={announcementStyles.headerIcon}>
            <Icon name="campaign" size={25} color={colors.green} />
          </View>
        }
      />

      {message ? <Notice message={message} type={messageType} /> : null}

      <AnimatedPanel delay={120} style={announcementStyles.card}>
        <View style={announcementStyles.formIntro}>
          <Icon name="eco" size={20} color={colors.riceGold} />
          <Text style={announcementStyles.formIntroText}>
            El anuncio se mostrara en el inicio y generara avisos para los socios.
          </Text>
        </View>
        <AppInput
          label="Titulo"
          icon="title"
          placeholder="Convocatoria a reunion"
          value={title}
          onChangeText={setTitle}
        />
        <Text style={announcementStyles.label}>Categoría</Text>
        <TouchableOpacity
          style={announcementStyles.dropdownTrigger}
          onPress={() => setShowCategoryDropdown(true)}
          activeOpacity={0.7}>
          <Icon name={category === 'Urgente' ? 'priority-high' : 'eco'} size={18} color={colors.green} />
          <Text style={announcementStyles.dropdownTriggerText}>{category}</Text>
          <Icon name="expand-more" size={22} color={colors.muted} />
        </TouchableOpacity>

        <Modal
          visible={showCategoryDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryDropdown(false)}>
          <TouchableOpacity
            style={announcementStyles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryDropdown(false)}>
            <View style={announcementStyles.dropdownMenu}>
              <Text style={announcementStyles.dropdownTitle}>Selecciona una categoría</Text>
              {CATEGORIES.map(item => {
                const selected = item === category;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      announcementStyles.dropdownItem,
                      selected ? announcementStyles.dropdownItemActive : null,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setCategory(item);
                      setShowCategoryDropdown(false);
                    }}>
                    <Icon
                      name={item === 'Urgente' ? 'priority-high' : 'eco'}
                      size={17}
                      color={selected ? colors.green : colors.muted}
                    />
                    <Text
                      style={[
                        announcementStyles.dropdownItemText,
                        selected ? announcementStyles.dropdownItemTextActive : null,
                      ]}>
                      {item}
                    </Text>
                    {selected ? (
                      <Icon name="check" size={17} color={colors.green} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {category === 'Otros' ? (
          <AppInput
            label="Detalle de categoria"
            icon="edit"
            placeholder="Ej. Riego, ferias, mantenimiento..."
            value={otherCategory}
            onChangeText={setOtherCategory}
          />
        ) : null}
        <Text style={announcementStyles.label}>Contenido</Text>
        <TextInput
          style={announcementStyles.textArea}
          placeholder="Escribe el detalle del anuncio..."
          placeholderTextColor="#8a97a3"
          value={content}
          onChangeText={setContent}
          multiline
        />
        <View style={announcementStyles.imageBox}>
          <Text style={announcementStyles.label}>Imagen del anuncio</Text>
          {previewUri ? (
            <Image source={{uri: previewUri}} style={announcementStyles.imagePreview} />
          ) : (
            <View style={announcementStyles.imageFallback}>
              <Icon name="image" size={32} color={colors.green} />
              <Text style={announcementStyles.imageFallbackText}>
                Agrega una imagen JPG o PNG relacionada al anuncio.
              </Text>
            </View>
          )}
          {selectedImage ? (
            <Text style={announcementStyles.selectedImageText}>{selectedImage.name}</Text>
          ) : null}
          {removeImage ? (
            <Text style={announcementStyles.selectedImageText}>
              La imagen actual se quitara al guardar.
            </Text>
          ) : null}
          <View style={announcementStyles.imageActions}>
            <AnimatedPressable style={announcementStyles.imageAction} onPress={pickImage}>
              <Icon name="add-photo-alternate" size={18} color={colors.green} />
              <Text style={announcementStyles.imageActionText}>
                {previewUri ? 'Cambiar imagen' : 'Elegir imagen'}
              </Text>
            </AnimatedPressable>
            {previewUri ? (
              <AnimatedPressable style={announcementStyles.imageRemoveAction} onPress={clearImage}>
                <Icon name="delete-outline" size={18} color={colors.danger} />
                <Text style={announcementStyles.imageRemoveText}>Quitar</Text>
              </AnimatedPressable>
            ) : null}
          </View>
        </View>
      </AnimatedPanel>

      {current ? (
        <AnimatedPanel delay={220} style={announcementStyles.actionRow}>
          <AppButton
            label={current.is_active ? 'Desactivar' : 'Activar nuevamente'}
            icon={current.is_active ? 'visibility-off' : 'visibility'}
            onPress={() => setActive(!current.is_active)}
            variant="secondary"
          />
          {canDelete ? (
            <AppButton
              label={deleting ? 'Eliminando...' : 'Eliminar'}
              icon="delete-outline"
              onPress={deleteAnnouncement}
              loading={deleting}
              disabled={deleting || saving}
              variant="danger"
            />
          ) : null}
        </AnimatedPanel>
      ) : null}
    </ScrollView>
    <View style={announcementStyles.saveFooter}>
      {message ? (
        <View style={[announcementStyles.footerNotice, {borderColor: `${footerColor}55`}]}>
          <Icon name={footerIcon} size={18} color={footerColor} />
          <Text style={announcementStyles.footerNoticeText}>{message}</Text>
        </View>
      ) : null}
      <AppButton
        label={saving ? 'Guardando...' : 'Guardar anuncio'}
        icon="save"
        onPress={submit}
        loading={saving}
        disabled={saving}
        hitSlop={18}
        style={announcementStyles.saveButton}
      />
    </View>
    <ConfirmDialog
      visible={showDeleteConfirm}
      title="Eliminar anuncio"
      message={`Se eliminara "${current?.title ?? ''}". El registro quedara auditado en la base de datos.`}
      confirmLabel="Eliminar"
      icon="campaign"
      destructive
      loading={deleting}
      onCancel={() => {
        if (!deleting) setShowDeleteConfirm(false);
      }}
      onConfirm={confirmDeleteAnnouncement}
    />
    </View>
  );
}

const announcementStyles = StyleSheet.create({
  screenShell: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  scrollContent: {
    paddingBottom: 132,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.greenDark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  formIntro: {
    backgroundColor: colors.riceSoft,
    borderColor: '#ecdca8',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  formIntroText: {
    flex: 1,
    color: colors.muted,
    lineHeight: 18,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryOption: {
    minHeight: 38,
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fbfff8',
  },
  categoryOptionActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  categoryOptionText: {
    color: colors.green,
    fontWeight: '900',
    fontSize: 12,
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#f8faf7',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dropdownTriggerText: {
    flex: 1,
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
  dropdownTitle: {
    fontWeight: '900',
    fontSize: 14,
    color: colors.muted,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownItemActive: {
    backgroundColor: colors.greenSoft,
  },
  dropdownItemText: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: colors.green,
    fontWeight: '900',
  },
  textArea: {
    minHeight: 140,
    backgroundColor: '#fbfdf9',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  imageBox: {
    marginTop: 12,
    marginBottom: 14,
  },
  imagePreview: {
    height: 170,
    borderRadius: 14,
    backgroundColor: '#eef2f1',
    borderColor: colors.line,
    borderWidth: 1,
  },
  imageFallback: {
    minHeight: 142,
    borderRadius: 14,
    backgroundColor: colors.greenSoft,
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  imageFallbackText: {
    color: colors.muted,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  selectedImageText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  imageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  imageAction: {
    minHeight: 39,
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fbfff8',
  },
  imageActionText: {
    color: colors.green,
    fontWeight: '900',
  },
  imageRemoveAction: {
    minHeight: 39,
    borderColor: '#efcaca',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffafa',
  },
  imageRemoveText: {
    color: colors.danger,
    fontWeight: '900',
  },
  actionRow: {
    marginTop: 8,
  },
  saveFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: -4},
    elevation: 10,
  },
  saveButton: {
    minHeight: 62,
    borderRadius: 16,
  },
  footerNotice: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff',
  },
  footerNoticeText: {
    flex: 1,
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
