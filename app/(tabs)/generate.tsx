import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQRData } from '@/hooks/useQRData';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { QR_TYPES, QRTypeId } from '@/constants/config';
import { AdManager } from '@/services/adManager';
import { useAlert } from '@/template';

interface FormData {
  text: string;
  url: string;
  wifi_ssid: string;
  wifi_password: string;
  wifi_security: string;
  phone: string;
  sms_phone: string;
  sms_message: string;
  email_to: string;
  email_subject: string;
  email_body: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  location_lat: string;
  location_lng: string;
  upi_vpa: string;
  upi_name: string;
  upi_amount: string;
}

const defaultForm: FormData = {
  text: '',
  url: '',
  wifi_ssid: '',
  wifi_password: '',
  wifi_security: 'WPA',
  phone: '',
  sms_phone: '',
  sms_message: '',
  email_to: '',
  email_subject: '',
  email_body: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  location_lat: '',
  location_lng: '',
  upi_vpa: '',
  upi_name: '',
  upi_amount: '',
};

function buildQRContent(type: QRTypeId, form: FormData): string {
  switch (type) {
    case 'text': return form.text.trim();
    case 'url': {
      const url = form.url.trim();
      return url.startsWith('http') ? url : `https://${url}`;
    }
    case 'wifi':
      return `WIFI:T:${form.wifi_security};S:${form.wifi_ssid};P:${form.wifi_password};;`;
    case 'phone': return `tel:${form.phone.trim()}`;
    case 'sms': return `smsto:${form.sms_phone.trim()}:${form.sms_message.trim()}`;
    case 'email':
      return `mailto:${form.email_to.trim()}?subject=${encodeURIComponent(form.email_subject)}&body=${encodeURIComponent(form.email_body)}`;
    case 'contact':
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${form.contact_name}\nTEL:${form.contact_phone}\nEMAIL:${form.contact_email}\nEND:VCARD`;
    case 'location':
      return `geo:${form.location_lat},${form.location_lng}`;
    case 'upi':
      return `upi://pay?pa=${form.upi_vpa}&pn=${encodeURIComponent(form.upi_name)}&am=${form.upi_amount}&cu=INR`;
    default: return '';
  }
}

function validateForm(type: QRTypeId, form: FormData): string | null {
  switch (type) {
    case 'text': return form.text.trim() ? null : 'Please enter text';
    case 'url': return form.url.trim() ? null : 'Please enter a URL';
    case 'wifi': return form.wifi_ssid.trim() ? null : 'Please enter WiFi SSID';
    case 'phone': return form.phone.trim() ? null : 'Please enter phone number';
    case 'sms': return form.sms_phone.trim() ? null : 'Please enter phone number';
    case 'email': return form.email_to.trim() ? null : 'Please enter email address';
    case 'contact': return form.contact_name.trim() ? null : 'Please enter contact name';
    case 'location': return (form.location_lat.trim() && form.location_lng.trim()) ? null : 'Please enter coordinates';
    case 'upi': return form.upi_vpa.trim() ? null : 'Please enter UPI VPA';
    default: return 'Invalid type';
  }
}

