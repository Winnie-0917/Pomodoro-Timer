/* Lo‑Fi Focus Space - index.js */
// Pomodoro defaults
const WORK_MIN = 25;
const BREAK_MIN = 5;

// DOM
const timeEl = document.getElementById('time');
const modeLabel = document.getElementById('modeLabel');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const presets = document.querySelectorAll('.presets .btn');
const ring = document.querySelector('.ring');
const ringBg = document.querySelector('.ring-bg');
const volumeRange = document.getElementById('volumeRange');
const youtubeUrl = document.getElementById('youtubeUrl');
const youtubeLoadBtn = document.getElementById('youtubeLoadBtn');
const youtubeStatus = document.getElementById('youtubeStatus');
const volumeLabel = document.getElementById('volumeLabel');
const volumeToggle = document.getElementById('volumeToggle');

let mode = 'work'; // 'work' or 'break'
let duration = WORK_MIN * 60; // seconds
let remaining = duration;
let timerId = null;
let isRunning = false;
let isMuted = false;
let previousVolume = 50;

// Progress ring setup
const R = 100;
const CIRC = 2 * Math.PI * R;
ring.style.strokeDasharray = `${CIRC}`;
ring.style.strokeDashoffset = `0`;

function formatTime(s){
	const m = Math.floor(s/60).toString().padStart(2,'0');
	const sec = Math.floor(s%60).toString().padStart(2,'0');
	return `${m}:${sec}`;
}

function updateDisplay(){
	timeEl.textContent = formatTime(remaining);
	modeLabel.textContent = mode === 'work' ? '工作' : '休息';
	const progress = 1 - (remaining / duration);
	const offset = CIRC * (1 - progress);
	ring.style.strokeDashoffset = `${offset}`;
}

function setMode(newMode, minutes){
	mode = newMode;
	duration = (minutes|| (mode === 'work' ? WORK_MIN : BREAK_MIN)) * 60;
	remaining = duration;
	updateDisplay();
}

function tick(){
	if (remaining > 0){
		remaining -= 1;
		updateDisplay();
	} else {
		// switch mode automatically
		if (mode === 'work') setMode('break', BREAK_MIN);
		else setMode('work', WORK_MIN);
		// keep running
	}
}

function startTimer(){
	if (isRunning) return;
	isRunning = true;
	timerId = setInterval(tick, 1000);
	// resume audio if present
	resumeAudio();
}

function pauseTimer(){
	if (!isRunning) return;
	isRunning = false;
	clearInterval(timerId);
	timerId = null;
	// pause audio
	suspendAudio();
}

