import { useState, useRef, useEffect } from 'react';
import { View, Pressable, TextInput, ScrollView, Modal, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold,
} from '@expo-google-fonts/open-sans';

import AppText from './src/AppText';
import { Spinner, PulseRing, WaveBar } from './src/AnimatedBits';
import { TR } from './src/data/translations';
import { CASES, HEAT, DIST, TREND } from './src/data/cases';
import {
  LogoMark,
  IconMic,
  IconChevron,
  IconChevronLeft,
  IconCheck,
  IconWarning,
  IconInfo,
  IconStop,
  IconStorage,
  IconDownload,
  IconPhone,
  IconLocation,
  IconHome,
  IconHistory,
  IconSliders,
  IconPlus,
  IconClose,
  IconSun,
  IconMoon,
  IconGoogle,
  IconApple,
  Avatar,
} from './src/icons';

const T = AppText;
const ls = (size, em) => Math.round(size * em * 100) / 100;
const lh = (size, mult) => Math.round(size * mult * 100) / 100;

const cardShadow = {
  shadowColor: '#a1a1a1',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 3,
};

function tokens(theme) {
  return theme === 'dark'
    ? {
        screenBg: '#0b1a26', card: '#16283a', textStrong: '#ffffff', textNormal: '#cfe3f0', textMuted: '#8ba3b4', textFaint: '#4d6274',
        divider: '#25405a', accent: '#b9dcf7', accentText: '#142939', accentSelectedBg: '#1f3d54', accentSelectedBorder: '#b9dcf7',
        badgeBg: '#1c3245', navBg: '#16283a', heatFrom: '#16283a', heatTo: '#b9dcf7', inset: '#1c3245',
        tintBlue: { bg: '#1c3245', fg: '#bcdcf6' }, tintOrange: { bg: '#3a2f14', fg: '#e0b060' }, tintGreen: { bg: '#143a24', fg: '#6fcf97' }, tintNeutral: { bg: '#22303b', fg: '#8ba3b4' },
      }
    : {
        screenBg: '#f7f8f9', card: '#ffffff', textStrong: '#142939', textNormal: '#285172', textMuted: '#6b8598', textFaint: '#a9bdc9',
        divider: '#e4e8eb', accent: '#285172', accentText: '#ffffff', accentSelectedBg: '#b9dcf7', accentSelectedBorder: '#285172',
        badgeBg: '#eef4f9', navBg: '#ffffff', heatFrom: '#eef4f9', heatTo: '#142939', inset: '#f2f4f6',
        tintBlue: { bg: '#eef4f9', fg: '#285172' }, tintOrange: { bg: '#fdf1de', fg: '#8a5a08' }, tintGreen: { bg: '#e8f5ec', fg: '#227a44' }, tintNeutral: { bg: '#eef0f2', fg: '#6b7680' },
      };
}

function hexToRgb(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function heatColor(f, from, to) {
  const c1 = hexToRgb(from), c2 = hexToRgb(to);
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * f), g = Math.round(c1[1] + (c2[1] - c1[1]) * f), b = Math.round(c1[2] + (c2[2] - c1[2]) * f);
  return `rgb(${r},${g},${b})`;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Symtora />
    </SafeAreaProvider>
  );
}

