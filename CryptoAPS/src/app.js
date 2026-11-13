import { encryptMessage, decryptMessage, ensureCryptoAvailable } from './crypto.js';
import { validateMessage, validateKey } from './validation.js';

const $ = selector => document.querySelector(selector);
const message = $('#message'), encryptKey = $('#encrypt-key'), ciphertext = $('#ciphertext'), decryptKey = $('#decrypt-key');
const history = [];
let demoTimer;
const chars = value => Array.from(value).length;
function setStatus(selector, text, type = '') { const el = $(selector); el.textContent = text; el.className = `status ${type}`.trim(); }
function record(kind, text, status) { history.unshift({ kind, text, status, time: new Date() }); history.splice(8); renderHistory(); }
function renderHistory() {
  const list = $('#history-list');
  $('#clear-history').disabled = history.length === 0;
  if (!history.length) { list.innerHTML = '<div class="empty-history"><span>◷</span><p>As operações realizadas aparecerão aqui.</p></div>'; return; }
  list.replaceChildren(...history.map(item => {
    const row = document.createElement('div'); row.className = 'history-item';
    const preview = document.createElement('div'); preview.className = 'history-preview'; preview.textContent = item.text;
    const kind = document.createElement('div'); kind.className = 'history-kind'; kind.textContent = item.kind;
    const time = document.createElement('div'); time.className = 'history-meta'; time.textContent = item.time.toLocaleString('pt-BR');
    const status = document.createElement('div'); status.className = 'history-status'; status.textContent = item.status;
    row.append(preview, kind, time, status); return row;
  }));
}

$('#message').addEventListener('input', () => {
  const codepoints = Array.from(message.value);
  if (codepoints.length > 128) message.value = codepoints.slice(0, 128).join('');
  $('#char-count').textContent = `${chars(message.value)} / 128`;
  $('#message-error').textContent = '';
});

$('#encrypt-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#encrypt-result-wrap').hidden = true;
  const error = validateMessage(message.value) || validateKey(encryptKey.value);
  if (error) { setStatus('#encrypt-status', error, 'error'); $('#message-error').textContent = validateMessage(message.value); return; }
  const button = event.submitter; button.disabled = true; button.firstElementChild.textContent = 'Derivando chave…'; setStatus('#encrypt-status', 'Gerando salt e IV e derivando a chave com PBKDF2…');
  try {
    const result = await encryptMessage(message.value, encryptKey.value);
    $('#encrypted-output').value = result; $('#encrypt-result-wrap').hidden = false; setStatus('#encrypt-status', 'Mensagem criptografada com sucesso. Guarde o pacote e a chave em local seguro.', 'success'); record('CRIPTOGRAFIA', message.value, 'Concluída');
  } catch (error) { setStatus('#encrypt-status', error.message || 'Falha ao criptografar. Verifique o navegador e tente novamente.', 'error'); record('CRIPTOGRAFIA', message.value, 'Falhou'); }
  finally { button.disabled = false; button.firstElementChild.textContent = 'Criptografar mensagem'; }
});

$('#decrypt-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#decrypt-result-wrap').hidden = true;
  const error = !ciphertext.value.trim() ? 'Cole o conteúdo criptografado.' : validateKey(decryptKey.value);
  if (error) { setStatus('#decrypt-status', error, 'error'); return; }
  const button = event.submitter; button.disabled = true; button.firstElementChild.textContent = 'Validando…'; setStatus('#decrypt-status', 'Derivando a chave e validando autenticidade…');
  try {
    const plain = await decryptMessage(ciphertext.value.trim(), decryptKey.value);
    $('#decrypted-output').value = plain; $('#decrypt-result-wrap').hidden = false; setStatus('#decrypt-status', 'Mensagem autenticada e recuperada com sucesso.', 'success'); record('DESCRIPTOGRAFIA', plain, 'Concluída');
  } catch (error) { setStatus('#decrypt-status', error.message, 'error'); record('DESCRIPTOGRAFIA', '[conteúdo não recuperado]', 'Falhou'); }
  finally { button.disabled = false; button.firstElementChild.textContent = 'Descriptografar'; }
});