function resetTimer(){
	pauseTimer();
	setMode('work', WORK_MIN);
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

presets.forEach(btn=>{
	btn.addEventListener('click', ()=>{
		const m = Number(btn.dataset.min);
		// if m equals small number, treat as break if <=10
		const useMode = m <= 10 ? 'break' : 'work';
		setMode(useMode, m);
	});
});

// --- Audio: Web Audio API (white noise) + uploaded file support ---
let audioCtx = null;
let gainNode = null;
let noiseSource = null;
let mediaElement = null;
let mediaSourceNode = null;
let isLoadingAudio = false; // Flag to prevent concurrent audio loading
let defaultAudioLoaded = false; // Track if default audio has been loaded
let lastDownloadedUrl = null; // Track last downloaded URL to prevent duplicates

function ensureAudio(){
	if (!audioCtx){
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		gainNode = audioCtx.createGain();
		gainNode.gain.value = Number(volumeRange.value) / 100;
		gainNode.connect(audioCtx.destination);
	}
}

function stopAllAudio(){
	try{
		if (noiseSource){
			noiseSource.stop();
			noiseSource.disconnect();
			noiseSource = null;
		}
	}catch(e){}
	try{
		if (mediaElement){
			mediaElement.pause();
			if (mediaSourceNode) mediaSourceNode.disconnect();
			mediaElement = null;
			mediaSourceNode = null;
		}
	}catch(e){}
}

function resumeAudio(){
	if (!audioCtx) return;
	if (audioCtx.state === 'suspended') audioCtx.resume();
	if (mediaElement && mediaElement.paused === true) mediaElement.play();
}

function suspendAudio(){
	if (!audioCtx) return;
	if (audioCtx.state === 'running') audioCtx.suspend();
	if (mediaElement && !mediaElement.paused) mediaElement.pause();
}

// Load and play default.mp3
async function loadDefaultAudio(){
	// Prevent concurrent loading
	if (isLoadingAudio || defaultAudioLoaded) {
		console.log('Audio already loading or loaded, skipping...');
		return;
	}
	
	isLoadingAudio = true;
	
	try {
		stopAllAudio();
		ensureAudio();
		
		const defaultUrl = `${SERVER_URL}/default.mp3`;
		console.log('Loading default audio:', defaultUrl);
		
		mediaElement = new Audio(defaultUrl);
		mediaElement.loop = true;
		mediaElement.crossOrigin = 'anonymous';
		
		// Handle audio loading errors - only once
		const errorHandler = (e) => {
			console.error('Default audio loading error:', e);
			console.warn('無法載入 default.mp3');
			isLoadingAudio = false;
			defaultAudioLoaded = true; // Mark as loaded even if failed
		};
		mediaElement.addEventListener('error', errorHandler, { once: true });
		
		// Wait for audio to be ready
		await new Promise((resolve, reject) => {
			mediaElement.addEventListener('canplaythrough', () => {
				resolve();
			}, { once: true });
			mediaElement.addEventListener('error', reject, { once: true });
			mediaElement.load();
		});
		
		// Connect to WebAudio gain node for volume control
		mediaSourceNode = audioCtx.createMediaElementSource(mediaElement);
		mediaSourceNode.connect(gainNode);
		
		// Auto-play (browser may require user interaction first)
		try {
			await mediaElement.play();
			console.log('Default audio playing');
			defaultAudioLoaded = true;
		} catch(e) {
			console.warn('自動播放被瀏覽器阻擋，需要用戶互動後才能播放:', e);
			defaultAudioLoaded = true;
			// Try to play after user interaction - only add once
			const playOnClick = async () => {
				if (mediaElement && mediaElement.paused) {
					try {
						await mediaElement.play();
					} catch(err) {
						console.warn('播放失敗:', err);
					}
				}
			};
			// Remove any existing listener first, then add new one
			document.removeEventListener('click', playOnClick);
			document.addEventListener('click', playOnClick, { once: true });
		}
	} catch (error) {
		console.error('Error loading default audio:', error);
		defaultAudioLoaded = true;
	} finally {
		isLoadingAudio = false;
	}
}

volumeRange.addEventListener('input', ()=>{
	ensureAudio();
	const v = Number(volumeRange.value) / 100;
	volumeLabel.textContent = volumeRange.value + '%';
	if (gainNode) gainNode.gain.setValueAtTime(v, audioCtx.currentTime || 0);
	// Update mute button if volume is changed manually
	if (volumeRange.value > 0 && isMuted) {
		isMuted = false;
		document.querySelector('.volume-icon').textContent = '🔊';
		volumeToggle.classList.remove('muted');
		volumeToggle.title = '靜音';
	}
});

volumeToggle.addEventListener('click', ()=>{
	if (isMuted) {
		// Unmute
		volumeRange.value = previousVolume;
		volumeLabel.textContent = previousVolume + '%';
		ensureAudio();
		const v = previousVolume / 100;
		if (gainNode) gainNode.gain.setValueAtTime(v, audioCtx.currentTime || 0);
		document.querySelector('.volume-icon').textContent = '🔊';
		volumeToggle.classList.remove('muted');
		volumeToggle.title = '靜音';
		isMuted = false;
	} else {
		// Mute
		previousVolume = Number(volumeRange.value);
		volumeRange.value = 0;
		volumeLabel.textContent = '0%';
		ensureAudio();
		if (gainNode) gainNode.gain.setValueAtTime(0, audioCtx.currentTime || 0);
		document.querySelector('.volume-icon').textContent = '🔇';
		volumeToggle.classList.add('muted');
		volumeToggle.title = '取消靜音';
		isMuted = true;
	}
});

// Server configuration
// Auto-detect server URL based on current location
const SERVER_URL = (() => {
	// If running from file:// protocol, use localhost:5000
	if (window.location.protocol === 'file:') {
		return 'http://localhost:5000';
	}
	// Otherwise use the same origin
	return window.location.origin;
})();

console.log('Server URL:', SERVER_URL);

// YouTube support
function extractYoutubeVideoId(url){
	// Support multiple URL formats
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
		/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
	];
	for (let pattern of patterns){
		const match = url.match(pattern);
		if (match) return match[1];
	}
	return null;
}

