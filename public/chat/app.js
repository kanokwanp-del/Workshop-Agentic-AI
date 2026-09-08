const messagesEl = document.querySelector('#messages');
const emptyEl = document.querySelector('#empty');
const form = document.querySelector('#form');
const input = document.querySelector('#input');
const provider = document.querySelector('#provider');
const model = document.querySelector('#model');
const button = form.querySelector('button');
const history = [];

function addBubble(role, content) {
  emptyEl?.remove();
  const element = document.createElement('div');
  element.className = `bubble ${role}`;
  element.textContent = content;
  messagesEl.appendChild(element);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  input.disabled = isLoading;
  provider.disabled = isLoading;
  model.disabled = isLoading;
  button.innerHTML = isLoading ? 'กำลังคิด…' : 'ส่งข้อความ <span aria-hidden="true">→</span>';
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

input.addEventListener('input', resizeInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || button.disabled) return;

  addBubble('user', message);
  history.push({ role: 'user', content: message });
  input.value = '';
  resizeInput();
  setLoading(true);

  const typing = document.createElement('div');
  typing.className = 'bubble assistant typing';
  typing.textContent = 'กำลังเตรียมคำตอบ…';
  messagesEl.appendChild(typing);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, history: history.slice(0, -1), provider: provider.value, model: model.value }),
    });
    const data = await response.json();
    typing.remove();
    const reply = data.reply || data.error || 'ไม่พบคำตอบ';
    addBubble('assistant', reply);
    history.push({ role: 'assistant', content: reply });
  } catch (error) {
    typing.remove();
    addBubble('assistant', `เชื่อมต่อไม่สำเร็จ: ${error.message}`);
  } finally {
    setLoading(false);
    input.focus();
  }
});