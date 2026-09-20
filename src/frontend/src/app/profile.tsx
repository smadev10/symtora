import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { Avatar } from '@/components/icons';
import { TR } from '@/i18n/translations';
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
  const [newPassword, setNewPassword] = useState('');
  const [saved, setSaved] = useState(false);

  if (!authenticated) return <Redirect href="/login" />;

  // Local only: the API exposes no profile update route, just DELETE /me/data.
  const save = () => {
    updateProfile({ name: name.trim(), email: email.trim() });
    setNewPassword('');
    setSaved(true);
  };

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setSaved(false);
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
          style={s.input}
        />

        <Button label={t.profile.save} onPress={save} />
        {saved ? <AppText style={s.savedNote}>{t.profile.saved}</AppText> : null}
      </View>
    </Screen>
  );
}
