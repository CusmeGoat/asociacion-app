import {Announcement} from '../types';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  ForceChangePassword: undefined;
  Home: undefined;
  Chat: undefined;
  Documents: undefined;
  Notifications: undefined;
  Users: undefined;
  AnnouncementForm: {announcement?: Announcement} | undefined;
};
