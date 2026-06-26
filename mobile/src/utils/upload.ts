import {keepLocalCopy} from '@react-native-documents/picker';
import ReactNativeBlobUtil from 'react-native-blob-util';

export type PickedUploadFile = {
  uri: string;
  name?: string | null;
  type?: string | null;
};

function fallbackMime(filename: string, fallbackType: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return fallbackType;
}

export function appendPickedFile(
  form: FormData,
  fieldName: string,
  file: PickedUploadFile,
  fallbackName: string,
  fallbackType: string,
) {
  const name = file.name?.trim() || fallbackName;
  const type = file.type?.trim() || fallbackMime(name, fallbackType);

  form.append(fieldName, {
    uri: file.uri,
    name,
    type,
  } as unknown as Blob);
}

export async function copyPickedFileToCache(
  file: PickedUploadFile,
  fallbackName: string,
  fallbackType: string,
) {
  const name = file.name?.trim() || fallbackName;
  const type = file.type?.trim() || fallbackMime(name, fallbackType);
  const [copy] = await keepLocalCopy({
    destination: 'cachesDirectory',
    files: [
      {
        uri: file.uri,
        fileName: name,
        convertVirtualFileToType: type,
      },
    ],
  });

  if (copy.status !== 'success') {
    throw new Error(copy.copyError || 'No se pudo preparar el archivo para subirlo.');
  }

  // Verificar que el archivo copiado no esté vacío antes de subir
  const localPath = copy.localUri.replace(/^file:\/\//, '');
  const stat = await ReactNativeBlobUtil.fs.stat(localPath);
  if (!stat || stat.size === 0) {
    throw new Error(
      'El archivo seleccionado está vacío o no pudo leerse correctamente. ' +
      'Intenta descargarlo primero al dispositivo antes de subirlo.',
    );
  }

  return {
    uri: copy.localUri,
    name,
    type,
  };
}

export function blobUtilUploadData(uri: string) {
  // Eliminar el prefijo file:// o file:/// (triple barra en Android)
  if (uri.startsWith('file://')) {
    return ReactNativeBlobUtil.wrap(uri.replace(/^file:\/\//, ''));
  }
  return ReactNativeBlobUtil.wrap(uri);
}