// Check if URL is a playlist
function isPlaylistUrl(url){
	// Check for playlist indicators in URL
	return url.includes('list=') || url.includes('/playlist');
}

// Normalize URL to remove playlist parameters
function normalizeVideoUrl(url){
	// Remove playlist parameters to ensure only single video is downloaded
	try {
		const urlObj = new URL(url);
		// Remove list parameter if present
		urlObj.searchParams.delete('list');
		urlObj.searchParams.delete('index');
		return urlObj.toString();
	} catch {
		// If URL parsing fails, try simple string replacement
		return url.split('&list=')[0].split('?list=')[0];
	}
}

youtubeLoadBtn.addEventListener('click', async ()=>{
	// Prevent multiple concurrent requests
	if (youtubeLoadBtn.disabled || isLoadingAudio) {
		console.log('Already processing, ignoring click');
		return;
	}
	
	let url = youtubeUrl.value.trim();
	if (!url){
		youtubeStatus.textContent = '請輸入 URL';
		youtubeStatus.className = 'youtube-status error';
		return;
	}

	// Check if it's a playlist URL
	if (isPlaylistUrl(url)) {
		youtubeStatus.textContent = '錯誤：不支援播放列表，請使用單個視頻 URL';
		youtubeStatus.className = 'youtube-status error';
		return;
	}

	// Normalize URL to remove playlist parameters
	url = normalizeVideoUrl(url);
	
	// Check if this URL was just downloaded
	if (lastDownloadedUrl === url) {
		youtubeStatus.textContent = '此 URL 剛剛已下載，請使用其他視頻';
		youtubeStatus.className = 'youtube-status error';
		return;
	}

	// Basic validation using video id extraction (keeps previous helper)
	const videoId = extractYoutubeVideoId(url);
	if (!videoId){
		youtubeStatus.textContent = '無效的 YouTube URL';
		youtubeStatus.className = 'youtube-status error';
		return;
	}

	youtubeStatus.textContent = '轉換中，請稍候...';
	youtubeStatus.className = 'youtube-status';
	youtubeLoadBtn.disabled = true;
	isLoadingAudio = true;

	try {
		// Tell the backend to download & convert to mp3 using youtube_to_mp3.py
		const apiUrl = `${SERVER_URL}/api/download`;
		console.log('Fetching from:', apiUrl);
		
		const resp = await fetch(apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url: url }) // Use normalized URL
		}).catch(err => {
			// Network error - server not reachable
			console.error('Fetch error:', err);
			if (err instanceof TypeError) {
				const isFileProtocol = window.location.protocol === 'file:';
				const errorMsg = isFileProtocol 
					? '無法連接到伺服器。請在瀏覽器中訪問 http://localhost:5000 而不是直接打開 HTML 文件'
					: '無法連接到伺服器。請確認伺服器正在運行（執行 python server.py）';
				throw new Error(errorMsg);
			}
			throw err;
		});

		if (!resp.ok) {
			let errorMsg = '伺服器錯誤';
			try {
				const errorData = await resp.json();
				errorMsg = errorData.error || errorData.hint || errorMsg;
			} catch {
				const txt = await resp.text();
				if (txt) errorMsg = txt;
			}
			throw new Error(errorMsg);
		}

		const data = await resp.json();
		if (!data || !data.file) throw new Error('未收到檔案路徑');

		// Keep default.mp3 playing until new audio is ready
		// Don't stop existing audio yet - wait until new one is loaded
		ensureAudio();

		// Use absolute URL if needed (in case of CORS issues)
		const audioUrl = data.file.startsWith('http') ? data.file : 
			(SERVER_URL + data.file);
		
		// Create new audio element for the YouTube MP3
		const newMediaElement = new Audio(audioUrl);
		newMediaElement.loop = true;
		newMediaElement.crossOrigin = 'anonymous';
		
		// Prevent automatic fallback to white noise on playback errors
		newMediaElement.addEventListener('error', (e) => {
			console.error('Audio playback error:', e);
			// Don't switch to white noise, just log the error
		}, { once: true });

		// Wait for the new audio to be ready before switching
		await new Promise((resolve, reject) => {
			newMediaElement.addEventListener('canplaythrough', resolve, { once: true });
			newMediaElement.addEventListener('error', (e) => {
				console.error('Audio loading error:', e);
				reject(new Error('無法載入音訊檔案'));
			});
			// Start loading
			newMediaElement.load();
		});

		// Now that new audio is ready, stop old audio and switch
		stopAllAudio();
		
		mediaElement = newMediaElement;
		
		// Prevent audio from ending and switching to white noise
		mediaElement.addEventListener('ended', () => {
			console.log('Audio ended, restarting...');
			// If loop didn't work, manually restart
			if (mediaElement && mediaElement.paused) {
				mediaElement.currentTime = 0;
				mediaElement.play().catch(err => console.warn('Failed to restart audio:', err));
			}
		});
		
		// Connect to WebAudio gain node for volume control
		mediaSourceNode = audioCtx.createMediaElementSource(mediaElement);
		mediaSourceNode.connect(gainNode);

		youtubeStatus.textContent = '✓ 轉換完成，已載入音訊';
		youtubeStatus.className = 'youtube-status success';

		// Auto-play the new audio immediately
		try { 
			await mediaElement.play();
			console.log('YouTube audio playing');
		} catch(e){ 
			console.warn('自動播放被瀏覽器阻擋:', e);
			// Try to play after user interaction - use a named function to avoid duplicates
			const playYouTubeOnClick = async () => {
				if (mediaElement && mediaElement.paused) {
					try {
						await mediaElement.play();
					} catch(err) {
						console.warn('播放失敗:', err);
					}
				}
			};
			document.removeEventListener('click', playYouTubeOnClick);
			document.addEventListener('click', playYouTubeOnClick, { once: true });
		}
		
		// Mark that we've loaded a YouTube audio, so don't reload default
		defaultAudioLoaded = true;
		// Remember this URL to prevent duplicate downloads
		lastDownloadedUrl = url;

	} catch (error){
		let errorMessage = error.message || String(error);
		// Provide more helpful error messages
		if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
			errorMessage = '無法連接到伺服器。請確認伺服器正在運行（執行 python server.py）';
		}
		youtubeStatus.textContent = '錯誤：' + errorMessage;
		youtubeStatus.className = 'youtube-status error';
		console.error('Download/convert error:', error);
		
		// On error, ensure default.mp3 is still playing (if it was playing before)
		// Only reload if no media element exists and default hasn't been loaded
		if (!mediaElement && !defaultAudioLoaded) {
			loadDefaultAudio();
		}
	} finally {
		youtubeLoadBtn.disabled = false;
		isLoadingAudio = false;
	}
});

