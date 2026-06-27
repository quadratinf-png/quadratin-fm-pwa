const SUPABASE_URL = 'https://ohbxjwhflndsrjndtlnu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYnhqd2hmbG5kc3JqbmR0bG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTgzNjYsImV4cCI6MjA5ODA3NDM2Nn0.eFy_03oUjIBzfs0whFDMHGbaKlGZHnxsw8zJJMhPDoM';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Variables Globales ────────────────────────────────
const audio = document.getElementById('radio-audio');
const btnPlay = document.getElementById('btn-play');
const statusText = document.getElementById('status-text');
const visualizerContainer = document.getElementById('visualizer');
const btnFavorite = document.getElementById('btn-favorite');
const btnShare = document.getElementById('btn-share');
const logo = document.getElementById('main-logo');

let isPlaying = false;
const NUM_BARS = 12;

// ── Inicializar Visualizador (Falso) ──────────────────
function initVisualizer() {
    visualizerContainer.innerHTML = '';
    for (let i = 0; i < NUM_BARS; i++) {
        const bar = document.createElement('div');
        bar.className = 'vis-bar';
        bar.style.height = '10px';
        visualizerContainer.appendChild(bar);
    }
}
initVisualizer();

function startVisualizer() {
    visualizerContainer.classList.add('is-playing');
}

function stopVisualizer() {
    visualizerContainer.classList.remove('is-playing');
}

// ── Control de Audio ──────────────────────────────────
btnPlay.addEventListener('click', () => {
    if (isPlaying) {
        audio.pause();
        // Zeno FM requires resetting src to stop buffering in background
        audio.src = '';
        btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
        statusText.textContent = 'En vivo';
        statusText.style.color = 'var(--text-secondary)';
        stopVisualizer();
        isPlaying = false;
    } else {
        audio.src = 'https://stream.zeno.fm/tinswh8fii0tv';
        audio.play().then(() => {
            btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
            statusText.textContent = 'Sonando Ahora';
            statusText.style.color = 'var(--accent-orange)';
            startVisualizer();
            isPlaying = true;
        }).catch(err => {
            console.error("Error al reproducir:", err);
            statusText.textContent = 'Error al conectar';
        });
    }
});

// ── Botones Extra ─────────────────────────────────────
btnFavorite.addEventListener('click', () => {
    btnFavorite.classList.toggle('active');
    if (btnFavorite.classList.contains('active')) {
        btnFavorite.innerHTML = '<i class="fa-solid fa-heart"></i>';
    } else {
        btnFavorite.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }
});

btnShare.addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: 'Quadratin FM',
            text: '¡Escucha Quadratin FM en vivo!',
            url: window.location.href,
        });
    } else {
        alert('Copia este enlace para compartir: ' + window.location.href);
    }
});

// ── Navegación Tabs ───────────────────────────────────
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all navs and views
        navItems.forEach(nav => nav.classList.remove('active'));
        views.forEach(view => view.classList.remove('active'));
        
        // Add active class to clicked
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        
        // Si entramos al chat, hacer scroll abajo
        if (targetId === 'view-chat') {
            scrollToBottom();
        }
    });
});

// ── Chat y Perfil (Supabase) ──────────────────────────
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-message');
const btnSend = document.getElementById('btn-send');

const profileNicknameInput = document.getElementById('profile-nickname');
const btnSaveProfile = document.getElementById('btn-save-profile');

// Cargar nickname guardado
let currentNickname = localStorage.getItem('nickname') || '';
if (currentNickname && profileNicknameInput) {
    profileNicknameInput.value = currentNickname;
}

if (btnSaveProfile && profileNicknameInput) {
    btnSaveProfile.addEventListener('click', () => {
        const newName = profileNicknameInput.value.trim();
        if (newName) {
            currentNickname = newName;
            localStorage.setItem('nickname', currentNickname);
            
            // Show success visual feedback
            btnSaveProfile.textContent = '¡Guardado!';
            btnSaveProfile.style.background = '#28a745';
            setTimeout(() => {
                btnSaveProfile.textContent = 'Guardar Perfil';
                btnSaveProfile.style.background = 'var(--accent-orange)';
                
                // Auto switch to chat tab
                document.querySelector('[data-target="view-chat"]').click();
            }, 1000);
        }
    });
}

function formatTime(isoString) {
    const date = new Date(isoString);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

function renderMessage(msg) {
    const isSelf = msg.nickname === (currentNickname || 'Oyente');
    
    const div = document.createElement('div');
    div.className = `chat-message ${isSelf ? 'self' : ''}`;
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

// Cargar historial
async function loadMessages() {
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
    if (!error && data) {
        // Invertimos porque vienen de mas nuevo a mas viejo
        data.reverse().forEach(renderMessage);
        scrollToBottom();
    }
}

// Enviar Mensaje
async function sendMessage() {
    const content = chatInput.value.trim();
    const nickname = currentNickname || 'Oyente';
    
    if (!content) return;
    
    chatInput.value = '';
    
    // Optimistic: show message instantly
    const optimisticMsg = {
        nickname: nickname,
        content: content,
        created_at: new Date().toISOString(),
        _optimistic: true
    };
    renderMessage(optimisticMsg);
    scrollToBottom();
    lastOptimisticContent = content;
    
    const { error } = await supabaseClient
        .from('messages')
        .insert([{ nickname: nickname, content: content }]);
        
    if (error) {
        console.error('Error enviando mensaje', error);
    }
}

btnSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Track last optimistic message to avoid duplicates
let lastOptimisticContent = '';

// Suscripción Realtime
const channel = supabaseClient
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        // Skip if this is our own optimistic message
        const msg = payload.new;
        if (msg.nickname === (currentNickname || 'Oyente') && msg.content === lastOptimisticContent) {
            lastOptimisticContent = '';
            return;
        }
        renderMessage(msg);
        scrollToBottom();
    })
    .subscribe();

// Iniciar
loadMessages();