export default function GenerateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addItem } = useQRData();
  const { showAlert } = useAlert();
  const [selectedType, setSelectedType] = useState<QRTypeId>('text');
  const [form, setForm] = useState<FormData>(defaultForm);

  const updateForm = (key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = useCallback(async () => {
    const error = validateForm(selectedType, form);
    if (error) {
      showAlert('Missing Information', error);
      return;
    }

    const content = buildQRContent(selectedType, form);
    if (!content) {
      showAlert('Error', 'Please fill in the required fields');
      return;
    }

    const typeInfo = QR_TYPES.find(t => t.id === selectedType);
    const title = form[selectedType as keyof FormData] || content;

    try {
      const item = await addItem({
        type: 'generated',
        content,
        title: String(title).length > 40 ? String(title).substring(0, 40) + '...' : String(title),
        subtitle: typeInfo?.label || selectedType,
        qrType: selectedType,
        rawData: content,
      });

      const shouldShowAd = AdManager.onGenerateCompleted();
      if (shouldShowAd) {
        await AdManager.showInterstitial(() => {
          router.push({ pathname: '/generate-detail', params: { id: item.id } });
        });
      } else {
        router.push({ pathname: '/generate-detail', params: { id: item.id } });
      }

      setForm(defaultForm);
    } catch {
      showAlert('Error', 'Failed to generate QR code. Please try again.');
    }
  }, [selectedType, form, addItem, router, showAlert]);

  const renderForm = () => {
    switch (selectedType) {
      case 'text':
        return (
          <Field label="Text Content" required>
            <TextInput style={styles.textarea} multiline numberOfLines={4} placeholder="Enter your text here..."
              value={form.text} onChangeText={v => updateForm('text', v)} placeholderTextColor={Colors.textMuted} />
          </Field>
        );
      case 'url':
        return (
          <Field label="URL" required>
            <TextInput style={styles.input} placeholder="https://example.com" keyboardType="url"
              value={form.url} onChangeText={v => updateForm('url', v)} placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
          </Field>
        );
      case 'wifi':
        return (
          <>
            <Field label="Network Name (SSID)" required>
              <TextInput style={styles.input} placeholder="My WiFi Network"
                value={form.wifi_ssid} onChangeText={v => updateForm('wifi_ssid', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Password">
              <TextInput style={styles.input} placeholder="WiFi password" secureTextEntry
                value={form.wifi_password} onChangeText={v => updateForm('wifi_password', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Security Type">
              <View style={styles.segRow}>
                {['WPA', 'WEP', 'nopass'].map(sec => (
                  <TouchableOpacity key={sec} style={[styles.segBtn, form.wifi_security === sec && styles.segBtnActive]}
                    onPress={() => updateForm('wifi_security', sec)}>
                    <Text style={[styles.segText, form.wifi_security === sec && styles.segTextActive]}>{sec}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
          </>
        );
      case 'phone':
        return (
          <Field label="Phone Number" required>
            <TextInput style={styles.input} placeholder="+91 98765 43210" keyboardType="phone-pad"
              value={form.phone} onChangeText={v => updateForm('phone', v)} placeholderTextColor={Colors.textMuted} />
          </Field>
        );
      case 'sms':
        return (
          <>
            <Field label="Phone Number" required>
              <TextInput style={styles.input} placeholder="+91 98765 43210" keyboardType="phone-pad"
                value={form.sms_phone} onChangeText={v => updateForm('sms_phone', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Message">
              <TextInput style={styles.textarea} multiline numberOfLines={3} placeholder="Your message..."
                value={form.sms_message} onChangeText={v => updateForm('sms_message', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
          </>
        );
      case 'email':
        return (
          <>
            <Field label="To Email" required>
              <TextInput style={styles.input} placeholder="email@example.com" keyboardType="email-address"
                value={form.email_to} onChangeText={v => updateForm('email_to', v)} placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
            </Field>
            <Field label="Subject">
              <TextInput style={styles.input} placeholder="Email subject"
                value={form.email_subject} onChangeText={v => updateForm('email_subject', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Body">
              <TextInput style={styles.textarea} multiline numberOfLines={3} placeholder="Email body..."
                value={form.email_body} onChangeText={v => updateForm('email_body', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
          </>
        );
      case 'contact':
        return (
          <>
            <Field label="Full Name" required>
              <TextInput style={styles.input} placeholder="John Doe"
                value={form.contact_name} onChangeText={v => updateForm('contact_name', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Phone">
              <TextInput style={styles.input} placeholder="+91 98765 43210" keyboardType="phone-pad"
                value={form.contact_phone} onChangeText={v => updateForm('contact_phone', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Email">
              <TextInput style={styles.input} placeholder="email@example.com" keyboardType="email-address"
                value={form.contact_email} onChangeText={v => updateForm('contact_email', v)} placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
            </Field>
          </>
        );
      case 'location':
        return (
          <>
            <Field label="Latitude" required>
              <TextInput style={styles.input} placeholder="28.6139" keyboardType="decimal-pad"
                value={form.location_lat} onChangeText={v => updateForm('location_lat', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Longitude" required>
              <TextInput style={styles.input} placeholder="77.2090" keyboardType="decimal-pad"
                value={form.location_lng} onChangeText={v => updateForm('location_lng', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
          </>
        );
      case 'upi':
        return (
          <>
            <Field label="UPI VPA / ID" required>
              <TextInput style={styles.input} placeholder="name@upi"
                value={form.upi_vpa} onChangeText={v => updateForm('upi_vpa', v)} placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
            </Field>
            <Field label="Payee Name">
              <TextInput style={styles.input} placeholder="John Doe"
                value={form.upi_name} onChangeText={v => updateForm('upi_name', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Amount (optional)">
              <TextInput style={styles.input} placeholder="100" keyboardType="decimal-pad"
                value={form.upi_amount} onChangeText={v => updateForm('upi_amount', v)} placeholderTextColor={Colors.textMuted} />
            </Field>
          </>
        );
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Generate QR Code</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Type Selection */}
          <Text style={styles.sectionLabel}>Select QR Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScrollOuter}
            contentContainerStyle={styles.typeScrollContent}>
            {QR_TYPES.map(type => {
              const isSelected = selectedType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeChip, isSelected && { backgroundColor: type.color, borderColor: type.color }]}
                  onPress={() => { setSelectedType(type.id as QRTypeId); setForm(defaultForm); }}
                >
                  <MaterialIcons name={type.icon as any} size={16} color={isSelected ? Colors.white : type.color} />
                  <Text style={[styles.typeChipText, isSelected && { color: Colors.white }]}>{type.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Form */}
          <View style={styles.formCard}>
            {renderForm()}
          </View>

          {/* Generate Button */}
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.85}>
            <MaterialIcons name="qr-code" size={22} color={Colors.white} />
            <Text style={styles.generateBtnText}>Generate QR Code</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={fieldStyles.label}>
        {label}{required && <Text style={{ color: Colors.error }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10, marginTop: 4 },
  typeScrollOuter: { marginBottom: 20 },
  typeScrollContent: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  typeChipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    color: Colors.text,
  },
  textarea: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  segRow: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  segBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segTextActive: { color: Colors.white },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    height: 54,
    ...Shadow.md,
  },
  generateBtnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});
