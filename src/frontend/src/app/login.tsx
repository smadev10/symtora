import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { LogoMark } from '@/components/icons';
import { translate } from '@/i18n/translate';
import { TR } from '@/i18n/translations';
import { useSession } from '@/state/session/Provider';
import { useAuth } from '@/state/session/useAuth';
import { useSettings } from '@/state/settings/Provider';
import { authStyles } from '@/theme/authStyles';
import { tokens } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const { session } = useSession();
  const { login, submitting, errorKey } = useAuth();

  const t = TR[settings.lang];
  const s = authStyles(settings.theme);
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
        </View>

        <AppText style={s.footnote}>{t.on.emergencyNote}</AppText>
      </View>
    </Screen>
  );
}
