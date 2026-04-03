/* =============================================
   虾天气 - Weather Crayfish PWA
   ============================================= */

const canvas = document.getElementById('weatherCanvas');
const ctx = canvas.getContext('2d');

// DOM 元素
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const cityEl = document.getElementById('city');
const moodText = document.getElementById('moodText');
const updateTimeEl = document.getElementById('updateTime');
const speechBubble = document.getElementById('speechBubble');
const charEl = document.querySelector('.character');
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const locateBtn = document.getElementById('locateBtn');
const speakBtn = document.getElementById('speakBtn');
const refreshBtn = document.getElementById('refreshBtn');

// 状态
let particles = [];
let currentWeather = '';
let isLoading = false;
let lastSpokenText = '';

// OpenWeather API Key
const API_KEY = '42fb51a94cacac1ba5c473cc3c51da4d';

// ============ 语音朗读 ============

function speak(text) {
  if (!('speechSynthesis' in window)) {
    console.log('Speech not supported');
    return;
  }

  // 停止之前的朗读
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // 尝试找英文语音
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.includes('en'));
  if (enVoice) {
    utterance.voice = enVoice;
  }

  window.speechSynthesis.speak(utterance);
  lastSpokenText = text;
}

// 朗读天气信息
function announceWeather() {
  const city = cityEl.textContent;
  const temp = tempEl.textContent;
  const desc = descEl.textContent;
  const mood = moodText.textContent;

  const text = `In ${city}, it is ${desc}, ${temp}. ${mood}`;
  speak(text);
}

// 预加载语音
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// 画布尺寸
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log('[Canvas] Resized to:', canvas.width, 'x', canvas.height);
}
window.addEventListener('resize', resize);
resize();

// ============ 天气数据获取 ============

