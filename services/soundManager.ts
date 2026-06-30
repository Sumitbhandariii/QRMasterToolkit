/**
 * soundManager.ts
 * Generates PCM WAV beep tones in-memory and plays them via expo-av.
 * No external sound files required — tones are synthesised at runtime.
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// ─── WAV generator ─────────────────────────────────────────────────────────────

/**
 * Writes a 4-byte little-endian uint32 into a DataView.
 */
function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

/**
 * Writes a 2-byte little-endian uint16 into a DataView.
 */
function writeUint16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

/**
 * Generates an in-memory PCM WAV buffer containing a sine-wave tone.
 * Returns a Base-64 string of the WAV data.
 *
 * @param frequency  Tone frequency in Hz
 * @param durationMs Duration in milliseconds
 * @param amplitude  0–1 peak amplitude (default 0.65 to avoid clipping)
 * @param sampleRate Samples per second (default 22 050)
 */
function generateWavBase64(
  frequency: number,
  durationMs: number,
  amplitude = 0.65,
  sampleRate = 22_050
): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataBytes = numSamples * 2; // 16-bit mono
  const totalBytes = 44 + dataBytes;

  const buffer = new ArrayBuffer(totalBytes);
  const view = new DataView(buffer);

  // ── RIFF chunk ──────────────────────────────────────────────────────────────
  // ChunkID   "RIFF"
  view.setUint8(0, 0x52); view.setUint8(1, 0x49);
  view.setUint8(2, 0x46); view.setUint8(3, 0x46);
  // ChunkSize = totalBytes - 8
  writeUint32LE(view, 4, totalBytes - 8);
  // Format    "WAVE"
  view.setUint8(8, 0x57); view.setUint8(9, 0x41);
  view.setUint8(10, 0x56); view.setUint8(11, 0x45);

  // ── fmt sub-chunk ────────────────────────────────────────────────────────────
  // Subchunk1ID  "fmt "
  view.setUint8(12, 0x66); view.setUint8(13, 0x6D);
  view.setUint8(14, 0x74); view.setUint8(15, 0x20);
  writeUint32LE(view, 16, 16);          // Subchunk1Size (PCM = 16)
  writeUint16LE(view, 20, 1);           // AudioFormat   (PCM = 1)
  writeUint16LE(view, 22, 1);           // NumChannels   (mono)
  writeUint32LE(view, 24, sampleRate);  // SampleRate
  writeUint32LE(view, 28, sampleRate * 2); // ByteRate = SampleRate * NumChannels * BitsPerSample/8
  writeUint16LE(view, 32, 2);           // BlockAlign = NumChannels * BitsPerSample/8
  writeUint16LE(view, 34, 16);          // BitsPerSample

  // ── data sub-chunk ───────────────────────────────────────────────────────────
  // Subchunk2ID  "data"
  view.setUint8(36, 0x64); view.setUint8(37, 0x61);
  view.setUint8(38, 0x74); view.setUint8(39, 0x61);
  writeUint32LE(view, 40, dataBytes);   // Subchunk2Size

  // Sine-wave samples with a 5ms linear fade-out to avoid pops
  const fadeOutSamples = Math.floor((sampleRate * 5) / 1000);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = amplitude;
    if (i > numSamples - fadeOutSamples) {
      env = amplitude * ((numSamples - i) / fadeOutSamples);
    }
    const sample = Math.sin(2 * Math.PI * frequency * t) * env;
    const pcm = Math.round(sample * 32_767);
    view.setInt16(44 + i * 2, pcm, true);
  }

  // Convert ArrayBuffer → Base-64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8_192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ─── SoundManager class ────────────────────────────────────────────────────────

type SoundKey = 'qr' | 'barcode' | 'wifi';

interface SoundDef {
  frequency: number;
  durationMs: number;
  /** For barcode we emit two pulses; this is the second pulse frequency. */
  frequency2?: number;
}

const SOUND_DEFS: Record<SoundKey, SoundDef> = {
  qr: { frequency: 880, durationMs: 90 },
  barcode: { frequency: 660, durationMs: 70, frequency2: 660 },
  wifi: { frequency: 440, durationMs: 120 },
};

class SoundManagerClass {
  private sounds: Partial<Record<SoundKey, string>> = {}; // file URIs
  private initialized = false;

  async init() {
    if (this.initialized || Platform.OS === 'web') return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      for (const key of ['qr', 'barcode', 'wifi'] as SoundKey[]) {
        const def = SOUND_DEFS[key];
        const b64 = generateWavBase64(def.frequency, def.durationMs);
        const uri = FileSystem.cacheDirectory + `beep_${key}.wav`;
        await FileSystem.writeAsStringAsync(uri, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        this.sounds[key] = uri;
      }

      // WiFi: two-tone success chime (440 + 880 Hz, sequential)
      const wifiChimeB64 = generateWavBase64(660, 60);
      const wifiUri = FileSystem.cacheDirectory + `beep_wifi.wav`;
      await FileSystem.writeAsStringAsync(wifiUri, wifiChimeB64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      this.sounds['wifi'] = wifiUri;

      this.initialized = true;
    } catch {
      // Graceful: app works fine without sound
    }
  }

  async play(key: SoundKey) {
    if (Platform.OS === 'web') return;
    if (!this.initialized) await this.init();
    const uri = this.sounds[key];
    if (!uri) return;

    try {
      if (key === 'barcode') {
        // Double pulse separated by a short gap
        const { sound: s1 } = await Audio.Sound.createAsync({ uri });
        await s1.playAsync();
        await s1.setOnPlaybackStatusUpdate(async status => {
          if ('didJustFinish' in status && status.didJustFinish) {
            await s1.unloadAsync();
            await new Promise(r => setTimeout(r, 80));
            const { sound: s2 } = await Audio.Sound.createAsync({ uri });
            await s2.playAsync();
            s2.setOnPlaybackStatusUpdate(async st => {
              if ('didJustFinish' in st && st.didJustFinish) await s2.unloadAsync();
            });
          }
        });
      } else if (key === 'wifi') {
        // Two ascending tones: 440 → 880
        const uri440 = FileSystem.cacheDirectory + `beep_wifi_low.wav`;
        const uri880 = FileSystem.cacheDirectory + `beep_wifi_high.wav`;
        const b64low = generateWavBase64(440, 100);
        const b64high = generateWavBase64(880, 120);
        await FileSystem.writeAsStringAsync(uri440, b64low, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.writeAsStringAsync(uri880, b64high, { encoding: FileSystem.EncodingType.Base64 });

        const { sound: s1 } = await Audio.Sound.createAsync({ uri: uri440 });
        await s1.playAsync();
        s1.setOnPlaybackStatusUpdate(async status => {
          if ('didJustFinish' in status && status.didJustFinish) {
            await s1.unloadAsync();
            const { sound: s2 } = await Audio.Sound.createAsync({ uri: uri880 });
            await s2.playAsync();
            s2.setOnPlaybackStatusUpdate(async st => {
              if ('didJustFinish' in st && st.didJustFinish) await s2.unloadAsync();
            });
          }
        });
      } else {
        // QR: single sharp beep
        const { sound } = await Audio.Sound.createAsync({ uri });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate(async status => {
          if ('didJustFinish' in status && status.didJustFinish) await sound.unloadAsync();
        });
      }
    } catch {
      // Ignore playback errors silently
    }
  }
}

export const SoundManager = new SoundManagerClass();
