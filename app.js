// --- STATE MANAGEMENT ---
let state = {
    username: localStorage.getItem('todo-username') || 'User',
    theme: localStorage.getItem('todo-theme') || 'light',
    tasks: JSON.parse(localStorage.getItem('todo-tasks')) || [],
    links: JSON.parse(localStorage.getItem('todo-links')) || [
        
    ]
};

// --- DOM ELEMENTS ---
const usernameEl = document.getElementById('username');
const greetingEl = document.getElementById('greeting');
const dateTimeDisplayEl = document.getElementById('date-time-display');
const themeToggleEl = document.getElementById('theme-toggle');
const timerDisplay = document.getElementById('timer-display');
const timerStartBtn = document.getElementById('timer-start');
const timerStopBtn = document.getElementById('timer-stop');
const timerResetBtn = document.getElementById('timer-reset');
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const todoSort = document.getElementById('todo-sort');
const todoError = document.getElementById('todo-error');
const linkForm = document.getElementById('link-form');
const linkNameInput = document.getElementById('link-name');
const linkUrlInput = document.getElementById('link-url');
const linksContainer = document.getElementById('links-container');

// --- TIMER VARIABLES ---
let timerInterval = null;
let defaultDuration = 25 * 60; // 25 Menit dalam detik bawaan
let timeLeft = defaultDuration;

// --- INITIALIZATION ---
function init() {
    // Ambil data nama lama dari localStorage
    let savedName = localStorage.getItem('todo-username');
    
    // Jika belum ada nama, masih bernilai 'User', atau kosong, paksa munculkan prompt nama
    if (!savedName || savedName === 'User' || savedName.trim() === '') {
        let inputName = prompt("Masukkan nama Anda:", "");
        if (inputName && inputName.trim() !== "") {
            state.username = inputName.trim();
        } else {
            state.username = 'User';
        }
        localStorage.setItem('todo-username', state.username);
    } else {
        state.username = savedName;
    }

    // Load theme
    document.documentElement.setAttribute('data-theme', state.theme);
    themeToggleEl.textContent = state.theme === 'light' ? '🌙' : '☀️';
    
    if (usernameEl) usernameEl.textContent = state.username;
    
    updateClockAndGreeting();
    setInterval(updateClockAndGreeting, 1000);
    renderLinks();
    renderTasks();
    setupEventListeners();
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    themeToggleEl.addEventListener('click', toggleTheme);
    timerStartBtn.addEventListener('click', startTimer);
    timerStopBtn.addEventListener('click', stopTimer);
    timerResetBtn.addEventListener('click', resetTimer);
    todoForm.addEventListener('submit', handleAddTodo);
    todoSort.addEventListener('change', renderTasks);
    linkForm.addEventListener('submit', handleAddLink);

    // Pilihan preset waktu Pomodoro (Change Pomodoro Time)
    document.querySelectorAll('.btn-preset').forEach(button => {
        button.addEventListener('click', (e) => {
            if (timerInterval !== null) {
                alert("Hentikan atau reset timer terlebih dahulu sebelum mengubah waktu!");
                return;
            }
            
            document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
            
            if (e.target.id === 'custom-time-btn') {
                const customMinutes = prompt("Masukkan waktu fokus yang Anda inginkan (dalam menit):", "25");
                const mins = parseInt(customMinutes);
                if (isNaN(mins) || mins <= 0 || mins > 180) {
                    alert("Masukkan angka menit yang valid (1 - 180 menit)!");
                    document.querySelector('[data-time="25"]').classList.add('active');
                    changeTimerDuration(25);
                    return;
                }
                e.target.classList.add('active');
                changeTimerDuration(mins);
            } else {
                e.target.classList.add('active');
                const minutes = parseInt(e.target.getAttribute('data-time'));
                changeTimerDuration(minutes);
            }
        });
    });
}

// --- REALTIME CLOCK & GREETING ---
// --- REALTIME CLOCK & GREETING (VERSI PERBAIKAN) ---
function updateClockAndGreeting() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    // 1. Perbarui teks waktu/jam saja setiap detik
    dateTimeDisplayEl.textContent = `${now.toLocaleDateString('id-ID', options)} | ${now.toLocaleTimeString('id-ID', { hour12: false })}`;
    
    // 2. Tentukan ucapan berdasarkan jam saat ini
    const hour = now.getHours();
    let greetingText = 'Selamat Malam';
    if (hour >= 4 && hour < 11) greetingText = 'Selamat Pagi';
    else if (hour >= 11 && hour < 15) greetingText = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greetingText = 'Selamat Sore';
    
    // 3. Ambil elemen text ucapan saja (Halo / Selamat Malam), BUKAN element namanya
    // Kita hanya memperbarui teks salamnya agar kursor ketik pada nama tidak terputus/hilang setiap detik
    const textNode = greetingEl.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = `${greetingText}, `;
    } else {
        // Fallback jika render pertama kali belum sempurna
        greetingEl.innerHTML = `${greetingText}, <span id="username" contenteditable="true" title="Klik untuk mengubah nama">${state.username}</span>`;
    }
    
    // 4. Pasang event listener untuk menyimpan nama saat selesai mengetik (blur) atau tekan Enter
    const userSpan = document.getElementById('username');
    if (userSpan) {
        // Hapus listener lama terlebih dahulu agar tidak menumpuk (double event)
        userSpan.removeEventListener('blur', saveUsername);
        userSpan.addEventListener('blur', saveUsername);
        
        userSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                e.target.blur(); 
            }
        });
    }
}

