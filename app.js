// ── Configuración de Supabase ─────────────────────────
const SUPABASE_URL = 'https://ohbxjwhflndsrjndtlnu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYnhqd2hmbG5kc3JqbmR0bG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTgzNjYsImV4cCI6MjA5ODA3NDM2Nn0.eFy_03oUjIBzfs0whFDMHGbaKlGZHnxsw8zJJMhPDoM';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Variables Globales ────────────────────────────────
const audio = document.getElementById('radio-audio');
const btnPlay = document.getElementById('btn-play');
const statusText = document.getElementById('status-text');
const visualizerContainer = document.getElementById('visualizer');
const btnFavorite = document.getElementById('btn-favorite');
const btnShare = document.getElementById('btn-share');
const logo = document.getElementById('main-logo');

let isPlaying = false;
let visualizerInterval = null;
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
    if (visualizerInterval) return;
    const bars = document.querySelectorAll('.vis-bar');
    visualizerInterval = setInterval(() => {
        bars.forEach(bar => {
            // Random height between 10px and 50px
            const height = Math.floor(Math.random() * 40) + 10;
            bar.style.height = `${height}px`;
        });
        
        // Pulse logo slightly
        logo.style.transform = `scale(${1 + Math.random() * 0.05})`;
    }, 150);
}

function stopVisualizer() {
    clearInterval(visualizerInterval);
    visualizerInterval = null;
    const bars = document.querySelectorAll('.vis-bar');
    bars.forEach(bar => {
        bar.style.height = '10px';
    });
    logo.style.transform = 'scale(1)';
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

// ── Chat Realtime (Supabase) ──────────────────────────
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-message');
const nicknameInput = document.getElementById('chat-nickname');
const btnSend = document.getElementById('btn-send');

// Cargar nickname guardado
const savedName = localStorage.getItem('nickname');
if (savedName) nicknameInput.value = savedName;

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
    const currentName = nicknameInput.value.trim() || 'Oyente';
    const isSelf = msg.nickname === currentName;
    
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
    const { data, error } = await supabase
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
    const nickname = nicknameInput.value.trim() || 'Oyente';
    
    if (!content) return;
    
    // Guardar nickname localmente
    localStorage.setItem('nickname', nickname);
    
    chatInput.value = '';
    
    const { error } = await supabase
        .from('messages')
        .insert([{ nickname: nickname, content: content }]);
        
    if (error) {
        console.error('Error enviando mensaje', error);
        alert('Error al enviar el mensaje');
    }
}

btnSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Suscripción Realtime
const channel = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        renderMessage(payload.new);
        scrollToBottom();
    })
    .subscribe();

// Iniciar
loadMessages();
