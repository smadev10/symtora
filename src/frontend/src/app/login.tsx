import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { IconApple, IconGoogle, LogoMark } from '@/components/icons';
import { translate } from '@/i18n/translate';
import { TR } from '@/i18n/translations';
import { useSession } from '@/state/session/Provider';
import { useAuth } from '@/state/session/useAuth';
import { useSettings } from '@/state/settings/Provider';
import { authStyles } from '@/theme/authStyles';
import { sharedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const { session } = useSession();
  const { login, submitting, errorKey } = useAuth();

  const t = TR[settings.lang];
  const s = authStyles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (session.status === 'authenticated') return <Redirect href="/" />;

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <Screen>
      <View style={s.screen}>
        <View style={s.top}>
          <View style={s.avatar}>
            <LogoMark size={64} />
          </View>
          <AppText style={s.wordmark}>SYMTORA</AppText>
          <AppText style={s.subtitle}>{t.login.subtitle}</AppText>
        </View>

        <View style={s.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.login.emailPlaceholder}
            placeholderTextColor={tk.textFaint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={s.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t.login.passwordPlaceholder}
            placeholderTextColor={tk.textFaint}
            secureTextEntry
            style={s.input}
          />

          {errorKey ? <AppText style={s.error}>{translate(settings.lang, errorKey)}</AppText> : null}

          <Button
            label={t.login.loginCta}
            onPress={() => void login(email.trim(), password)}
            disabled={!canSubmit}
          />
          <Button
            label={t.login.signupCta}
            variant="secondary"
            onPress={() => router.push('/signup')}
          />

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <AppText style={shared.textMutedSmall}>{t.login.divider}</AppText>
            <View style={s.dividerLine} />
          </View>

          {/*
            No backend support for either provider — AuthController exposes
            password login and registration only. Left in place as the
            unimplemented placeholders they have always been.
          */}
          <Pressable onPress={() => {}} style={s.oauthButton} accessibilityRole="button">
            <IconGoogle />
            <AppText style={s.oauthButtonText}>{t.login.google}</AppText>
          </Pressable>
          <Pressable onPress={() => {}} style={s.oauthButton} accessibilityRole="button">
            <IconApple color={tk.textStrong} />
            <AppText style={s.oauthButtonText}>{t.login.apple}</AppText>
          </Pressable>
        </View>

        <AppText style={s.footnote}>{t.on.emergencyNote}</AppText>
      </View>
    </Screen>
  );
}
