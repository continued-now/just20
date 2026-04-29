import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { updateUsername } from '../lib/user';
import { validateUsername } from '../lib/validation';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  async function handleConfirm() {
    const validation = validateUsername(name);
    if (validation.error || !validation.username) {
      setError(validation.error ?? 'Invalid username.');
      return;
    }
    await updateUsername(validation.username);
    router.replace('/');
  }

  function handleSkip() {
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <Text style={styles.mascot}>💪</Text>
            <Text style={styles.title}>What do your{'\n'}friends call you?</Text>
            <Text style={styles.sub}>
              This shows up when you invite friends to track your buddy streak.
            </Text>

            <TextInput
              ref={inputRef}
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="e.g. Constant"
              placeholderTextColor={colors.subtext}
              value={name}
              onChangeText={t => {
                setName(t);
                setError('');
              }}
              maxLength={20}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.confirmBtn, !name.trim() && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.85}
              disabled={!name.trim()}
            >
              <Text style={styles.confirmBtnText}>{"LET'S GO ->"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.6}>
              <Text style={styles.skipText}>skip for now</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.subtext,
  },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  mascot: { fontSize: 64, textAlign: 'center' },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -1,
  },
  sub: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  inputError: { borderColor: colors.accent },
  error: {
    fontSize: fontSize.xs,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: '600',
  },
  actions: {
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  confirmBtn: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  skipText: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '500',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});