function Symtora() {
  const [fontsLoaded] = useFonts({
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
    OpenSans_800ExtraBold,
  });

  const [state, setState] = useState({
    lang: 'de', theme: 'light', screen: 'login', consent: false,
    description: '', currentCase: 'headache',
    recording: false, recordSeconds: 0,
    localOnly: true, retention: 30, showDeleteSheet: false,
    loginEmail: '', loginPassword: '',
    signupName: '', signupEmail: '', signupPassword: '', signupConfirm: '', signupConsent: false,
    profileName: 'Saimon Mahari', profileEmail: 'saimon.mahari@example.ch', profileNewPassword: '', profileSaved: false,
  });
  const patch = (update) => setState((s) => ({ ...s, ...(typeof update === 'function' ? update(s) : update) }));

  const recTimerRef = useRef(null);
  const loadTimerRef = useRef(null);
  useEffect(() => () => { clearInterval(recTimerRef.current); clearTimeout(loadTimerRef.current); }, []);

  const {
    lang, theme, screen, consent, description, currentCase, recordSeconds, localOnly, retention, showDeleteSheet,
    loginEmail, loginPassword, signupName, signupEmail, signupPassword, signupConfirm, signupConsent,
    profileName, profileEmail, profileNewPassword, profileSaved,
  } = state;

  const onEmailChange = (val) => patch({ loginEmail: val });
  const onPasswordChange = (val) => patch({ loginPassword: val });
  const loginSubmit = () => patch({ screen: 'onboarding' });
  const goSignup = () => patch({ screen: 'signup' });
  const goLogin = () => patch({ screen: 'login' });
  const onSignupNameChange = (val) => patch({ signupName: val });
  const onSignupEmailChange = (val) => patch({ signupEmail: val });
  const onSignupPasswordChange = (val) => patch({ signupPassword: val });
  const onSignupConfirmChange = (val) => patch({ signupConfirm: val });
  const toggleSignupConsent = () => patch((s) => ({ signupConsent: !s.signupConsent }));
  const signupDisabled = !signupName.trim() || !signupEmail.trim() || !signupPassword || signupPassword !== signupConfirm || !signupConsent;
  const signupSubmit = () => { if (!signupDisabled) patch({ screen: 'onboarding' }); };
  const goProfile = () => patch({ screen: 'profile', profileSaved: false });
  const changePhoto = () => {};
  const onProfileNameChange = (val) => patch({ profileName: val, profileSaved: false });
  const onProfileEmailChange = (val) => patch({ profileEmail: val, profileSaved: false });
  const onProfileNewPasswordChange = (val) => patch({ profileNewPassword: val, profileSaved: false });
  const saveProfile = () => patch({ profileSaved: true, profileNewPassword: '' });

  const toggleConsent = () => patch((s) => ({ consent: !s.consent }));
  const startApp = () => { if (consent) patch({ screen: 'start' }); };
  const goStart = () => patch({ screen: 'start' });
  const goNew = () => patch({ screen: 'new' });
  const goPatterns = () => patch({ screen: 'patterns' });
  const goData = () => patch({ screen: 'data' });
  const goEmergency = () => patch({ screen: 'emergency' });
  const backToStart = () => patch({ screen: 'start' });
  const saveAssessment = () => patch({ screen: 'start' });

  const setLang = (l) => patch({ lang: l });
  const setLight = () => patch({ theme: 'light' });
  const setDark = () => patch({ theme: 'dark' });
  const onDescriptionChange = (val) => patch({ description: val });
  const pickChip = (idx) => {
    const key = ['headache', 'stomach', 'throat', 'knee'][idx];
    const sample = TR[lang].chips[idx];
    patch({ currentCase: key, description: sample });
  };

  const goRecord = () => {
    clearInterval(recTimerRef.current);
    clearTimeout(loadTimerRef.current);
    patch({ screen: 'record', recording: true, recordSeconds: 0 });
    recTimerRef.current = setInterval(() => patch((s) => ({ recordSeconds: s.recordSeconds + 1 })), 1000);
  };
  const cancelRecording = () => { clearInterval(recTimerRef.current); patch({ recording: false, screen: 'new' }); };
  const stopRecording = () => {
    clearInterval(recTimerRef.current);
    patch({ recording: false, screen: 'loading' });
    loadTimerRef.current = setTimeout(() => patch({ screen: 'assessment' }), 1500);
  };
  const analyzeText = () => {
    if (!description.trim()) return;
    patch({ screen: 'loading' });
    loadTimerRef.current = setTimeout(() => patch({ screen: 'assessment' }), 1500);
  };

  const toggleLocalOnly = () => patch((s) => ({ localOnly: !s.localOnly }));
  const setRetention = (v) => patch({ retention: v });
  const openDeleteSheet = () => patch({ showDeleteSheet: true });
  const closeDeleteSheet = () => patch({ showDeleteSheet: false });
  const confirmDelete = () => patch({ showDeleteSheet: false, screen: 'start' });

  if (!fontsLoaded) return null;

  const t = TR[lang];
  const tk = tokens(theme);
  const caseData0 = CASES[lang][currentCase];

  const styles = {
    screen: { flex: 1, backgroundColor: tk.screenBg },
    screenPad: { padding: 18, paddingTop: 20 },
    screenPadNoTop: { padding: 18, paddingTop: 14 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowStart: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: { backgroundColor: tk.badgeBg, color: tk.textNormal, fontSize: 11, fontWeight: '600', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, overflow: 'hidden' },
    badgeDark: { backgroundColor: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 11, fontWeight: '600', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, overflow: 'hidden' },
    brandSmall: { color: tk.textStrong, fontWeight: '800', fontSize: 13, letterSpacing: ls(13, 0.08) },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: tk.card, alignItems: 'center', justifyContent: 'center', ...cardShadow },
    onbHeadline: { color: tk.textStrong, fontSize: 30, fontWeight: '800', letterSpacing: ls(30, -0.01), marginTop: 22, marginBottom: 6, lineHeight: lh(30, 1.15) },
    onbSubtitle: { color: tk.textMuted, fontSize: 14, lineHeight: lh(14, 1.5), marginBottom: 22 },
    onbList: { gap: 12, marginBottom: 22 },
    onbCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: tk.card, borderRadius: 18, padding: 16, ...cardShadow },
    onbNum: { width: 26, height: 26, borderRadius: 8, backgroundColor: tk.badgeBg, color: tk.textNormal, fontWeight: '700', fontSize: 13, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden' },
    onbCardTitle: { color: tk.textStrong, fontWeight: '700', fontSize: 14.5, marginBottom: 3 },
    onbCardBody: { color: tk.textMuted, fontSize: 12.5, lineHeight: lh(12.5, 1.45) },
    consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
    checkboxBox: { width: 18, height: 18, marginTop: 1, borderRadius: 4, borderWidth: 1.5, borderColor: tk.divider, alignItems: 'center', justifyContent: 'center' },
    checkboxBoxChecked: { backgroundColor: tk.accent, borderColor: tk.accent },
    ctaButton: { width: '100%', height: 50, borderRadius: 14, backgroundColor: consent || screen !== 'onboarding' ? tk.accent : tk.divider, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    ctaButtonText: { color: consent || screen !== 'onboarding' ? tk.accentText : tk.textFaint, fontSize: 15, fontWeight: '700' },
    onbFootnote: { textAlign: 'center', color: tk.textMuted, fontSize: 12, marginTop: 16 },
    loginScreen: { flex: 1, padding: 24, paddingTop: 64, backgroundColor: tk.screenBg },
    loginTop: { alignItems: 'center', gap: 6, marginBottom: 28 },
    loginAvatar: { width: 72, height: 72, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
    wordmarkDark: { color: tk.textStrong, fontWeight: '800', fontSize: 16, letterSpacing: ls(16, 0.1) },
    loginSubtitle: { color: tk.textMuted, fontSize: 12.5, textAlign: 'center' },
    loginForm: { gap: 10 },
    loginInput: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: tk.divider, backgroundColor: tk.card, color: tk.textStrong, fontSize: 14, paddingHorizontal: 16 },
    secondaryButtonFull: { width: '100%', height: 50, borderRadius: 14, borderWidth: 1, borderColor: tk.divider, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    secondaryButtonFullText: { color: tk.textStrong, fontWeight: '700', fontSize: 15 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
    dividerLine: { flex: 1, height: 1, backgroundColor: tk.divider },
    oauthButton: { width: '100%', height: 50, borderRadius: 14, borderWidth: 1, borderColor: tk.divider, backgroundColor: tk.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    oauthButtonText: { color: tk.textStrong, fontWeight: '600', fontSize: 14 },
    loginBackRow: { textAlign: 'center', color: tk.textNormal, fontSize: 12.5, fontWeight: '600', marginTop: 16 },
    profilePhotoLink: { color: tk.accent, fontSize: 12.5, fontWeight: '600' },
    fieldLabel: { color: tk.textMuted, fontSize: 11.5, fontWeight: '600', marginTop: 4 },
    profileSavedNote: { textAlign: 'center', color: '#2f8f5b', fontSize: 12.5, fontWeight: '600' },
    navyHeader: { backgroundColor: '#142939', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, padding: 18, paddingTop: 20, paddingBottom: 40 },
    kicker: { color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: '700', letterSpacing: ls(11, 0.12) },
    kickerLight: { color: tk.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: ls(11, 0.12) },
    greeting: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 14, marginBottom: 20 },
    trendLabel: { color: 'rgba(255,255,255,.55)', fontSize: 12.5, marginBottom: 10 },
    trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 44 },
    trendFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    trendFootText: { color: 'rgba(255,255,255,.45)', fontSize: 10.5 },
    emergencyPromoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tk.card, borderRadius: 19, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(198,40,40,.25)', ...cardShadow },
    iconBoxAlert: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme === 'dark' ? '#3a1a1a' : '#fdeaea', alignItems: 'center', justifyContent: 'center' },
    emergencyPromoTitle: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    kpiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginTop: -20 },
    kpiCard: { flex: 1, backgroundColor: tk.card, borderRadius: 18, padding: 14, alignItems: 'center', ...cardShadow },
    kpiVal: { color: tk.textStrong, fontSize: 22, fontWeight: '700', letterSpacing: ls(22, -0.02) },
    kpiLabel: { color: tk.textMuted, fontSize: 11, marginTop: 2 },
    sectionTitleTop: { color: tk.textStrong, fontWeight: '700', fontSize: 14, marginTop: 22, marginBottom: 10 },
    sectionTitleInCard: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    card: { backgroundColor: tk.card, borderRadius: 19, padding: 14, marginBottom: 10, ...cardShadow },
    pageTitle: { color: tk.textStrong, fontWeight: '800', fontSize: 26, marginTop: 4, marginBottom: 4 },
    pageSubtitle: { color: tk.textMuted, fontSize: 13, marginBottom: 18 },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    distLabel: { color: tk.textNormal, fontSize: 12.5, width: 62 },
    distTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: tk.divider, overflow: 'hidden' },
    distCount: { color: tk.textStrong, fontSize: 13, fontWeight: '700', minWidth: 32, textAlign: 'right' },
    histTitle: { color: tk.textStrong, fontWeight: '700', fontSize: 13.5 },
    histMeta: { color: tk.textMuted, fontSize: 11.5, marginTop: 4 },
    textarea: { minHeight: 130, borderRadius: 16, borderWidth: 1, borderColor: tk.divider, backgroundColor: tk.card, color: tk.textStrong, fontSize: 14, padding: 14, lineHeight: lh(14, 1.5), textAlignVertical: 'top' },
    textareaFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 14 },
    textareaFootText: { color: tk.textFaint, fontSize: 11 },
    iconBoxDark: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#142939', alignItems: 'center', justifyContent: 'center' },
    iconBoxLight: { width: 40, height: 40, borderRadius: 12, backgroundColor: tk.badgeBg, alignItems: 'center', justifyContent: 'center' },
    rowSubtitle: { color: tk.textMuted, fontSize: 11.5, marginTop: 2 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 18 },
    recordScreen: { flex: 1, backgroundColor: '#0f2230', alignItems: 'center', padding: 20, paddingTop: 40 },
    recordTimer: { color: '#fff', fontSize: 46, fontWeight: '700', marginTop: 22, marginBottom: 30, letterSpacing: ls(46, -0.02) },
    waveRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 70 },
    recordHintTop: { color: 'rgba(255,255,255,.7)', fontSize: 12.5, textAlign: 'center', lineHeight: lh(12.5, 1.5), marginTop: 26, maxWidth: 260 },
    recordBottom: { alignItems: 'center', gap: 10, marginTop: 'auto' },
    pulseWrap: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
    recordBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e2001a', alignItems: 'center', justifyContent: 'center' },
    recordStopLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
    recordCancel: { color: 'rgba(255,255,255,.55)', fontSize: 12.5 },
    loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    loadingSub: { color: tk.textMuted, fontSize: 12.5, marginBottom: 10 },
    navyCard: { backgroundColor: '#142939', borderRadius: 19, padding: 16, marginBottom: 6 },
    navyKicker: { color: 'rgba(255,255,255,.55)', fontSize: 10.5, fontWeight: '700', letterSpacing: ls(10.5, 0.1), marginBottom: 6 },
    urgencyValue: { color: '#fff', fontWeight: '800', fontSize: 26 },
    urgencyPill: { color: '#227a44', backgroundColor: '#c9ecd4', fontSize: 11, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20, overflow: 'hidden' },
    urgencyDesc: { color: 'rgba(255,255,255,.7)', fontSize: 12.5, marginTop: 8, lineHeight: lh(12.5, 1.5) },
    findingLabel: { color: tk.textStrong, fontSize: 12.5, fontWeight: '600' },
    findingPct: { color: tk.textStrong, fontSize: 12.5, fontWeight: '700' },
    findingsFoot: { color: tk.textFaint, fontSize: 10.5, marginTop: 8 },
    causeTitle: { color: tk.textStrong, fontSize: 13.5, fontWeight: '700' },
    causeDesc: { color: tk.textMuted, fontSize: 12, marginTop: 3, lineHeight: lh(12, 1.4) },
    transcriptBoxLight: { color: tk.textNormal, fontSize: 13, lineHeight: lh(13, 1.9), marginTop: 10 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
    disclaimerCard: { flexDirection: 'row', backgroundColor: '#fdf4d8', borderWidth: 1, borderColor: '#eddc9c', borderRadius: 14, padding: 14, gap: 10, alignItems: 'flex-start', marginTop: 8, marginBottom: 18 },
    disclaimerText: { flex: 1, color: '#7a5d0a', fontSize: 12, lineHeight: lh(12, 1.5) },
    disclaimerCardInfo: { flexDirection: 'row', backgroundColor: tk.tintBlue.bg, borderRadius: 14, padding: 14, gap: 10, alignItems: 'flex-start', marginTop: 8, marginBottom: 18 },
    disclaimerTextInfo: { flex: 1, color: tk.tintBlue.fg, fontSize: 12, lineHeight: lh(12, 1.5) },
    twoButtonRow: { flexDirection: 'row', gap: 10 },
    secondaryButton: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: tk.divider, alignItems: 'center', justifyContent: 'center' },
    secondaryButtonText: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    ctaButtonFlex: { flex: 1, height: 48, borderRadius: 14, backgroundColor: tk.accent, alignItems: 'center', justifyContent: 'center' },
    ctaButtonFlexText: { color: tk.accentText, fontWeight: '700', fontSize: 14 },
    dangerButton: { width: '100%', height: 48, borderRadius: 14, backgroundColor: '#c62828', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    dangerButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    dangerText: { color: '#c62828', fontSize: 14, fontWeight: '700' },
    redHeader: { backgroundColor: '#5c0f18', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, padding: 18, paddingTop: 20, paddingBottom: 26 },
    closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
    emergencyHeadline: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 14 },
    emergencySub: { color: 'rgba(255,255,255,.75)', fontSize: 12.5, marginTop: 8, lineHeight: lh(12.5, 1.5) },
    callCol: { gap: 10, marginTop: 16, marginBottom: 4 },
    callCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tk.card, borderRadius: 18, padding: 14, ...cardShadow },
    callNumber: { color: tk.textStrong, fontSize: 26, fontWeight: '700', letterSpacing: ls(26, -0.02) },
    callTitle: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    callRoundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2001a', alignItems: 'center', justifyContent: 'center' },
    warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
    warnDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c62828', marginTop: 7 },
    warnText: { flex: 1, color: tk.textNormal, fontSize: 13 },
    locationCard: { flexDirection: 'row', backgroundColor: tk.card, borderRadius: 18, padding: 14, gap: 12, alignItems: 'center', ...cardShadow },
    textMutedSmall: { color: tk.textMuted, fontSize: 11 },
    heatmapHeaderRow: { flexDirection: 'row', gap: 4, marginTop: 14 },
    heatmapColLabel: { flex: 1, color: tk.textFaint, fontSize: 9, textAlign: 'center' },
    heatmapDataRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4 },
    heatmapRowLabel: { width: 44, color: tk.textNormal, fontSize: 11 },
    heatmapCell: { flex: 1, aspectRatio: 1, borderRadius: 5 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    legendTrack: { flex: 1, flexDirection: 'row', gap: 2 },
    triggerRow2: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tk.inset, borderRadius: 14, padding: 14, marginBottom: 8 },
    triggerCountBig: { color: tk.accent, fontSize: 17, fontWeight: '700' },
    settingsRow3: { flexDirection: 'row', gap: 8, marginTop: 12 },
    settingsRow2: { flexDirection: 'row', gap: 8, marginTop: 12 },
    optionCell: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    optionCellRow: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    bottomNav: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: tk.navBg, borderTopWidth: 1, borderTopColor: tk.divider },
    navItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
    navLabel: { fontSize: 10, fontWeight: '600' },
    navPlus: { width: 52, height: 52, borderRadius: 20, backgroundColor: tk.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginHorizontal: 6, marginTop: -14, shadowColor: '#285172', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 4 },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end', alignItems: 'center' },
    sheet: { width: '100%', backgroundColor: tk.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingTop: 14, paddingBottom: 30 },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: tk.divider, alignSelf: 'center', marginBottom: 16 },
    sheetTitle: { color: tk.textStrong, fontWeight: '800', fontSize: 16, marginBottom: 8 },
    divider: { height: 1, backgroundColor: tk.divider, marginVertical: 12 },
    storageValue: { color: tk.textStrong, fontSize: 20, fontWeight: '700' },
    textStrong: { color: tk.textStrong },
    textNormal: { color: tk.textNormal },
    textMuted: { color: tk.textMuted, fontSize: 12.5, lineHeight: lh(12.5, 1.5) },
  };

  const langCodes = ['de', 'en', 'fr'];
  const langLabelMap = { de: 'DE', en: 'EN', fr: 'FR' };
  const langOptions = langCodes.map((c) => ({
    label: langLabelMap[c] + ' · ' + { de: 'Deutsch', en: 'English', fr: 'Français' }[c],
    pick: () => setLang(c),
    style: [styles.optionCell, { backgroundColor: lang === c ? tk.accentSelectedBg : 'transparent', borderWidth: 1.5, borderColor: lang === c ? tk.accentSelectedBorder : tk.divider }],
    textStyle: { fontSize: 13, fontWeight: '700', color: lang === c ? (theme === 'dark' ? '#fff' : tk.textStrong) : tk.textNormal },
  }));

  const themeButtonStyle = (active) => [styles.optionCellRow, { backgroundColor: active ? tk.accentSelectedBg : 'transparent', borderWidth: 1.5, borderColor: active ? tk.accentSelectedBorder : tk.divider }];

  const caseOrder = ['headache', 'stomach', 'throat', 'knee'];
  const chips = t.chips.map((label, i) => ({
    label,
    pick: () => pickChip(i),
    style: [
      { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5,
        backgroundColor: currentCase === caseOrder[i] ? tk.accentSelectedBg : 'transparent',
        borderColor: currentCase === caseOrder[i] ? tk.accentSelectedBorder : tk.divider },
    ],
    textStyle: { fontSize: 12.5, fontWeight: '600', color: currentCase === caseOrder[i] ? (theme === 'dark' ? '#fff' : tk.textStrong) : tk.textNormal },
  }));

  const retentionOptions = [7, 30, 365].map((v) => ({
    label: v === 365 ? (lang === 'de' ? '1 Jahr' : lang === 'fr' ? '1 an' : '1 year') : v + (lang === 'de' ? ' Tage' : lang === 'fr' ? ' jours' : ' days'),
    pick: () => setRetention(v),
    style: [styles.optionCell, { backgroundColor: retention === v ? tk.accentSelectedBg : 'transparent', borderWidth: 1.5, borderColor: retention === v ? tk.accentSelectedBorder : tk.divider }],
    textStyle: { fontSize: 12.5, fontWeight: '700', color: retention === v ? (theme === 'dark' ? '#fff' : tk.textStrong) : tk.textNormal },
  }));

  const kpis = { entries: 9, regions: 3, emergencies: 0 };
  const trendMax = Math.max(...TREND);
  const trendBars = TREND.map((v) => ({ height: 8 + (v / trendMax) * 36 }));

  const distMax = Math.max(...DIST);
  const distribution = t.patternRegions.map((label, i) => ({ label, pct: DIST[i], width: (DIST[i] / distMax) * 100 }));

  const histCases = ['headache', 'knee', 'stomach', 'throat'];
  const histDates = lang === 'de' ? ['Heute', 'Gestern', 'Vor 3 Tagen', 'Letzte Woche'] : lang === 'fr' ? ["Aujourd'hui", 'Hier', 'Il y a 3 jours', 'La semaine dernière'] : ['Today', 'Yesterday', '3 days ago', 'Last week'];
  const history = histCases.map((key, i) => {
    const c = CASES[lang][key];
    const uc = { low: '#2f8f5b', mid: '#b9770e', high: '#c62828' }[c.urgency];
    return { title: c.title, date: histDates[i], region: t.regions[i], urgencyLabel: c.urgencyLabel, urgencyColor: uc, open: () => patch({ currentCase: key, screen: 'assessment' }) };
  });

  const findingBarColors = theme === 'dark' ? ['#b9dcf7', '#7fb2d9', '#4d7ea3'] : ['#142939', '#285172', '#7fb2d9'];
  const causeBorderColors = theme === 'dark' ? ['#b9dcf7', '#e0b060', '#6fcf97'] : ['#142939', '#e08a2e', '#5aa7d8'];
  const probPillStyle = (prob) => {
    const map = {
      high: { bg: '#c9ecd4', fg: '#227a44', label: { de: 'wahrscheinlich', en: 'likely', fr: 'probable' } },
      mid: { bg: '#fbe3b8', fg: '#8a5a08', label: { de: 'möglich', en: 'possible', fr: 'possible' } },
      low: { bg: tk.inset, fg: tk.textMuted, label: { de: 'gering', en: 'unlikely', fr: 'peu probable' } },
    };
    const m = map[prob];
    return { bg: m.bg, fg: m.fg, label: m.label[lang] };
  };

  const segColor = (c) => (c ? tk['tint' + c[0].toUpperCase() + c.slice(1)] : null);
  const caseData = {
    title: caseData0.title, urgencyLabel: caseData0.urgencyLabel, urgencyTag: caseData0.urgencyTag, urgencyDesc: caseData0.urgencyDesc,
    segments: caseData0.segments.map((s) => {
      const tint = segColor(s.c);
      return { t: s.t, style: tint ? { backgroundColor: tint.bg, color: tint.fg, fontWeight: '600' } : {} };
    }),
    findings: caseData0.findings.map((f, i) => ({ label: f.label, pctLabel: f.pct + '%', width: f.pct, marginBottom: i < caseData0.findings.length - 1 ? 14 : 0, color: findingBarColors[i % 3] })),
    causes: caseData0.causes.map((c, i) => {
      const p = probPillStyle(c.prob);
      return { label: c.label, desc: c.desc, probLabel: p.label, pillBg: p.bg, pillFg: p.fg, borderColor: causeBorderColors[i % 3], marginBottom: i < caseData0.causes.length - 1 ? 8 : 0 };
    }),
    steps: caseData0.steps,
  };

  const weekLabels = t.weeks;
  const heatMax = 3;
  const heatmapRows = t.patternRegions.map((label, ri) => ({ label, cells: HEAT[ri].map((v) => heatColor(v / heatMax, tk.heatFrom, tk.heatTo)) }));
  const legendSwatches = [0, 0.25, 0.5, 0.75, 1].map((f) => heatColor(f, tk.heatFrom, tk.heatTo));

  const triggerData = lang === 'de'
    ? [['Bildschirmzeit', 'Kopfschmerz am Abend'], ['Training', 'Knie und Rücken'], ['Prüfungswochen', 'Bauchschmerz, Übelkeit']]
    : lang === 'fr'
    ? [['Temps d’écran', 'Mal de tête le soir'], ['Entraînement', 'Genou et dos'], ['Semaines d’examens', 'Mal au ventre, nausée']]
    : [['Screen time', 'Headache in the evening'], ['Training', 'Knee and back'], ['Exam weeks', 'Stomach ache, nausea']];
  const triggers = triggerData.map((d, i) => ({ label: d[0], sub: d[1], count: [6, 4, 3][i] }));

  const callNumbers = lang === 'de'
    ? [
        { label: 'Sanitätsnotruf', sub: 'Schweiz, rund um die Uhr', number: '144', tel: 'tel:144' },
        { label: 'Euronotruf', sub: 'Europaweit, auch ohne SIM', number: '112', tel: 'tel:112' },
        { label: 'Tox Info Suisse', sub: 'Vergiftungen', number: '145', tel: 'tel:145' },
        { label: 'Die Dargebotene Hand', sub: 'Gespräch in Krisen', number: '143', tel: 'tel:143' },
      ]
    : lang === 'fr'
    ? [
        { label: 'Ambulance', sub: 'Suisse, 24 h/24', number: '144', tel: 'tel:144' },
        { label: 'Urgence européenne', sub: 'Dans toute l’Europe, même sans carte SIM', number: '112', tel: 'tel:112' },
        { label: 'Tox Info Suisse', sub: 'Intoxications', number: '145', tel: 'tel:145' },
        { label: 'La Main Tendue', sub: 'Écoute en cas de crise', number: '143', tel: 'tel:143' },
      ]
    : [
        { label: 'Ambulance', sub: 'Switzerland, 24/7', number: '144', tel: 'tel:144' },
        { label: 'European emergency', sub: 'Europe-wide, even without a SIM', number: '112', tel: 'tel:112' },
        { label: 'Poison center', sub: 'Poisoning', number: '145', tel: 'tel:145' },
        { label: 'Helpline', sub: 'Talk in a crisis', number: '143', tel: 'tel:143' },
      ];

  const mins = Math.floor(recordSeconds / 60), secs = recordSeconds % 60;
  const recordTimeLabel = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  const waveBars = Array.from({ length: 20 }).map((_, i) => ({
    height: 14 + ((i * 37) % 26), color: i % 3 === 0 ? '#fff' : '#b9dcf7', delay: i * 40, duration: (0.6 + (i % 5) * 0.08) * 1000,
  }));

  const onbSteps = [
    { n: 1, title: t.on.step1Title, body: t.on.step1Body },
    { n: 2, title: t.on.step2Title, body: t.on.step2Body },
    { n: 3, title: t.on.step3Title, body: t.on.step3Body },
  ];

  const showBottomNav = !['login', 'signup', 'profile', 'record', 'loading', 'onboarding'].includes(screen);
  const charCount = description.length + ' / 600';
  const analyzeDisabled = !description.trim();
  const statusBarStyle = ['start', 'record', 'emergency', 'login'].includes(screen) || theme === 'dark' ? 'light' : 'dark';
  const navColor = (key) => (screen === key ? tk.accent : tk.textMuted);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.screenBg }} edges={['top', 'left', 'right']}>
      <StatusBar style={statusBarStyle} />

      <ScrollView style={styles.screen} contentContainerStyle={{ flexGrow: 1 }}>
        {screen === 'login' && (
          <View style={styles.loginScreen}>
            <View style={styles.loginTop}>
              <View style={styles.loginAvatar}><LogoMark size={64} /></View>
              <T style={styles.wordmarkDark}>SYMTORA</T>
              <T style={styles.loginSubtitle}>{t.login.subtitle}</T>
            </View>
            <View style={styles.loginForm}>
              <TextInput value={loginEmail} onChangeText={onEmailChange} placeholder={t.login.emailPlaceholder} placeholderTextColor={tk.textFaint} autoCapitalize="none" style={styles.loginInput} />
              <TextInput value={loginPassword} onChangeText={onPasswordChange} placeholder={t.login.passwordPlaceholder} placeholderTextColor={tk.textFaint} secureTextEntry style={styles.loginInput} />
              <Pressable onPress={loginSubmit} style={styles.ctaButton}><T style={styles.ctaButtonText}>{t.login.loginCta}</T></Pressable>
              <Pressable onPress={goSignup} style={styles.secondaryButtonFull}><T style={styles.secondaryButtonFullText}>{t.login.signupCta}</T></Pressable>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <T style={styles.textMutedSmall}>{t.login.divider}</T>
                <View style={styles.dividerLine} />
              </View>
              <Pressable onPress={loginSubmit} style={styles.oauthButton}><IconGoogle /><T style={styles.oauthButtonText}>{t.login.google}</T></Pressable>
              <Pressable onPress={loginSubmit} style={styles.oauthButton}><IconApple color={tk.textStrong} /><T style={styles.oauthButtonText}>{t.login.apple}</T></Pressable>
            </View>
            <T style={styles.onbFootnote}>{t.on.emergencyNote}</T>
          </View>
        )}

        {screen === 'signup' && (
          <View style={styles.loginScreen}>
            <View style={styles.loginTop}>
              <View style={styles.loginAvatar}><LogoMark size={64} /></View>
              <T style={styles.wordmarkDark}>SYMTORA</T>
              <T style={styles.loginSubtitle}>{t.signup.subtitle}</T>
            </View>
            <View style={styles.loginForm}>
              <TextInput value={signupName} onChangeText={onSignupNameChange} placeholder={t.signup.namePlaceholder} placeholderTextColor={tk.textFaint} style={styles.loginInput} />
              <TextInput value={signupEmail} onChangeText={onSignupEmailChange} placeholder={t.signup.emailPlaceholder} placeholderTextColor={tk.textFaint} autoCapitalize="none" style={styles.loginInput} />
              <TextInput value={signupPassword} onChangeText={onSignupPasswordChange} placeholder={t.signup.passwordPlaceholder} placeholderTextColor={tk.textFaint} secureTextEntry style={styles.loginInput} />
              <TextInput value={signupConfirm} onChangeText={onSignupConfirmChange} placeholder={t.signup.confirmPlaceholder} placeholderTextColor={tk.textFaint} secureTextEntry style={styles.loginInput} />
              <Pressable onPress={toggleSignupConsent} style={styles.consentRow}>
                <View style={[styles.checkboxBox, signupConsent && styles.checkboxBoxChecked]}>
                  {signupConsent && <IconCheck color={theme === 'dark' ? '#142939' : '#fff'} />}
                </View>
                <T style={[styles.textMuted, { flex: 1 }]}>{t.signup.consent}</T>
              </Pressable>
              <Pressable onPress={signupSubmit} disabled={signupDisabled} style={styles.ctaButton}><T style={styles.ctaButtonText}>{t.signup.cta}</T></Pressable>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <T style={styles.textMutedSmall}>{t.login.divider}</T>
                <View style={styles.dividerLine} />
              </View>
              <Pressable onPress={signupSubmit} style={styles.oauthButton}><IconGoogle /><T style={styles.oauthButtonText}>{t.login.google}</T></Pressable>
              <Pressable onPress={signupSubmit} style={styles.oauthButton}><IconApple color={tk.textStrong} /><T style={styles.oauthButtonText}>{t.login.apple}</T></Pressable>
            </View>
            <Pressable onPress={goLogin}><T style={styles.loginBackRow}>{t.signup.haveAccount}</T></Pressable>
          </View>
        )}

        {screen === 'profile' && (
          <View style={styles.screenPad}>
            <View style={styles.rowBetween}>
              <Pressable onPress={goData} style={styles.backBtn}><IconChevronLeft color={tk.textStrong} /></Pressable>
              <T style={styles.badge}>{t.badgeLocal}</T>
            </View>
            <T style={styles.pageTitle}>{t.profile.title}</T>
            <T style={styles.pageSubtitle}>{t.profile.subtitle}</T>
            <View style={styles.loginTop}>
              <View style={styles.loginAvatar}><Avatar size={72} name={profileName} bg={tk.badgeBg} fg={tk.textNormal} /></View>
              <Pressable onPress={changePhoto}><T style={styles.profilePhotoLink}>{t.profile.changePhoto}</T></Pressable>
            </View>
            <View style={styles.loginForm}>
              <T style={styles.fieldLabel}>{t.profile.nameLabel}</T>
              <TextInput value={profileName} onChangeText={onProfileNameChange} style={styles.loginInput} />
              <T style={styles.fieldLabel}>{t.profile.emailLabel}</T>
              <TextInput value={profileEmail} onChangeText={onProfileEmailChange} autoCapitalize="none" style={styles.loginInput} />
              <T style={styles.fieldLabel}>{t.profile.newPasswordLabel}</T>
              <TextInput value={profileNewPassword} onChangeText={onProfileNewPasswordChange} placeholder={t.profile.newPasswordPlaceholder} placeholderTextColor={tk.textFaint} secureTextEntry style={styles.loginInput} />
              <Pressable onPress={saveProfile} style={styles.ctaButton}><T style={styles.ctaButtonText}>{t.profile.save}</T></Pressable>
              {profileSaved && <T style={styles.profileSavedNote}>{t.profile.saved}</T>}
            </View>
          </View>
        )}

        {screen === 'onboarding' && (
          <View style={styles.screenPad}>
            <View style={styles.rowBetween}>
              <View style={styles.rowStart}>
                <LogoMark size={22} />
                <T style={styles.brandSmall}>SYMTORA</T>
              </View>
              <T style={styles.badge}>{t.badgeLocal}</T>
            </View>
            <T style={styles.onbHeadline}>{t.on.headline}</T>
            <T style={styles.onbSubtitle}>{t.on.subtitle}</T>
            <View style={styles.onbList}>
              {onbSteps.map((st) => (
                <View key={st.n} style={styles.onbCard}>
                  <T style={styles.onbNum}>{st.n}</T>
                  <View style={{ flex: 1 }}>
                    <T style={styles.onbCardTitle}>{st.title}</T>
                    <T style={styles.onbCardBody}>{st.body}</T>
                  </View>
                </View>
              ))}
            </View>
            <Pressable onPress={toggleConsent} style={styles.consentRow}>
              <View style={[styles.checkboxBox, consent && styles.checkboxBoxChecked]}>
                {consent && <IconCheck color={theme === 'dark' ? '#142939' : '#fff'} />}
              </View>
              <T style={[styles.textMuted, { flex: 1 }]}>{t.on.consent}</T>
            </Pressable>
            <Pressable onPress={startApp} disabled={!consent} style={styles.ctaButton}>
              <T style={styles.ctaButtonText}>{t.on.cta}</T>
            </Pressable>
            <T style={styles.onbFootnote}>{t.on.emergencyNote}</T>
          </View>
        )}

        {screen === 'start' && (
          <View>
            <View style={styles.navyHeader}>
              <View style={styles.rowBetween}>
                <T style={styles.kicker}>SYMTORA</T>
                <T style={styles.badgeDark}>{t.badgeLocal}</T>
              </View>
              <T style={styles.greeting}>{t.start.greeting}</T>
              <T style={styles.trendLabel}>{t.start.trendSubtitle}</T>
              <View style={styles.trendRow}>
                {trendBars.map((bar, i) => (
                  <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                    <View style={{ width: '100%', height: bar.height, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.55)' }} />
                  </View>
                ))}
              </View>
              <View style={styles.trendFootRow}>
                <T style={styles.trendFootText}>{t.start.trendLabel}</T>
                <T style={styles.trendFootText}>{t.start.trendRange}</T>
              </View>
            </View>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}><T style={styles.kpiVal}>{kpis.entries}</T><T style={styles.kpiLabel}>{t.start.kpiEntries}</T></View>
              <View style={styles.kpiCard}><T style={styles.kpiVal}>{kpis.regions}</T><T style={styles.kpiLabel}>{t.start.kpiRegions}</T></View>
              <View style={styles.kpiCard}><T style={styles.kpiVal}>{kpis.emergencies}</T><T style={styles.kpiLabel}>{t.start.kpiEmergencies}</T></View>
            </View>
            <View style={styles.screenPadNoTop}>
              <Pressable onPress={goEmergency} style={styles.emergencyPromoCard}>
                <View style={styles.iconBoxAlert}><IconWarning color="#b9770e" /></View>
                <View style={{ flex: 1 }}>
                  <T style={styles.emergencyPromoTitle}>{t.start.emergencyPromoTitle}</T>
                  <T style={styles.rowSubtitle}>{t.start.emergencyPromoSub}</T>
                </View>
                <IconChevron color={tk.textFaint} />
              </Pressable>
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <T style={styles.sectionTitleInCard}>{t.start.distributionTitle}</T>
                  <T style={styles.textMutedSmall}>{t.start.distributionRange}</T>
                </View>
                <View style={{ marginTop: 12 }}>
                  {distribution.map((d, i) => (
                    <View key={i} style={styles.distRow}>
                      <T style={styles.distLabel}>{d.label}</T>
                      <View style={styles.distTrack}><View style={{ height: '100%', width: `${d.width}%`, backgroundColor: tk.accent, borderRadius: 4 }} /></View>
                      <T style={styles.distCount}>{d.pct}%</T>
                    </View>
                  ))}
                </View>
              </View>
              <T style={styles.sectionTitleTop}>{t.start.recentTitle}</T>
              <View>
                {history.map((h, i) => (
                  <Pressable key={i} onPress={h.open} style={styles.card}>
                    <View style={styles.rowBetween}>
                      <T style={styles.histTitle}>{h.title}</T>
                      <T style={{ color: '#fff', backgroundColor: h.urgencyColor, fontSize: 10, fontWeight: '700', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, overflow: 'hidden' }}>{h.urgencyLabel}</T>
                    </View>
                    <T style={styles.histMeta}>{h.date} · {h.region}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {screen === 'new' && (
          <View style={styles.screenPad}>
            <View style={styles.rowBetween}>
              <Pressable onPress={goStart} style={styles.backBtn}><IconChevronLeft color={tk.textStrong} /></Pressable>
              <T style={styles.badge}>{t.badgeLocal}</T>
            </View>
            <T style={styles.pageTitle}>{t.newDesc.title}</T>
            <T style={styles.pageSubtitle}>{t.newDesc.subtitle}</T>
            <TextInput
              value={description}
              onChangeText={onDescriptionChange}
              placeholder={t.newDesc.placeholder}
              placeholderTextColor={tk.textFaint}
              multiline
              style={styles.textarea}
            />
            <View style={styles.textareaFootRow}>
              <T style={styles.textareaFootText}>{t.newDesc.helperNote}</T>
              <T style={styles.textareaFootText}>{charCount}</T>
            </View>
            <Pressable onPress={goRecord} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.rowStart}>
                  <View style={styles.iconBoxDark}><IconMic color="#fff" size={20} /></View>
                  <View style={{ flex: 1 }}>
                    <T style={styles.textStrong}>{t.newDesc.speakInstead}</T>
                    <T style={styles.rowSubtitle}>{t.newDesc.speakSubtitle}</T>
                  </View>
                </View>
                <IconChevron color={tk.textFaint} />
              </View>
            </Pressable>
            <View style={styles.chipsWrap}>
              {chips.map((c, i) => (
                <Pressable key={i} onPress={c.pick} style={c.style}>
                  <T style={c.textStyle}>{c.label}</T>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={analyzeText} disabled={analyzeDisabled} style={styles.ctaButton}>
              <T style={styles.ctaButtonText}>{t.newDesc.analyze}</T>
            </Pressable>
          </View>
        )}

        {screen === 'record' && (
          <View style={styles.recordScreen}>
            <View style={[styles.rowBetween, { width: '100%' }]}>
              <T style={[styles.kicker, { color: 'rgba(255,255,255,.6)' }]}>{t.record.kicker}</T>
              <T style={styles.badgeDark}>{t.badgeLocal}</T>
            </View>
            <T style={styles.recordTimer}>{recordTimeLabel}</T>
            <View style={styles.waveRow}>
              {waveBars.map((w, i) => <WaveBar key={i} height={w.height} color={w.color} delay={w.delay} duration={w.duration} />)}
            </View>
            <T style={styles.recordHintTop}>{t.record.hint}</T>
            <View style={styles.recordBottom}>
              <View style={styles.pulseWrap}>
                <PulseRing size={92} />
                <Pressable onPress={stopRecording} style={styles.recordBtn}><IconStop /></Pressable>
              </View>
              <T style={styles.recordStopLabel}>{t.record.stopLabel}</T>
              <Pressable onPress={cancelRecording}><T style={styles.recordCancel}>{t.record.cancel}</T></Pressable>
            </View>
          </View>
        )}

        {screen === 'loading' && (
          <View style={styles.loadingScreen}>
            <Spinner size={36} color={tk.accent} trackColor={tk.divider} />
            <T style={styles.loadingText}>{t.loading.text}</T>
            <T style={styles.loadingSub}>{t.loading.subtitle}</T>
            <T style={styles.badge}>{t.badgeLocal}</T>
          </View>
        )}

        {screen === 'assessment' && (
          <View style={styles.screenPad}>
            <View style={styles.rowBetween}>
              <Pressable onPress={goStart} style={styles.backBtn}><IconChevronLeft color={tk.textStrong} /></Pressable>
              <T style={styles.badge}>{t.badgeLocal}</T>
            </View>
            <T style={styles.pageTitle}>{t.assess.title}</T>
            <View style={styles.navyCard}>
              <T style={styles.navyKicker}>{t.assess.urgencyKicker}</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <T style={styles.urgencyValue}>{caseData.urgencyLabel}</T>
                <T style={styles.urgencyPill}>{caseData.urgencyTag}</T>
              </View>
              <T style={styles.urgencyDesc}>{caseData.urgencyDesc}</T>
            </View>
            <T style={styles.sectionTitleTop}>{t.assess.findingsTitle}</T>
            <View style={styles.card}>
              {caseData.findings.map((f, i) => (
                <View key={i} style={{ marginBottom: f.marginBottom }}>
                  <View style={styles.rowBetween}>
                    <T style={styles.findingLabel}>{f.label}</T>
                    <T style={styles.findingPct}>{f.pctLabel}</T>
                  </View>
                  <View style={[styles.distTrack, { marginTop: 4 }]}><View style={{ height: '100%', width: `${f.width}%`, backgroundColor: f.color, borderRadius: 4 }} /></View>
                </View>
              ))}
              <T style={styles.findingsFoot}>{t.assess.findingsFoot}</T>
            </View>
            <T style={styles.sectionTitleTop}>{t.assess.causesTitle}</T>
            <View style={styles.card}>
              {caseData.causes.map((c, i) => (
                <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: c.borderColor, backgroundColor: tk.inset, borderRadius: 12, padding: 14, marginBottom: c.marginBottom }}>
                  <View style={styles.rowBetween}>
                    <T style={styles.causeTitle}>{c.label}</T>
                    <T style={{ color: c.pillFg, backgroundColor: c.pillBg, fontSize: 11, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, overflow: 'hidden' }}>{c.probLabel}</T>
                  </View>
                  <T style={styles.causeDesc}>{c.desc}</T>
                </View>
              ))}
            </View>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <T style={styles.sectionTitleInCard}>{t.assess.transcriptTitle}</T>
                <T style={styles.textMutedSmall}>{t.assess.transcriptMeta}</T>
              </View>
              <T style={styles.transcriptBoxLight}>
                {caseData.segments.map((seg, i) => <T key={i} style={seg.style}>{seg.t}</T>)}
              </T>
              <T style={styles.findingsFoot}>{t.assess.transcriptFoot}</T>
            </View>
            <T style={styles.sectionTitleTop}>{t.assess.stepsTitle}</T>
            <View style={styles.card}>
              {caseData.steps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <IconCheck color={tk.accent} />
                  <T style={[styles.textNormal, { flex: 1, fontSize: 13 }]}>{s}</T>
                </View>
              ))}
            </View>
            <View style={styles.disclaimerCard}>
              <IconWarning color="#b9770e" />
              <T style={styles.disclaimerText}>{t.assess.disclaimer}</T>
            </View>
            <View style={styles.twoButtonRow}>
              <Pressable onPress={backToStart} style={styles.secondaryButton}><T style={styles.secondaryButtonText}>{t.assess.correct}</T></Pressable>
              <Pressable onPress={saveAssessment} style={styles.ctaButtonFlex}><T style={styles.ctaButtonFlexText}>{t.assess.save}</T></Pressable>
            </View>
          </View>
        )}

        {screen === 'emergency' && (
          <View>
            <View style={styles.redHeader}>
              <View style={styles.rowBetween}>
                <T style={styles.kicker}>{t.emergency.kicker}</T>
                <Pressable onPress={backToStart} style={styles.closeBtn}><IconClose color="#fff" /></Pressable>
              </View>
              <T style={styles.emergencyHeadline}>{t.emergency.headline}</T>
              <T style={styles.emergencySub}>{t.emergency.subhead}</T>
            </View>
            <View style={styles.screenPad}>
              <View style={styles.callCol}>
                {callNumbers.map((cn, i) => (
                  <View key={i} style={styles.callCard}>
                    <T style={styles.callNumber}>{cn.number}</T>
                    <View style={{ flex: 1 }}>
                      <T style={styles.callTitle}>{cn.label}</T>
                      <T style={styles.rowSubtitle}>{cn.sub}</T>
                    </View>
                    <Pressable onPress={() => Linking.openURL(cn.tel)} style={styles.callRoundBtn}><IconPhone color="#fff" /></Pressable>
                  </View>
                ))}
              </View>
              <T style={styles.sectionTitleTop}>{t.emergency.warningTitle}</T>
              <View style={styles.card}>
                {t.emergency.warnings.map((w, i) => (
                  <View key={i} style={styles.warnRow}>
                    <View style={styles.warnDot} />
                    <T style={styles.warnText}>{w}</T>
                  </View>
                ))}
              </View>
              <T style={styles.sectionTitleTop}>{t.emergency.locationTitle}</T>
              <View style={styles.locationCard}>
                <View style={styles.iconBoxLight}><IconLocation color={tk.textNormal} /></View>
                <View>
                  <T style={styles.textStrong}>{t.emergency.locationLabel}</T>
                  <T style={styles.rowSubtitle}>{t.emergency.locationHint}</T>
                </View>
              </View>
            </View>
          </View>
        )}

        {screen === 'patterns' && (
          <View style={styles.screenPad}>
            <View style={styles.rowBetween}>
              <T style={styles.kickerLight}>{t.patterns.kicker}</T>
              <T style={styles.badge}>{t.badgeLocal}</T>
            </View>
            <T style={styles.pageTitle}>{t.patterns.title}</T>
            <T style={styles.pageSubtitle}>{t.patterns.subtitle}</T>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <T style={styles.sectionTitleInCard}>{t.patterns.freqTitle}</T>
                <T style={styles.textMutedSmall}>{t.patterns.weekRange}</T>
              </View>
              <View style={styles.heatmapHeaderRow}>
                <View style={{ width: 44 }} />
                {weekLabels.map((wl, i) => <T key={i} style={styles.heatmapColLabel}>{wl}</T>)}
              </View>
              {heatmapRows.map((row, ri) => (
                <View key={ri} style={styles.heatmapDataRow}>
                  <T style={styles.heatmapRowLabel}>{row.label}</T>
                  {row.cells.map((color, ci) => <View key={ci} style={[styles.heatmapCell, { backgroundColor: color }]} />)}
                </View>
              ))}
              <View style={styles.legendRow}>
                <T style={styles.textMutedSmall}>{t.patterns.rare}</T>
                <View style={styles.legendTrack}>
                  {legendSwatches.map((color, i) => <View key={i} style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: color }} />)}
                </View>
                <T style={styles.textMutedSmall}>{t.patterns.frequent}</T>
              </View>
            </View>
            <T style={styles.sectionTitleTop}>{t.patterns.triggersTitle}</T>
            <View style={styles.card}>
              {triggers.map((tr, i) => (
                <View key={i} style={styles.triggerRow2}>
                  <T style={styles.triggerCountBig}>{tr.count}×</T>
                  <View>
                    <T style={styles.textStrong}>{tr.label}</T>
                    <T style={styles.rowSubtitle}>{tr.sub}</T>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.disclaimerCardInfo}>
              <IconInfo color={tk.tintBlue.fg} />
              <T style={styles.disclaimerTextInfo}>{t.patterns.disclaimer}</T>
            </View>
          </View>
        )}

        {screen === 'data' && (
          <View style={styles.screenPad}>
            <View style={styles.rowBetween}>
              <T style={styles.kickerLight}>{t.data.kicker}</T>
              <T style={styles.badge}>{t.badgeLocal}</T>
            </View>
            <T style={styles.pageTitle}>{t.data.title}</T>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.rowStart}>
                  <View style={styles.iconBoxLight}><IconStorage color={tk.textNormal} /></View>
                  <View>
                    <T style={styles.textStrong}>{t.data.storageCard}</T>
                    <T style={styles.rowSubtitle}>{t.data.storageSubtitle}</T>
                  </View>
                </View>
                <T style={styles.storageValue}>{t.data.storageSize}</T>
              </View>
            </View>

            <Pressable onPress={goProfile} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.rowStart}>
                  <Avatar size={40} name={profileName} bg={tk.badgeBg} fg={tk.textNormal} />
                  <View>
                    <T style={styles.textStrong}>{profileName}</T>
                    <T style={styles.rowSubtitle}>{t.profile.editLink}</T>
                  </View>
                </View>
                <IconChevron color={tk.textFaint} />
              </View>
            </Pressable>

            <View style={styles.card}>
              <T style={styles.textStrong}>{t.data.appearanceCard}</T>
              <T style={styles.rowSubtitle}>{t.data.appearanceSubtitle}</T>
              <View style={styles.settingsRow2}>
                <Pressable onPress={setLight} style={themeButtonStyle(theme === 'light')}>
                  <IconSun color={theme === 'light' ? tk.textStrong : tk.textNormal} />
                  <T style={{ fontSize: 13, fontWeight: '700', color: theme === 'light' ? tk.textStrong : tk.textNormal }}>{t.data.light}</T>
                </Pressable>
                <Pressable onPress={setDark} style={themeButtonStyle(theme === 'dark')}>
                  <IconMoon color={theme === 'dark' ? '#fff' : tk.textNormal} />
                  <T style={{ fontSize: 13, fontWeight: '700', color: theme === 'dark' ? '#fff' : tk.textNormal }}>{t.data.dark}</T>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <T style={styles.textStrong}>{t.data.langCard}</T>
              <T style={styles.rowSubtitle}>{t.data.langSubtitle}</T>
              <View style={styles.settingsRow3}>
                {langOptions.map((lo, i) => (
                  <Pressable key={i} onPress={lo.pick} style={lo.style}><T style={lo.textStyle}>{lo.label}</T></Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <T style={styles.textStrong}>{t.data.localOnlyToggle}</T>
                  <T style={styles.rowSubtitle}>{t.data.localOnlySubtitle}</T>
                </View>
                <Pressable onPress={toggleLocalOnly} style={{ width: 46, height: 26, borderRadius: 13, backgroundColor: localOnly ? tk.accent : tk.divider, justifyContent: 'center' }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', marginLeft: localOnly ? 23 : 3 }} />
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <T style={styles.textStrong}>{t.data.retentionCard}</T>
              <T style={styles.rowSubtitle}>{t.data.retentionSubtitle}</T>
              <View style={styles.settingsRow3}>
                {retentionOptions.map((ro, i) => (
                  <Pressable key={i} onPress={ro.pick} style={ro.style}><T style={ro.textStyle}>{ro.label}</T></Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <T style={styles.textStrong}>{t.data.export}</T>
                  <T style={styles.rowSubtitle}>{t.data.exportSubtitle}</T>
                </View>
                <IconDownload color={tk.textFaint} />
              </View>
              <View style={styles.divider} />
              <Pressable onPress={openDeleteSheet} style={styles.rowBetween}>
                <T style={styles.dangerText}>{t.data.delete}</T>
                <IconChevron color={tk.textFaint} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {showBottomNav && (
        <View style={styles.bottomNav}>
          <Pressable onPress={goStart} style={styles.navItem}>
            <IconHome color={navColor('start')} />
            <T style={[styles.navLabel, { color: navColor('start') }]}>{t.nav.start}</T>
          </Pressable>
          <Pressable onPress={goPatterns} style={styles.navItem}>
            <IconHistory color={navColor('patterns')} />
            <T style={[styles.navLabel, { color: navColor('patterns') }]}>{t.nav.history}</T>
          </Pressable>
          <Pressable onPress={goNew} style={styles.navPlus}><IconPlus color={tk.accentText} /></Pressable>
          <Pressable onPress={goRecord} style={styles.navItem}>
            <IconMic color={navColor('record')} size={20} />
            <T style={[styles.navLabel, { color: navColor('record') }]}>{t.nav.speak}</T>
          </Pressable>
          <Pressable onPress={goData} style={styles.navItem}>
            <IconSliders color={navColor('data')} />
            <T style={[styles.navLabel, { color: navColor('data') }]}>{t.nav.data}</T>
          </Pressable>
        </View>
      )}

      <Modal visible={showDeleteSheet} transparent animationType="fade" onRequestClose={closeDeleteSheet}>
        <Pressable style={styles.sheetOverlay} onPress={closeDeleteSheet}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <T style={styles.sheetTitle}>{t.data.deleteConfirmTitle}</T>
            <T style={styles.textMuted}>{t.data.deleteConfirmBody}</T>
            <Pressable onPress={confirmDelete} style={styles.dangerButton}><T style={styles.dangerButtonText}>{t.data.deleteConfirmCta}</T></Pressable>
            <Pressable onPress={closeDeleteSheet} style={styles.secondaryButton}><T style={styles.secondaryButtonText}>{t.data.cancel}</T></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
