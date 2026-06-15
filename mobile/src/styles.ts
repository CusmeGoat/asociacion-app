import {StyleSheet} from 'react-native';

export const colors = {
  green: '#2e7d32',
  greenSoft: '#e8f5e9',
  ink: '#1f2933',
  muted: '#617080',
  line: '#d9e2ec',
  danger: '#c62828',
  warning: '#f57c00',
};

export const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7fafc', padding: 16},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 24, fontWeight: '700', color: colors.ink, marginBottom: 16},
  subtitle: {fontSize: 14, color: colors.muted, marginBottom: 12},
  input: {
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {color: '#fff', fontWeight: '700'},
  secondaryButton: {
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryText: {color: colors.green, fontWeight: '700'},
  card: {
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  small: {fontSize: 12, color: colors.muted},
  error: {color: colors.danger, marginBottom: 8},
});
