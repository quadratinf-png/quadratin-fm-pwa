// ── Supabase ──────────────────────────────────────────
const SUPABASE_URL = 'https://ohbxjwhflndsrjndtlnu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYnhqd2hmbG5kc3JqbmR0bG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTgzNjYsImV4cCI6MjA5ODA3NDM2Nn0.eFy_03oUjIBzfs0whFDMHGbaKlGZHnxsw8zJJMhPDoM';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── DOM Elements ──────────────────────────────────────
const audio     = document.getElementById('radio-audio');
const btnPlay   = document.getElementById('btn-play');
const statusText = document.getElementById('status-text');
const visualizerContainer = document.getElementById('visualizer');
const btnFavorite = document.getElementById('btn-favorite');
const btnShare  = document.getElementById('btn-share');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-message');
const btnSend   = document.getElementById('btn-send');
const profileNicknameInput = document.getElementById('profile-nickname');
const btnSaveProfile = document.getElementById('btn-save-profile');
const navItems  = document.querySelectorAll('.nav-item');
const views     = document.querySelectorAll('.view');

let isPlaying = false;
let currentNickname = localStorage.getItem('nickname') || '';
let lastOptimisticContent = '';
const STREAM_URL = 'https://stream.zeno.fm/tinswh8fii0tv';

// ── Visualizer (Pure CSS driven) ──────────────────────
(function initVisualizer() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 12; i++) {
        const bar = document.createElement('div');
        bar.className = 'vis-bar';
        fragment.appendChild(bar);
    }
    visualizerContainer.appendChild(fragment);
})();

function startVisualizer() { visualizerContainer.classList.add('is-playing'); }
function stopVisualizer()  { visualizerContainer.classList.remove('is-playing'); }

// ── Audio Controls ────────────────────────────────────
function playRadio() {
    audio.src = STREAM_URL;
    audio.play().then(() => {
        btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
        statusText.textContent = 'Sonando Ahora';
        statusText.style.color = 'var(--accent-orange)';
        startVisualizer();
        isPlaying = true;
        setupMediaSession();
    }).catch(() => {
        statusText.textContent = 'Error al conectar';
    });
}

function pauseRadio() {
    audio.pause();
    audio.src = '';
    btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    statusText.textContent = 'En vivo';
    statusText.style.color = 'var(--text-secondary)';
    stopVisualizer();
    isPlaying = false;
}

btnPlay.addEventListener('click', () => isPlaying ? pauseRadio() : playRadio());

// ── MediaSession (Lock Screen) ────────────────────────
function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Quadratin FM',
        artist: 'En Vivo',
        album: 'Radio Streaming',
        artwork: [
            { src: 'logo_lockscreen.png', sizes: '96x96',   type: 'image/png' },
            { src: 'logo_lockscreen.png', sizes: '192x192', type: 'image/png' },
            { src: 'logo_lockscreen.png', sizes: '512x512', type: 'image/png' }
        ]
    });
    navigator.mediaSession.setActionHandler('play',  playRadio);
    navigator.mediaSession.setActionHandler('pause', pauseRadio);
}

// ── Favorite Button ───────────────────────────────────
btnFavorite.addEventListener('click', async () => {
    btnFavorite.classList.toggle('active');
    if (btnFavorite.classList.contains('active')) {
        btnFavorite.innerHTML = '<i class="fa-solid fa-heart"></i>';
        const nickname = currentNickname || 'Un oyente';
        const loveMessage = '¡Me encanta Quadratin FM! ❤️';
        renderMessage({ nickname, content: loveMessage, created_at: new Date().toISOString() });
        scrollToBottom();
        lastOptimisticContent = loveMessage;
        await supabaseClient.from('messages').insert([{ nickname, content: loveMessage }]);
    } else {
        btnFavorite.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }
});

// ── Share Button ──────────────────────────────────────
btnShare.addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({ title: 'Quadratin FM', text: '¡Escucha Quadratin FM en vivo!', url: location.href });
    } else {
        alert('Copia este enlace para compartir: ' + location.href);
    }
});

// ── Tab Navigation ────────────────────────────────────
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(n => n.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        const target = item.getAttribute('data-target');
        document.getElementById(target).classList.add('active');
        if (target === 'view-chat') {
            requestAnimationFrame(scrollToBottom);
        }
    });
});

// ── Profile ───────────────────────────────────────────
if (currentNickname && profileNicknameInput) {
    profileNicknameInput.value = currentNickname;
}

if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', () => {
        const name = profileNicknameInput.value.trim();
        if (!name) return;
        currentNickname = name;
        localStorage.setItem('nickname', currentNickname);
        btnSaveProfile.textContent = '¡Guardado!';
        btnSaveProfile.style.background = '#28a745';
        setTimeout(() => {
            btnSaveProfile.textContent = 'Guardar Perfil';
            btnSaveProfile.style.background = '';
            document.querySelector('[data-target="view-chat"]').click();
        }, 800);
    });
}

// ── Chat Helpers ──────────────────────────────────────
function formatTime(iso) {
    const d = new Date(iso);
    let h = d.getHours(), m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m < 10 ? '0' + m : m} ${ap}`;
}

function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = `
        <div class="msg-header">
            <span class="msg-name">${msg.nickname}</span>
            <span class="msg-time">${formatTime(msg.created_at)}</span>
        </div>
        <div class="msg-content">${msg.content}</div>
    `;
    chatMessages.appendChild(div);
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── Load Messages ─────────────────────────────────────
async function loadMessages() {
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    if (!error && data) {
        const fragment = document.createDocumentFragment();
        data.reverse().forEach(msg => {
            const div = document.createElement('div');
            div.className = 'chat-message';
            div.innerHTML = `
                <div class="msg-header">
                    <span class="msg-name">${msg.nickname}</span>
                    <span class="msg-time">${formatTime(msg.created_at)}</span>
                </div>
                <div class="msg-content">${msg.content}</div>
            `;
            fragment.appendChild(div);
        });
        chatMessages.appendChild(fragment);
        scrollToBottom();
    }
}

// ── Send Message ──────────────────────────────────────
async function sendMessage() {
    const content = chatInput.value.trim();
    if (!content) return;
    const nickname = currentNickname || 'Oyente';
    chatInput.value = '';
    renderMessage({ nickname, content, created_at: new Date().toISOString() });
    scrollToBottom();
    lastOptimisticContent = content;
    await supabaseClient.from('messages').insert([{ nickname, content }]);
}

btnSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// ── Realtime Subscription ─────────────────────────────
supabaseClient
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new;
        if (msg.nickname === (currentNickname || 'Oyente') && msg.content === lastOptimisticContent) {
            lastOptimisticContent = '';
            return;
        }
        renderMessage(msg);
        scrollToBottom();
    })
    .subscribe();

// ── Init ──────────────────────────────────────────────
loadMessages();