async function fetchWeather(location) {
  try {
    isLoading = true;
    showLoading(true);

    // 1. OpenWeather Geocoding API
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`
    );
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      showError('找不到这个城市，换个名字试试？');
      isLoading = false;
      showLoading(false);
      return false;
    }

    const { lat, lon, name, country } = geoData[0];

    // 2. OpenWeather Current Weather API
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=zh_cn`
    );
    const weatherData = await weatherRes.json();

    if (weatherData.cod !== 200) {
      showError('获取天气失败');
      isLoading = false;
      showLoading(false);
      return false;
    }

    const { temp } = weatherData.main;
    const { description, icon } = weatherData.weather[0];
    const weatherCode = iconToCode(icon);

    // 更新 UI
    tempEl.textContent = `${Math.round(temp)}°`;
    descEl.textContent = description;
    cityEl.textContent = `${name}, ${country}`;

    const now = new Date();
    updateTimeEl.textContent = `更新 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 设置天气
    setWeather(weatherCode);
    isLoading = false;
    showLoading(false);

    // 延迟朗读，让气泡先显示
    setTimeout(announceWeather, 1500);
    return true;

  } catch (e) {
    console.error('Weather fetch error:', e);
    showError('网络开小差了，等会再试~');
    isLoading = false;
    showLoading(false);
    // API 失败时设置默认天气，确保背景有效果
    setWeather(0);
    return false;
  }
}

// OpenWeather 图标转天气码
function iconToCode(icon) {
  const map = {
    '01d': 0, '01n': 800,           // 晴
    '02d': 1, '02n': 801,           // 晴间多云
    '03d': 2, '03n': 802,           // 多云
    '04d': 3, '04n': 803,           // 阴
    '09d': 61, '09n': 61,           // 小雨
    '10d': 63, '10n': 63,           // 中雨
    '11d': 95, '11n': 95,           // 雷暴
    '13d': 71, '13n': 71,           // 雪
    '50d': 45, '50n': 45            // 雾
  };
  return map[icon] ?? 0;
}

function showLoading(show) {
  if (show) {
    tempEl.textContent = '--°';
    descEl.textContent = '加载中...';
    cityEl.textContent = '--';
  }
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-msg';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// WMO 天气码转描述
function codeToDesc(code) {
  const map = {
    0: '晴朗', 1: '晴间多云', 2: '多云', 3: '阴天',
    45: '雾', 48: '霜雾',
    51: '小毛毛雨', 53: '中毛毛雨', 55: '大毛毛雨',
    56: '冻毛毛雨', 57: '强冻毛毛雨',
    61: '小雨', 63: '中雨', 65: '大雨',
    66: '冻雨', 67: '强冻雨',
    71: '小雪', 73: '中雪', 75: '大雪',
    77: '雪粒',
    80: '阵雨', 81: '中阵雨', 82: '强阵雨',
    85: '阵雪', 86: '强阵雪',
    95: '雷暴', 96: '雷暴+冰雹', 99: '雷暴+大冰雹'
  };
  return map[code] || '未知';
}

// ============ 天气分类 ============

function setWeather(code) {
  let type;

  if ([95, 96, 99].includes(code)) {
    type = 'thunder';
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    type = 'snow';
  } else if ([61, 63, 65, 66, 67, 80, 81, 82, 51, 53, 55, 56, 57].includes(code)) {
    type = 'rain';
  } else if ([45, 48].includes(code)) {
    type = 'fog';
  } else if ([2, 3].includes(code)) {
    type = 'cloudy';
  } else if ([0, 1].includes(code)) {
    const hour = new Date().getHours();
    type = (hour >= 6 && hour < 19) ? 'sunny' : 'clear-night';
  } else {
    type = 'default';
  }

  if (currentWeather === type) return;
  currentWeather = type;

  // 移除旧状态
  document.body.className = '';

  // 隐藏所有道具
  document.querySelectorAll('.prop').forEach(p => {
    p.style.opacity = '0';
    p.style.transform = 'scale(0)';
  });

  // 语录
  const slogans = getSlogans(type);
  moodText.textContent = slogans;

  // 语音气泡
  showSpeech(getSpeech(type));

  // 初始化粒子
  initWeather(type);

  // 应用背景和道具（延迟确保粒子先初始化）
  setTimeout(() => {
    document.body.className = 'bg-' + type;
    showProps(type);
  }, 100);
}

function getSpeech(type) {
  const speeches = {
    rain: '撑伞！',
    thunder: '好怕！',
    snow: '冷冷冷！',
    sunny: '防晒啦！',
    cloudy: '难过...',
    fog: '看不清...',
    'clear-night': '晚安~',
    default: '嗯...'
  };
  return speeches[type] || '嗯...';
}

function getSlogans(type) {
  const map = {
    rain: [
      'The rain is pouring down like crazy',
      'This rain is heavier than my diet resolve',
      'Rainy days are perfect for sleeping',
      'Walking in the rain with my umbrella',
      'Rain: soaking everyone equally'
    ],
    thunder: [
      'The thunder is so loud even max volume won\'t cover it',
      'Someone is渡劫! Wait, I\'m not a monster...',
      'So scared! Hiding under my blanket',
      'Boyfriends can go, but not thunder',
      'Am I safe hiding under the covers?'
    ],
    snow: [
      'Snow is romantic, except when going outside',
      'Building a snowman isn\'t hard, making one that looks like me is',
      'Snowflakes falling, this crayfish is spacing out',
      'So cold my fingers are shaking',
      'Snow isn\'t cold, melting snow is cold'
    ],
    sunny: [
      'The weather is amazing today, mood is boosted',
      'Sunshine heals everything',
      'Get roasted by the sun or roasted by laziness at home',
      'Sunshine energy is fully charged',
      'Perfect weather for drying blankets'
    ],
    cloudy: [
      'My mood is as unpredictable as the weather...',
      'Even my shadow is gray without sunshine',
      'Cloudy days are for daydreaming',
      'The clouds are thick, this crayfish feels blue',
      'Today I want to lie flat, stay home, and slack off'
    ],
    fog: [
      'Everything is white, can\'t see a thing...',
      'The fog is so thick, even my crayfish eyes can\'t shine',
      'Walking in the fog and getting... lost',
      'Can\'t see my hand in front of my face',
      'The fog is like a free filter'
    ],
    'clear-night': [
      'So many stars, this crayfish is sleepy',
      'Good night world, good night crayfish',
      'The moonlight is beautiful tonight',
      'Sleep well, stay energetic tomorrow',
      'Stars twinkling like saying goodnight'
    ]
  };

  const arr = map[type] || ['Feeling the weather...'];
  return arr[Math.floor(Math.random() * arr.length)];
}

function showSpeech(text) {
  speechBubble.textContent = text;
  speechBubble.classList.remove('show');
  void speechBubble.offsetWidth;
  speechBubble.classList.add('show');
  setTimeout(() => speechBubble.classList.remove('show'), 2500);
}

function showProps(type) {
  const props = {
    rain: ['prop-rain'],
    thunder: ['prop-thunder'],
    snow: ['prop-snow'],
    sunny: ['prop-sunscreen', 'prop-sunglasses'],
    cloudy: ['prop-tear'],
    fog: [],
    'clear-night': []
  };

  const toShow = props[type] || [];
  toShow.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    }
  });
}

// ============ 天气粒子系统 ============

function initWeather(type) {
  particles = [];

  // 确保 canvas 尺寸已设置
  if (!canvas.width || !canvas.height) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  switch (type) {
    case 'rain': initRain(); break;
    case 'thunder': initThunder(); break;
    case 'snow': initSnow(); break;
    case 'sunny': initSunny(); break;
    case 'cloudy': initCloudy(); break;
    case 'fog': initFog(); break;
    case 'clear-night': initClearNight(); break;
    default: initSunny(); break;
  }

  console.log(`[Weather] ${type} particles initialized:`, particles.length);
}

function initRain() {
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 8 + Math.random() * 8,
      length: 15 + Math.random() * 20,
      opacity: 0.3 + Math.random() * 0.4,
      hue: 200 + Math.random() * 30
    });
  }
}

function initThunder() {
  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 12 + Math.random() * 12,
      length: 20 + Math.random() * 30,
      opacity: 0.4 + Math.random() * 0.4,
      hue: 260 + Math.random() * 40
    });
  }
}

function initSnow() {
  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 1 + Math.random() * 2,
      radius: 2 + Math.random() * 4,
      wobble: Math.random() * Math.PI * 2,
      opacity: 0.5 + Math.random() * 0.4,
      hue: 190 + Math.random() * 20
    });
  }
}

function initSunny() {
  // 太阳光线
  for (let i = 0; i < 16; i++) {
    particles.push({
      angle: (i / 16) * Math.PI * 2,
      speed: 0.006,
      rayLength: 80 + Math.random() * 60,
      opacity: 0.2 + Math.random() * 0.15
    });
  }
  // 光晕漂浮粒子
  for (let i = 0; i < 50; i++) {
    particles.push({
      isGlow: true,
      angle: Math.random() * Math.PI * 2,
      radius: 30 + Math.random() * 80,
      speed: 0.015 + Math.random() * 0.02,
      size: 2 + Math.random() * 5,
      opacity: 0.4 + Math.random() * 0.4
    });
  }
  // 额外光尘
  for (let i = 0; i < 30; i++) {
    particles.push({
      isDust: true,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 1 + Math.random() * 2,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: 0.3 + Math.random() * 0.4,
      life: Math.random() * 200
    });
  }
}

function initCloudy() {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: Math.random() * canvas.width * 1.5 - canvas.width * 0.25,
      y: Math.random() * canvas.height,
      width: 250 + Math.random() * 350,
      height: 120 + Math.random() * 80,
      speed: 0.2 + Math.random() * 0.3,
      opacity: 0.15 + Math.random() * 0.2
    });
  }
}

function initFog() {
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 100 + Math.random() * 200,
      speed: 0.35 + Math.random() * 0.35,
      opacity: 0.08 + Math.random() * 0.1
    });
  }
}

function initClearNight() {
  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7,
      radius: 0.5 + Math.random() * 2.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.025 + Math.random() * 0.035,
      opacity: 0.4 + Math.random() * 0.6
    });
  }
  // 月亮
  particles.push({
    isMoon: true,
    x: canvas.width * 0.8,
    y: canvas.height * 0.15,
    radius: 40
  });
}

// ============ 银河系背景 ============
const galaxyStars = [];
let galaxyTime = 0;

function initGalaxy() {
  for (let i = 0; i < 200; i++) {
    galaxyStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 0.5 + Math.random() * 2,
      speed: 0.2 + Math.random() * 0.5,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.03,
      hue: 200 + Math.random() * 60 // 蓝色到紫色
    });
  }
}
initGalaxy();

function drawGalaxy() {
  galaxyTime += 0.01;

  // 银河带渐变
  ctx.save();
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // 旋转的银河光带
  for (let r = Math.max(canvas.width, canvas.height); r > 0; r -= 50) {
    const alpha = 0.02 + (1 - r / Math.max(canvas.width, canvas.height)) * 0.03;
    const rotation = galaxyTime * 0.1;

    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(
      cx + Math.cos(rotation) * 50,
      cy + Math.sin(rotation) * 50,
      r * 0.3,
      cx,
      cy,
      r
    );
    grad.addColorStop(0, 'rgba(100, 80, 150, 0.3)');
    grad.addColorStop(0.5, 'rgba(60, 40, 100, 0.2)');
    grad.addColorStop(1, 'rgba(20, 20, 50, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();

  // 银河星星
  galaxyStars.forEach(star => {
    star.twinkle += star.twinkleSpeed;

    const alpha = 0.3 + 0.5 * Math.abs(Math.sin(star.twinkle));
    const size = star.size * (0.8 + 0.4 * Math.sin(star.twinkle));

    ctx.save();
    ctx.globalAlpha = alpha;

    // 星星发光
    const starGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 3);
    starGrad.addColorStop(0, `hsla(${star.hue}, 80%, 90%, 1)`);
    starGrad.addColorStop(0.3, `hsla(${star.hue}, 70%, 70%, 0.6)`);
    starGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = starGrad;
    ctx.beginPath();
    ctx.arc(star.x, star.y, size * 3, 0, Math.PI * 2);
    ctx.fill();

    // 星星核心
    ctx.fillStyle = `hsla(${star.hue}, 60%, 95%, 1)`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 星星缓慢漂移
    star.x += star.speed * 0.1;
    if (star.x > canvas.width + 10) {
      star.x = -10;
      star.y = Math.random() * canvas.height;
    }
  });

  // 流星
  if (Math.random() < 0.003) {
    drawShootingStar();
  }
}

// 流星数据
const shootingStars = [];

function drawShootingStar() {
  const startX = Math.random() * canvas.width;
  const startY = Math.random() * canvas.height * 0.5;
  shootingStars.push({
    x: startX,
    y: startY,
    length: 80 + Math.random() * 60,
    speed: 8 + Math.random() * 4,
    angle: Math.PI * 0.25 + Math.random() * 0.1,
    life: 1
  });
}

function updateShootingStars() {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    s.life -= 0.02;

    if (s.life <= 0 || s.x > canvas.width + 100 || s.y > canvas.height + 100) {
      shootingStars.splice(i, 1);
    }
  }
}

function renderShootingStars() {
  shootingStars.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.life;

    const grad = ctx.createLinearGradient(
      s.x, s.y,
      s.x - Math.cos(s.angle) * s.length,
      s.y - Math.sin(s.angle) * s.length
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(200, 220, 255, 0.8)');
    grad.addColorStop(1, 'transparent');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length);
    ctx.stroke();

    // 流星头
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

// ============ 绘制 ============

let thunderFlash = 0;

function draw() {
  // 确保 canvas 尺寸有效
  if (!canvas.width || !canvas.height) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 银河系背景
  drawGalaxy();
  updateShootingStars();
  renderShootingStars();

  switch (currentWeather) {
    case 'rain': drawRain(); break;
    case 'thunder': drawThunder(); break;
    case 'snow': drawSnow(); break;
    case 'sunny': drawSunny(); break;
    case 'cloudy': drawCloudy(); break;
    case 'fog': drawFog(); break;
    case 'clear-night': drawClearNight(); break;
    default: drawSunny(); break;
  }

  requestAnimationFrame(draw);
}

function drawRain() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;

    // 雨滴
    ctx.strokeStyle = `hsla(${p.hue}, 70%, 70%, 0.8)`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 2, p.y + p.length);
    ctx.stroke();

    // 底部光点
    ctx.fillStyle = `hsla(${p.hue}, 90%, 80%, 0.9)`;
    ctx.beginPath();
    ctx.arc(p.x + 2, p.y + p.length, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    p.y += p.speed;
    p.x += 0.3;
    if (p.y > canvas.height) {
      p.y = -p.length;
      p.x = Math.random() * canvas.width;
    }
  });
  ctx.globalAlpha = 1;
}

function drawThunder() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;

    // 闪电
    ctx.strokeStyle = `hsla(${p.hue}, 70%, 75%, 0.9)`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y + p.length);
    ctx.stroke();

    // 闪电头
    ctx.fillStyle = `hsla(${p.hue}, 90%, 90%, 1)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y + p.length, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    p.y += p.speed;
    p.x += 0.3;
    if (p.y > canvas.height) {
      p.y = -p.length;
      p.x = Math.random() * canvas.width;
    }
  });

  // 闪电效果
  if (Math.random() < 0.006) {
    thunderFlash = 10;
  }
  if (thunderFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (thunderFlash / 10) * 0.2;
    ctx.fillStyle = '#e0e0ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    thunderFlash--;
  }

  ctx.globalAlpha = 1;
}

