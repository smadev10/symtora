import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { IconApple, IconCheck, IconGoogle, LogoMark } from '@/components/icons';
import { translate } from '@/i18n/translate';
import { TR } from '@/i18n/translations';
import { useSession } from '@/state/session/Provider';
import { useAuth } from '@/state/session/useAuth';
import { useSettings } from '@/state/settings/Provider';
import { authStyles } from '@/theme/authStyles';
import { sharedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const { session } = useSession();
  const { register, submitting, errorKey } = useAuth();

  const t = TR[settings.lang];
  const s = authStyles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  if (session.status === 'authenticated') return <Redirect href="/" />;

  const emailTrimmed = email.trim();
  const emailValid = EMAIL_PATTERN.test(emailTrimmed);
  const showEmailHint = emailTrimmed.length > 0 && !emailFocused && !emailValid;

  const passwordsMatch = password === confirm;
  const showConfirmHint = confirm.length > 0 && !confirmFocused && !passwordsMatch;

  // Confirm/consent/email-shape are client-side rules; the password length rule lives
  // on the API and comes back as a validation error.
  const disabled =
    !name.trim() ||
    !emailValid ||
    !password ||
    !confirm ||
    !passwordsMatch ||
    !consent ||
    submitting;

  return (
    <Screen>
      <View style={s.screen}>
        <View style={s.top}>
          <View style={s.avatar}>
            <LogoMark size={64} />
          </View>
          <AppText style={s.wordmark}>SYMTORA</AppText>
          <AppText style={s.subtitle}>{t.signup.subtitle}</AppText>
        </View>

        <View style={s.form}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t.signup.namePlaceholder}
            placeholderTextColor={tk.textFaint}
            style={s.input}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.signup.emailPlaceholder}
            placeholderTextColor={tk.textFaint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            style={s.input}
          />
          {showEmailHint ? <AppText style={s.fieldError}>{t.signup.emailInvalid}</AppText> : null}
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t.signup.passwordPlaceholder}
            placeholderTextColor={tk.textFaint}
            secureTextEntry
            style={s.input}
          />
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t.signup.confirmPlaceholder}
            placeholderTextColor={tk.textFaint}
            secureTextEntry
            onFocus={() => setConfirmFocused(true)}
            onBlur={() => setConfirmFocused(false)}
            style={s.input}
          />
          {showConfirmHint ? (
            <AppText style={s.fieldError}>{t.signup.passwordMismatch}</AppText>
          ) : null}

          <Pressable onPress={() => setConsent((v) => !v)} style={s.consentRow}>
            <View style={[s.checkbox, consent && s.checkboxChecked]}>
              {consent ? <IconCheck color={settings.theme === 'dark' ? '#142939' : '#fff'} /> : null}
            </View>
            <AppText style={[shared.textMuted, { flex: 1 }]}>{t.signup.consent}</AppText>
          </Pressable>

          {errorKey ? <AppText style={s.error}>{translate(settings.lang, errorKey)}</AppText> : null}

          <Button
            label={t.signup.cta}
            onPress={() => void register(name.trim(), email.trim(), password)}
            disabled={disabled}
          />

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <AppText style={shared.textMutedSmall}>{t.login.divider}</AppText>
            <View style={s.dividerLine} />
          </View>

          {/* Unimplemented placeholders — see the note in login.tsx. */}
          <Pressable onPress={() => {}} style={s.oauthButton} accessibilityRole="button">
            <IconGoogle />
            <AppText style={s.oauthButtonText}>{t.login.google}</AppText>
          </Pressable>
          <Pressable onPress={() => {}} style={s.oauthButton} accessibilityRole="button">
            <IconApple color={tk.textStrong} />
            <AppText style={s.oauthButtonText}>{t.login.apple}</AppText>
          </Pressable>
        </View>

        <Pressable onPress={() => router.replace('/login')}>
          <AppText style={s.backRow}>{t.signup.haveAccount}</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
