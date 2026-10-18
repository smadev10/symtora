import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { authApi } from '@/api/auth';
import { ERROR_KEYS, isApiError } from '@/api/errors';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { Avatar } from '@/components/icons';
import { translate } from '@/i18n/translate';
import { TR } from '@/i18n/translations';
import { MIN_PASSWORD_LENGTH, hashPassword } from '@/state/session/passwordHash';
import { useSession } from '@/state/session/Provider';
import { useSettings } from '@/state/settings/Provider';
import { authStyles } from '@/theme/authStyles';
import { sharedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const { session, updateProfile } = useSession();

  const t = TR[settings.lang];
  const s = authStyles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const authenticated = session.status === 'authenticated' ? session : null;

  const [name, setName] = useState(authenticated?.user.name ?? '');
  const [email, setEmail] = useState(authenticated?.user.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  if (!authenticated) return <Redirect href="/login" />;

  const changingPassword = newPassword.length > 0;
  const newPasswordLongEnough = newPassword.length >= MIN_PASSWORD_LENGTH;
  const showNewPasswordHint = changingPassword && !newPasswordFocused && !newPasswordLongEnough;
  const disabled = saving || (changingPassword && (!newPasswordLongEnough || !currentPassword));

  // The password goes to the server; name and email are still local only, since the API
  // has no route to update them.
  const save = async () => {
    setSaving(true);
    setErrorKey(null);
    try {
      if (changingPassword) {
        await authApi.changePassword({
          currentPassword: await hashPassword(currentPassword),
          newPassword: await hashPassword(newPassword),
        });
      }
      updateProfile({ name: name.trim(), email: email.trim() });
      setCurrentPassword('');
      setNewPassword('');
      setSaved(true);
    } catch (error) {
      if (isApiError(error) && error.fieldErrors?.currentPassword) setErrorKey('profile.currentPasswordWrong');
      else setErrorKey(isApiError(error) ? error.messageKey : ERROR_KEYS.unknown);
    } finally {
      setSaving(false);
    }
  };

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setSaved(false);
    setErrorKey(null);
  };

  return (
    <Screen padded>
      <ScreenHeader onBack={() => router.back()} />

      <AppText style={shared.pageTitle}>{t.profile.title}</AppText>
      <AppText style={shared.pageSubtitle}>{t.profile.subtitle}</AppText>

      <View style={s.top}>
        <View style={s.avatar}>
          <Avatar size={72} name={name} bg={tk.badgeBg} fg={tk.textNormal} />
        </View>
        {/* No image picker in the prototype; the link has never done anything. */}
        <Pressable onPress={() => {}}>
          <AppText style={s.photoLink}>{t.profile.changePhoto}</AppText>
        </Pressable>
      </View>

      <View style={s.form}>
        <AppText style={s.fieldLabel}>{t.profile.nameLabel}</AppText>
        <TextInput value={name} onChangeText={edit(setName)} style={s.input} />

        <AppText style={s.fieldLabel}>{t.profile.emailLabel}</AppText>
        <TextInput
          value={email}
          onChangeText={edit(setEmail)}
          autoCapitalize="none"
          keyboardType="email-address"
          style={s.input}
        />

        <AppText style={s.fieldLabel}>{t.profile.newPasswordLabel}</AppText>
        <TextInput
          value={newPassword}
          onChangeText={edit(setNewPassword)}
          placeholder={t.profile.newPasswordPlaceholder}
          placeholderTextColor={tk.textFaint}
          secureTextEntry
          onFocus={() => setNewPasswordFocused(true)}
          onBlur={() => setNewPasswordFocused(false)}
          style={s.input}
        />
        {showNewPasswordHint ? (
          <AppText style={s.fieldError}>{t.signup.passwordTooShort}</AppText>
        ) : null}

        {changingPassword ? (
          <>
            <AppText style={s.fieldLabel}>{t.profile.currentPasswordLabel}</AppText>
            <TextInput
              value={currentPassword}
              onChangeText={edit(setCurrentPassword)}
              secureTextEntry
              style={s.input}
            />
          </>
        ) : null}

        {errorKey ? <AppText style={s.error}>{translate(settings.lang, errorKey)}</AppText> : null}

        <Button label={t.profile.save} onPress={() => void save()} disabled={disabled} />
        {saved ? <AppText style={s.savedNote}>{t.profile.saved}</AppText> : null}
      </View>
    </Screen>
  );
}
