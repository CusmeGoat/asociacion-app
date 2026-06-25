import React, {useEffect} from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  LinearTransition,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {RootStackParamList} from '../navigation/types';
import {colors} from '../styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Entrance = 'fade' | 'up' | 'down' | 'left' | 'right' | 'zoom';

const layoutTransition = LinearTransition.springify().damping(18).stiffness(170);

function entranceFor(type: Entrance, delay: number) {
  const animation =
    type === 'fade'
      ? FadeIn
      : type === 'down'
        ? FadeInDown
        : type === 'left'
          ? FadeInLeft
          : type === 'right'
            ? FadeInRight
            : type === 'zoom'
              ? ZoomIn
              : FadeInUp;

  return animation.delay(delay).duration(430);
}

type AnimatedPanelProps = {
  children: React.ReactNode;
  delay?: number;
  entrance?: Entrance;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedPanel({
  children,
  delay = 0,
  entrance = 'up',
  style,
}: AnimatedPanelProps) {
  return (
    <Animated.View entering={entranceFor(entrance, delay)} layout={layoutTransition} style={style}>
      {children}
    </Animated.View>
  );
}

type AnimatedListItemProps = AnimatedPanelProps & {
  index: number;
};

export function AnimatedListItem({children, index, style, entrance = 'up'}: AnimatedListItemProps) {
  return (
    <AnimatedPanel delay={Math.min(index * 70, 420)} entrance={entrance} style={style}>
      {children}
    </AnimatedPanel>
  );
}

type AnimatedPressableProps = Pick<
  PressableProps,
  'accessibilityLabel' | 'accessibilityRole' | 'disabled' | 'hitSlop' | 'onLongPress' | 'onPress'
> & {
  children: React.ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedPressable({
  children,
  disabled,
  scaleTo = 0.97,
  style,
  accessibilityRole = 'button',
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const pressIn = () => {
    scale.value = withSpring(scaleTo, {damping: 14, stiffness: 260});
  };

  const pressOut = () => {
    scale.value = withSpring(1, {damping: 14, stiffness: 240});
  };

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      {...props}>
      <Animated.View style={[style, animatedStyle, disabled ? ui.disabledButton : null]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
};

export function AppHeader({title, subtitle, right, onBack}: AppHeaderProps) {
  return (
    <AnimatedPanel style={ui.header} entrance="down">
      {onBack ? (
        <AnimatedPressable style={ui.backButton} onPress={onBack}>
          <Icon name="arrow-back" size={22} color={colors.green} />
        </AnimatedPressable>
      ) : null}
      <View style={ui.headerCopy}>
        <Text style={ui.headerTitle}>{title}</Text>
        {subtitle ? <Text style={ui.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </AnimatedPanel>
  );
}

type AppInputProps = TextInputProps & {
  label: string;
  icon?: string;
  right?: React.ReactNode;
};

export function AppInput({label, icon, right, style, ...props}: AppInputProps) {
  return (
    <View style={ui.inputGroup}>
      <Text style={ui.inputLabel}>{label}</Text>
      <View style={ui.inputShell}>
        {icon ? <Icon name={icon} size={21} color={colors.muted} style={ui.inputIcon} /> : null}
        <TextInput
          placeholderTextColor="#8a97a3"
          style={[
            ui.input,
            icon ? ui.inputWithIcon : null,
            right ? ui.inputWithRight : null,
            style,
          ]}
          {...props}
        />
        {right ? <View style={ui.inputRight}>{right}</View> : null}
      </View>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function AppButton({
  label,
  onPress,
  icon,
  disabled,
  loading,
  variant = 'primary',
}: ButtonProps) {
  const secondary = variant === 'secondary';
  const danger = variant === 'danger';
  const color = danger ? colors.danger : colors.green;

  return (
    <AnimatedPressable
      style={[
        ui.button,
        secondary ? ui.secondaryButton : {backgroundColor: color, borderColor: color},
      ]}
      disabled={disabled || loading}
      onPress={onPress}>
      {loading ? (
        <ActivityIndicator size="small" color={secondary ? color : '#fff'} />
      ) : icon ? (
        <Icon name={icon} size={20} color={secondary ? color : '#fff'} />
      ) : null}
      <Text style={[ui.buttonText, secondary ? {color} : null]}>{label}</Text>
    </AnimatedPressable>
  );
}

type ActionCardProps = {
  label: string;
  detail: string;
  icon: string;
  onPress: () => void;
  delay?: number;
};

export function ActionCard({label, detail, icon, onPress, delay = 0}: ActionCardProps) {
  return (
    <AnimatedPanel delay={delay} style={ui.actionCardWrap}>
      <AnimatedPressable style={ui.actionCard} onPress={onPress}>
        <View style={ui.actionIcon}>
          <Icon name={icon} size={23} color={colors.green} />
        </View>
        <View style={ui.actionCopy}>
          <Text style={ui.actionLabel}>{label}</Text>
          <Text style={ui.actionDetail}>{detail}</Text>
        </View>
      </AnimatedPressable>
    </AnimatedPanel>
  );
}

type BottomNavProps = {
  active: 'home' | 'chat' | 'documents' | 'notifications';
};

export function BottomNav({active}: BottomNavProps) {
  const navigation = useNavigation<Nav>();
  const items = [
    {key: 'home', label: 'Inicio', icon: 'home', route: 'Home' as const},
    {key: 'chat', label: 'Asistente', icon: 'chat', route: 'Chat' as const},
    {key: 'documents', label: 'Docs', icon: 'folder', route: 'Documents' as const},
    {key: 'notifications', label: 'Avisos', icon: 'notifications', route: 'Notifications' as const},
  ];

  return (
    <AnimatedPanel entrance="down" style={ui.bottomNav}>
      {items.map(item => {
        const selected = active === item.key;
        return (
          <AnimatedPressable
            key={item.key}
            style={ui.navItem}
            onPress={() => navigation.navigate(item.route)}>
            <View style={[ui.navIconShell, selected ? ui.navIconShellActive : null]}>
              <Icon name={item.icon} size={23} color={selected ? colors.green : colors.muted} />
            </View>
            <Text style={[ui.navLabel, selected ? ui.navLabelActive : null]}>{item.label}</Text>
            {selected ? <Animated.View entering={ZoomIn.duration(240)} style={ui.navDot} /> : null}
          </AnimatedPressable>
        );
      })}
    </AnimatedPanel>
  );
}

type EmptyStateProps = {
  icon: string;
  title: string;
  detail?: string;
};

export function EmptyState({icon, title, detail}: EmptyStateProps) {
  return (
    <AnimatedPanel entrance="zoom" style={ui.emptyState}>
      <View style={ui.emptyIconShell}>
        <Icon name={icon} size={34} color={colors.green} />
      </View>
      <Text style={ui.emptyTitle}>{title}</Text>
      {detail ? <Text style={ui.emptyDetail}>{detail}</Text> : null}
    </AnimatedPanel>
  );
}

type NoticeProps = {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
};

export function Notice({message, type = 'info'}: NoticeProps) {
  const icon =
    type === 'success'
      ? 'check-circle'
      : type === 'error'
        ? 'error-outline'
        : type === 'warning'
          ? 'warning'
          : 'info';
  const color =
    type === 'success'
      ? colors.green
      : type === 'error'
        ? colors.danger
        : type === 'warning'
          ? colors.warning
          : colors.info;

  return (
    <AnimatedPanel entrance="down" style={[ui.notice, {borderColor: `${color}55`}]}>
      <Icon name={icon} size={20} color={color} />
      <Text style={ui.noticeText}>{message}</Text>
    </AnimatedPanel>
  );
}

type StatusBadgeProps = {
  label: string;
  tone?: 'success' | 'warning' | 'error' | 'neutral';
  icon?: string;
};

export function StatusBadge({label, tone = 'neutral', icon}: StatusBadgeProps) {
  const color =
    tone === 'success'
      ? colors.green
      : tone === 'warning'
        ? colors.warning
        : tone === 'error'
          ? colors.danger
          : colors.muted;

  return (
    <View style={[ui.statusBadge, {borderColor: `${color}55`, backgroundColor: `${color}12`}]}>
      {tone === 'warning' ? <PulsingDot color={color} /> : null}
      {icon ? <Icon name={icon} size={15} color={color} /> : null}
      <Text style={[ui.statusText, {color}]}>{label}</Text>
    </View>
  );
}

type SkeletonBlockProps = {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({
  height = 16,
  width = '100%',
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, {duration: 900}), -1, true);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + shimmer.value * 0.35,
    transform: [{scaleX: 0.97 + shimmer.value * 0.03}],
  }));

  return (
    <Animated.View
      style={[
        ui.skeletonBlock,
        {height, width, borderRadius},
        animatedStyle,
        style,
      ]}
    />
  );
}

type LoadingStateProps = {
  title: string;
  detail?: string;
};

export function LoadingState({title, detail}: LoadingStateProps) {
  return (
    <AnimatedPanel entrance="fade" style={ui.loadingState}>
      <ActivityIndicator size="small" color={colors.green} />
      <View style={ui.loadingCopy}>
        <Text style={ui.loadingTitle}>{title}</Text>
        {detail ? <Text style={ui.loadingDetail}>{detail}</Text> : null}
      </View>
    </AnimatedPanel>
  );
}

function PulsingDot({color}: {color: string}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.28, {duration: 520}),
        withTiming(1, {duration: 520}),
      ),
      -1,
      false,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return <Animated.View style={[ui.pulsingDot, {backgroundColor: color}, animatedStyle]} />;
}

export const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.greenDark,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 5,
    lineHeight: 19,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '700',
  },
  inputShell: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 1,
  },
  input: {
    minHeight: 50,
    backgroundColor: '#fbfdf9',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 15,
  },
  inputWithIcon: {
    paddingLeft: 42,
  },
  inputWithRight: {
    paddingRight: 48,
  },
  inputRight: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 14,
    shadowColor: colors.greenDark,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 7},
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
  },
  disabledButton: {
    opacity: 0.72,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  actionCardWrap: {
    width: '48.5%',
  },
  actionCard: {
    minHeight: 86,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.greenDark,
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: {width: 0, height: 5},
    elevation: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },
  actionDetail: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  bottomNav: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    minHeight: 74,
    paddingTop: 8,
    paddingBottom: 7,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: -3},
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 82,
    minHeight: 58,
  },
  navIconShell: {
    width: 34,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconShellActive: {
    backgroundColor: colors.greenSoft,
  },
  navLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  navLabelActive: {
    color: colors.green,
    fontWeight: '900',
  },
  navDot: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.riceGold,
    marginTop: 4,
  },
  emptyState: {
    minHeight: 178,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyIconShell: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.ink,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyDetail: {
    color: colors.muted,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 18,
  },
  notice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: colors.ink,
    lineHeight: 19,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skeletonBlock: {
    backgroundColor: '#dfe9df',
    alignSelf: 'flex-start',
  },
  loadingState: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingCopy: {
    flex: 1,
  },
  loadingTitle: {
    color: colors.ink,
    fontWeight: '900',
  },
  loadingDetail: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
