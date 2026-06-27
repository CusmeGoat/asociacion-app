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

  return {
    uri: copy.localUri,
    name,
    type,
  };
}

export function blobUtilUploadData(uri: string) {
  // Eliminar el prefijo file:// (ReactNativeBlobUtil.wrap espera una ruta normal en Android)
  let cleanUri = uri;
  if (uri.startsWith('file://')) {
    cleanUri = uri.replace('file://', '');
  }
  return ReactNativeBlobUtil.wrap(decodeURIComponent(cleanUri));
}