function clearForm(kind) {
  if (kind === 'encrypt') { message.value = ''; encryptKey.value = ''; $('#char-count').textContent = '0 / 128'; $('#message-error').textContent = ''; $('#encrypt-result-wrap').hidden = true; setStatus('#encrypt-status', ''); }
  else { ciphertext.value = ''; decryptKey.value = ''; $('#decrypt-result-wrap').hidden = true; setStatus('#decrypt-status', ''); }
}
$('#clear-encrypt').addEventListener('click', () => clearForm('encrypt'));
$('#clear-decrypt').addEventListener('click', () => clearForm('decrypt'));
$('#clear-history').addEventListener('click', () => { history.length = 0; renderHistory(); });

document.querySelectorAll('.toggle-visibility').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.target); const show = input.type === 'password'; input.type = show ? 'text' : 'password'; button.setAttribute('aria-label', show ? 'Ocultar chave' : 'Mostrar chave');
}));
$('#generate-key').addEventListener('click', () => {
  ensureCryptoAvailable(); const bytes = crypto.getRandomValues(new Uint8Array(24)); const key = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' })[c]); encryptKey.value = key; encryptKey.type = 'text'; $('.toggle-visibility[data-target="encrypt-key"]').setAttribute('aria-label', 'Ocultar chave'); setStatus('#encrypt-status', 'Chave aleatória gerada. Anote-a antes de limpar a tela.', 'success');
});
document.querySelectorAll('.copy-button').forEach(button => button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).value); const prior = button.textContent; button.textContent = '✓ Copiado'; setTimeout(() => { button.textContent = prior; }, 1400); }
  catch { setStatus(button.dataset.copy === 'encrypted-output' ? '#encrypt-status' : '#decrypt-status', 'Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.', 'error'); }
}));

const demoMessage = 'Segurança começa com uma boa chave.';
$('#run-demo').addEventListener('click', async event => {
  clearTimeout(demoTimer); const button = event.currentTarget; button.disabled = true; button.innerHTML = '<span>◌</span> Demonstrando…';
  document.querySelectorAll('.pipeline-step').forEach(step => step.classList.remove('active', 'done'));
  document.querySelectorAll('.pipeline-connector').forEach(line => line.classList.remove('filled'));
  $('#demo-message').classList.add('running'); let index = 0;
  let packet = '', demoKey = '';
  const advance = async () => {
    if (index > 0) { document.querySelector(`.pipeline-step[data-step="${index - 1}"]`).classList.remove('active'); document.querySelector(`.pipeline-step[data-step="${index - 1}"]`).classList.add('done'); document.querySelectorAll('.pipeline-connector')[index - 1].classList.add('filled'); }
    document.querySelector(`.pipeline-step[data-step="${index}"]`).classList.add('active');
    const step = index++;
    const descriptions = [
      `Mensagem de demonstração: “${demoMessage}”`,
      'Chave de demonstração gerada com CSPRNG. PBKDF2 deriva uma chave de 256 bits com salt aleatório.',
      'Executando AES-256-GCM no navegador e gerando pacote autenticado…',
      '',
      'Derivando a chave de novo e verificando a tag de autenticação…',
      ''
    ];
    $('#demo-message-text').textContent = descriptions[step];
    if (step === 2) { const demoKey = toBase64(crypto.getRandomValues(new Uint8Array(24))); packet = await encryptMessage(demoMessage, demoKey); }
    if (step === 3) descriptions[step] = `Criptografia real concluída. Pacote Base64: ${packet.slice(0, 48)}…`;
    if (step === 4) {
      const recovered = await decryptMessage(packet, demoKey);
      descriptions[step] = `Tag GCM válida. Mensagem recuperada: “${recovered}”`;
    }
    if (step === 1) demoKey = toBase64(crypto.getRandomValues(new Uint8Array(24)));
    if (step === 5) descriptions[step] = `Concluído: “${demoMessage}” foi recuperada e autenticada.`;
    $('#demo-message-text').textContent = descriptions[step];
    if (step < 5) demoTimer = setTimeout(advance, 950);
    else demoTimer = setTimeout(() => { document.querySelector('.pipeline-step[data-step="5"]').classList.replace('active', 'done'); $('#demo-message').classList.remove('running'); button.disabled = false; button.innerHTML = '<span>▶</span> Repetir demonstração'; demoKey = ''; packet = ''; }, 950);
  }; advance().catch(error => { $('#demo-message-text').textContent = error.message; $('#demo-message').classList.remove('running'); button.disabled = false; button.innerHTML = '<span>▶</span> Tentar novamente'; demoKey = ''; packet = ''; });
});

try { ensureCryptoAvailable(); }
catch (error) { setStatus('#encrypt-status', error.message, 'error'); setStatus('#decrypt-status', error.message, 'error'); }