// Allow Enter key to load
youtubeUrl.addEventListener('keypress', (e)=>{
	if (e.key === 'Enter') youtubeLoadBtn.click();
});

// Check server connection on page load
async function checkServerConnection() {
	try {
		const response = await fetch(`${SERVER_URL}/api/download`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url: 'test' })
		});
		// Even if it returns an error, if we get a response, server is running
		console.log('Server is reachable');
	} catch (error) {
		const isFileProtocol = window.location.protocol === 'file:';
		if (isFileProtocol) {
			console.warn('提示：您正在使用 file:// 協議打開頁面。請訪問 http://localhost:5000 以使用完整功能。');
			youtubeStatus.textContent = '提示：請在瀏覽器中訪問 http://localhost:5000';
			youtubeStatus.className = 'youtube-status';
		} else {
			console.warn('無法連接到伺服器:', error);
		}
	}
}

// init
setMode('work', WORK_MIN);
// Load and play default audio on page load
setTimeout(() => {
	checkServerConnection();
	loadDefaultAudio();
}, 500);

/* ----------------------
	 Background particle + bokeh animation
	 subtle, low CPU footprint, pointer-events disabled
	 ---------------------- */
(() => {
	const canvas = document.getElementById('bgCanvas');
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	let DPR = window.devicePixelRatio || 1;
	let w = 0, h = 0;
	const particles = [];

	function resize(){
		DPR = window.devicePixelRatio || 1;
		w = window.innerWidth;
		h = window.innerHeight;
		canvas.style.width = w + 'px';
		canvas.style.height = h + 'px';
		canvas.width = Math.round(w * DPR);
		canvas.height = Math.round(h * DPR);
		ctx.setTransform(DPR,0,0,DPR,0,0);
	}

	function createParticles(){
		particles.length = 0;
		// number based on width for responsiveness, capped
		const count = Math.max(18, Math.floor(Math.min(w,1400) / 20));
		for (let i=0;i<count;i++){
			const size = 6 + Math.random()*36; // some small, some big (bokeh)
			particles.push({
				x: Math.random() * w,
				y: Math.random() * h,
				r: size,
				alpha: 0.03 + Math.random() * 0.08,
				vx: (Math.random()*0.4 - 0.2) * (size/24),
				vy: -0.02 - Math.random()*0.24, // drift upward
				hue: 180 + Math.random()*60, // teal to purple hues
				sway: Math.random()*0.8,
			});
		}
	}

	let last = performance.now();
	function draw(now){
		const dt = Math.min(60, now - last) / 1000; last = now;
		ctx.clearRect(0,0,w,h);

		// soft ambient glow: draw a few large faded orbs
		for (let i=0;i<3;i++){
			const gx = (i+0.5) / 3 * w + Math.sin(now/8000 + i) * (w*0.03);
			const gy = h * (0.2 + i*0.15);
			const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(w,h)*0.9);
			const color = `hsla(${200 + i*30}, 70%, 50%, `;
			grd.addColorStop(0, color + '0.06)');
			grd.addColorStop(0.6, color + '0.015)');
			grd.addColorStop(1, color + '0)');
			ctx.fillStyle = grd;
			ctx.fillRect(0,0,w,h);
		}

		// particles
		for (let p of particles){
			p.x += p.vx * dt * 60 + Math.sin(now/1000 * p.sway) * 0.2;
			p.y += p.vy * dt * 60;
			// wrap
			if (p.y < -p.r - 20) p.y = h + p.r + 20;
			if (p.x < -p.r - 20) p.x = w + p.r + 20;
			if (p.x > w + p.r + 20) p.x = -p.r - 20;

			// draw soft circle
			ctx.beginPath();
			ctx.fillStyle = `hsla(${p.hue}, 60%, 65%, ${p.alpha})`;
			// shadow to get soft edges
			ctx.shadowColor = `hsla(${p.hue}, 60%, 65%, ${p.alpha})`;
			ctx.shadowBlur = Math.min(60, p.r*1.8);
			ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
			ctx.fill();
			ctx.shadowBlur = 0;
		}

		requestAnimationFrame(draw);
	}

	window.addEventListener('resize', ()=>{ resize(); createParticles(); });
	// init
	resize(); createParticles(); requestAnimationFrame(draw);
})();
