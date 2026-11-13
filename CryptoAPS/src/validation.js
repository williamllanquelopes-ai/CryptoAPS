export function validateMessage(value) {
  if (!value.trim()) return 'Digite uma mensagem antes de criptografar.';
  if (Array.from(value).length > 128) return 'A mensagem pode ter no máximo 128 caracteres.';
  return '';
}

export function validateKey(value) {
  if (!value.trim()) return 'Informe uma chave de criptografia.';
  if (value.length > 1024) return 'A chave é muito longa.';
  return '';
}