function drawSnow() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;

    // 雪粒
    ctx.fillStyle = `hsla(${p.hue}, 60%, 95%, 0.9)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    p.wobble += 0.03;
    p.x += Math.sin(p.wobble) * 0.6;
    p.y += p.speed;

    if (p.y > canvas.height + 10) {
      p.y = -10;
      p.x = Math.random() * canvas.width;
    }
  });
  ctx.globalAlpha = 1;
}

function drawSunny() {
  const cx = canvas.width / 2;
  const cy = 140;
  const maxR = Math.min(canvas.width, canvas.height) * 0.4;

  // 外层光晕
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0, 'rgba(255, 230, 120, 0.8)');
  grad.addColorStop(0.3, 'rgba(255, 200, 80, 0.4)');
  grad.addColorStop(0.7, 'rgba(255, 150, 50, 0.15)');
  grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 太阳射线
  particles.forEach(p => {
    if (p.isGlow) {
      // 光晕飘粒
      p.angle += p.speed;
      const gx = cx + Math.cos(p.angle) * p.radius;
      const gy = cy + Math.sin(p.angle) * p.radius;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 220, 100, 0.8)';
      ctx.fillStyle = 'rgba(255, 230, 120, 0.9)';
      ctx.beginPath();
      ctx.arc(gx, gy, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.isDust) {
      // 光尘粒子
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(255, 255, 200, 0.6)';
      ctx.fillStyle = 'rgba(255, 250, 200, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      p.x += p.speedX;
      p.y += p.speedY;
      p.life--;
      if (p.life <= 0 || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
        p.x = Math.random() * canvas.width;
        p.y = Math.random() * canvas.height;
        p.life = 150 + Math.random() * 100;
      }
    } else {
      // 射线
      p.angle += p.speed;
      const outerX = cx + Math.cos(p.angle) * maxR * 0.85;
      const outerY = cy + Math.sin(p.angle) * maxR * 0.85;
      const innerX = cx + Math.cos(p.angle) * (maxR * 0.35);
      const innerY = cy + Math.sin(p.angle) * (maxR * 0.35);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 220, 100, 0.5)';
      ctx.strokeStyle = 'rgba(255, 220, 100, 0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
      ctx.restore();
    }
  });

  ctx.globalAlpha = 1;
}

function drawCloudy() {
  // 背景灰暗
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, 'rgba(80, 90, 100, 0.4)');
  bg.addColorStop(1, 'rgba(60, 70, 80, 0.3)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;

    // 大面积云层
    const grad = ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, p.width * 0.6
    );
    grad.addColorStop(0, 'rgba(120, 130, 145, 0.5)');
    grad.addColorStop(0.4, 'rgba(100, 110, 125, 0.35)');
    grad.addColorStop(0.7, 'rgba(80, 90, 105, 0.2)');
    grad.addColorStop(1, 'rgba(60, 70, 85, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.width * 0.6, p.height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    p.x += p.speed;
    if (p.x > canvas.width + p.width * 0.5) {
      p.x = -p.width * 0.6;
    }
  });
  ctx.globalAlpha = 1;
}

function drawFog() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;

    ctx.shadowBlur = 30;
    ctx.shadowColor = 'rgba(160, 165, 175, 0.4)';

    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
    grad.addColorStop(0, 'rgba(180, 185, 195, 0.4)');
    grad.addColorStop(0.5, 'rgba(160, 165, 175, 0.2)');
    grad.addColorStop(1, 'rgba(140, 145, 155, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    p.x += p.speed;
    if (p.x > canvas.width + p.radius) {
      p.x = -p.radius;
    }
  });
  ctx.globalAlpha = 1;
}

function drawClearNight() {
  particles.forEach(p => {
    if (p.isMoon) {
      // 月亮发光效果
      ctx.save();
      ctx.shadowBlur = 40;
      ctx.shadowColor = 'rgba(255, 255, 200, 0.5)';

      ctx.globalAlpha = 0.95;
      const moonGrad = ctx.createRadialGradient(
        p.x - 10, p.y - 10, 0,
        p.x, p.y, p.radius
      );
      moonGrad.addColorStop(0, 'rgba(255, 255, 240, 1)');
      moonGrad.addColorStop(0.5, 'rgba(255, 250, 220, 0.95)');
      moonGrad.addColorStop(0.8, 'rgba(255, 245, 200, 0.9)');
      moonGrad.addColorStop(1, 'rgba(255, 230, 180, 0.7)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      p.twinkle += p.speed;
      const alpha = p.opacity * (0.4 + 0.6 * Math.abs(Math.sin(p.twinkle)));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(200, 220, 255, 0.8)';
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;
}

// ============ GPS 定位 ============

function getCurrentLocation() {
  if (!navigator.geolocation) {
    showError('浏览器不支持定位功能');
    return;
  }

  locateBtn.textContent = '⏳';
  locateBtn.style.opacity = '0.6';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        // OpenWeather Reverse Geocoding
        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoRes.json();

        let cityName = '当前位置';
        if (geoData && geoData.length > 0) {
          cityName = geoData[0].name;
        }

        // OpenWeather Current Weather
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=zh_cn`
        );
        const weatherData = await weatherRes.json();

        if (weatherData.cod !== 200) {
          showError('获取天气失败');
          locateBtn.textContent = '📍';
          locateBtn.style.opacity = '1';
          return;
        }

        const { temp } = weatherData.main;
        const { description, icon } = weatherData.weather[0];
        const code = iconToCode(icon);

        tempEl.textContent = `${Math.round(temp)}°`;
        descEl.textContent = description;
        cityEl.textContent = cityName;
        locationInput.value = cityName;

        const now = new Date();
        updateTimeEl.textContent = `更新 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

        setWeather(code);
      } catch (e) {
        showError('定位获取天气失败');
      }

      locateBtn.textContent = '📍';
      locateBtn.style.opacity = '1';
    },
    (_err) => {
      showError('定位失败，请检查权限');
      locateBtn.textContent = '📍';
      locateBtn.style.opacity = '1';
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// ============ 启动 ============

// 预初始化粒子效果（防止加载时空白）
function preInitParticles() {
  if (!canvas.width || !canvas.height) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  // 默认晴天粒子效果
  currentWeather = 'sunny';
  initWeather('sunny');
  console.log('[Weather] Pre-initialized with sunny particles:', particles.length);
}

// 启动动画循环
draw();

// 预初始化粒子避免空白
preInitParticles();

// 默认加载天气
fetchWeather('北京');

// 搜索功能
searchBtn.addEventListener('click', () => {
  const loc = locationInput.value.trim();
  if (loc) fetchWeather(loc);
});

locationInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const loc = e.target.value.trim();
    if (loc) fetchWeather(loc);
  }
});

// GPS 定位
locateBtn.addEventListener('click', getCurrentLocation);

// 朗读按钮
speakBtn.addEventListener('click', () => {
  const city = cityEl.textContent;
  const temp = tempEl.textContent;
  const desc = descEl.textContent;
  const mood = moodText.textContent;

  if (city === '--') {
    showError('先获取天气再朗读');
    return;
  }

  const text = `In ${city}, it is ${desc}, ${temp}. ${mood}`;

  // 如果正在朗读，就停止
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    speakBtn.textContent = '🔊';
  } else {
    speak(text);
    speakBtn.textContent = '🔇';
    // 朗读结束时恢复图标
    window.speechSynthesis.onend = () => {
      speakBtn.textContent = '🔊';
    };
  }
});

// 刷新天气按钮
refreshBtn.addEventListener('click', () => {
  const city = locationInput.value.trim() || '北京';
  refreshBtn.classList.add('spinning');
  fetchWeather(city).finally(() => {
    setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
  });
});

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('SW registered'))
    .catch((err) => console.log('SW registration failed:', err));
}
