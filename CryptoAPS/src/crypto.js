const PREFIX = 'CAPS1:';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 310_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function fromBase64(value) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('invalid');
  const binary = atob(value);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export function ensureCryptoAvailable() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw new Error('Abra o CryptoAPS em um navegador moderno usando HTTPS, localhost ou file:// para ativar a Web Crypto API.');
}

export async function encryptMessage(message, passphrase) {
  ensureCryptoAvailable();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, encoder.encode(message));
  const envelope = { v: 1, kdf: 'PBKDF2-SHA-256', iterations: ITERATIONS, cipher: 'AES-256-GCM', salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) };
  return PREFIX + toBase64(encoder.encode(JSON.stringify(envelope)));
}

export async function decryptMessage(serialized, passphrase) {
  ensureCryptoAvailable();
  try {
    if (typeof serialized !== 'string' || !serialized.startsWith(PREFIX) || serialized.length > 100_000) throw new Error('invalid');
    const envelope = JSON.parse(decoder.decode(fromBase64(serialized.slice(PREFIX.length))));
    if (!envelope || envelope.v !== 1 || envelope.kdf !== 'PBKDF2-SHA-256' || envelope.cipher !== 'AES-256-GCM' || envelope.iterations !== ITERATIONS) throw new Error('invalid');
    const salt = fromBase64(envelope.salt), iv = fromBase64(envelope.iv), data = fromBase64(envelope.data);
    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || data.length < 16 || data.length > 16_384) throw new Error('invalid');
    const key = await deriveKey(passphrase, salt);
    const plaintext = decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, data));
    if (Array.from(plaintext).length > 128) throw new Error('invalid');
    return plaintext;
  } catch {
    throw new Error('Não foi possível descriptografar. Confira a chave e verifique se o conteúdo está completo e sem alterações.');
  }
}

export const ENVELOPE_PREFIX = PREFIX;