// --- CONTROLS LOGIC ---
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    themeToggleEl.textContent = state.theme === 'light' ? '🌙' : '☀️';
    localStorage.setItem('todo-theme', state.theme);
}

function saveUsername(e) {
    state.username = e.target.textContent.trim() || 'User';
    localStorage.setItem('todo-username', state.username);
}

// --- POMODORO TIMER LOGIC ---
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
}

function changeTimerDuration(minutes) {
    defaultDuration = minutes * 60;
    timeLeft = defaultDuration;
    updateTimerDisplay();
}

function startTimer() {
    if (timerInterval !== null) return;
    timerStartBtn.disabled = true;
    timerStopBtn.disabled = false;
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            alert("Waktu fokus selesai!");
            resetTimer();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerStartBtn.disabled = false;
    timerStopBtn.disabled = true;
}

function resetTimer() {
    stopTimer();
    timeLeft = defaultDuration;
    updateTimerDisplay();
}

// --- TO-DO LIST LOGIC ---
function handleAddTodo(e) {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    
    if (state.tasks.some(t => t.text.toLowerCase() === text.toLowerCase())) {
        todoError.style.display = 'block';
        setTimeout(() => todoError.style.display = 'none', 3000);
        return;
    }
    
    state.tasks.push({ id: Date.now().toString(), text, completed: false, createdAt: Date.now() });
    localStorage.setItem('todo-tasks', JSON.stringify(state.tasks));
    renderTasks();
    todoForm.reset();
}

function renderTasks() {
    todoList.innerHTML = '';
    const sortBy = todoSort.value;
    
    // 1. BUAT SALINAN DAFTAR UTAMA
    let filteredAndSorted = [...state.tasks];
    
    // 2. LOGIKA BARU: Jika pilih "Belum Selesai", kita filter/sembunyikan yang sudah dicentang
    if (sortBy === 'status') {
        filteredAndSorted = filteredAndSorted.filter(t => !t.completed);
    } 
    // Logika pengurutan lainnya tetap berjalan normal
    else if (sortBy === 'newest') {
        filteredAndSorted.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'oldest') {
        filteredAndSorted.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortBy === 'alphabetical') {
        filteredAndSorted.sort((a, b) => a.text.localeCompare(b.text));
    }

    // 3. RENDER HASILNYA KE LAYAR
    filteredAndSorted.forEach(t => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.innerHTML = `
            <div class="todo-item-left">
                <input type="checkbox" ${t.completed ? 'checked' : ''} class="todo-checkbox">
                <span class="todo-text ${t.completed ? 'completed' : ''}">${t.text}</span>
            </div>
            <div class="todo-item-actions">
                <button class="btn btn-warning edit-btn">Edit</button>
                <button class="btn btn-danger delete-btn">Hapus</button>
            </div>
        `;
        
        li.querySelector('.todo-checkbox').addEventListener('change', () => {
            t.completed = !t.completed;
            localStorage.setItem('todo-tasks', JSON.stringify(state.tasks));
            renderTasks();
        });
        
        li.querySelector('.delete-btn').addEventListener('click', () => {
            state.tasks = state.tasks.filter(tk => tk.id !== t.id);
            localStorage.setItem('todo-tasks', JSON.stringify(state.tasks));
            renderTasks();
        });
        
        li.querySelector('.edit-btn').addEventListener('click', () => {
            const nt = prompt("Ubah tugas:", t.text);
            if (nt === null) return;
            const cleanText = nt.trim();
            if (!cleanText) return;
            if (state.tasks.some(tk => tk.id !== t.id && tk.text.toLowerCase() === cleanText.toLowerCase())) {
                alert("Tugas tersebut sudah ada!");
                return;
            }
            t.text = cleanText;
            localStorage.setItem('todo-tasks', JSON.stringify(state.tasks));
            renderTasks();
        });
        
        todoList.appendChild(li);
    });
}

// --- QUICK LINKS LOGIC ---
function handleAddLink(e) {
    e.preventDefault();
    state.links.push({ id: Date.now().toString(), name: linkNameInput.value.trim(), url: linkUrlInput.value.trim() });
    localStorage.setItem('todo-links', JSON.stringify(state.links));
    renderLinks();
    linkForm.reset();
}

function renderLinks() {
    linksContainer.innerHTML = '';
    state.links.forEach(l => {
        const div = document.createElement('div');
        div.className = 'link-item';
        div.innerHTML = `<a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.name}</a><button class="link-delete-btn">&times;</button>`;
        div.querySelector('.link-delete-btn').addEventListener('click', () => {
            state.links = state.links.filter(lk => lk.id !== l.id);
            localStorage.setItem('todo-links', JSON.stringify(state.links));
            renderLinks();
        });
        linksContainer.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', init);