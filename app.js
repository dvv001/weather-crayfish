/* =============================================
   虾天气 WeatherCosmos - 深空玻璃态
   ============================================= */

const canvas = document.getElementById('weatherCanvas');
const ctx = canvas.getContext('2d');

// DOM 元素
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const cityEl = document.getElementById('city');
const feelsLikeEl = document.getElementById('feelsLike');
const weatherIconEl = document.getElementById('weatherIcon');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const uvEl = document.getElementById('uv');
const visibilityEl = document.getElementById('visibility');
const moodText = document.getElementById('moodText');
const speechBubble = document.getElementById('speechBubble');
const charEl = document.querySelector('.character');
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const locateBtn = document.getElementById('locateBtn');
const speakBtn = document.getElementById('speakBtn');
const refreshBtn = document.getElementById('refreshBtn');
const hourlyScroll = document.getElementById('hourlyScroll');
const dailyList = document.getElementById('dailyList');

// 状态
let particles = [];
let currentWeather = '';
let isLoading = false;
let lastSpokenText = '';

// OpenWeather API Key
const API_KEY = '42fb51a94cacac1ba5c473cc3c51da4d';

// ============ 画布尺寸 ============
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log('[Canvas] Resized:', canvas.width, 'x', canvas.height);
}
window.addEventListener('resize', resize);
resize();

// ============ 语音朗读 ============
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.includes('en'));
  if (enVoice) utterance.voice = enVoice;
  window.speechSynthesis.speak(utterance);
  lastSpokenText = text;
}

function announceWeather() {
  const city = cityEl.textContent;
  const temp = tempEl.textContent;
  const desc = descEl.textContent;
  const mood = moodText.textContent;
  const text = `In ${city}, it is ${desc}, ${temp}. ${mood}`;
  speak(text);
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ============ 天气图标映射 ============
function getWeatherIcon(icon) {
  const map = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
  };
  return map[icon] || '🌤️';
}

// ============ 天气数据获取 ============
async function fetchWeather(location) {
  try {
    isLoading = true;
    showLoading(true);

    // 地理编码
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`
    );
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      showError('City not found');
      isLoading = false;
      showLoading(false);
      return false;
    }

    const { lat, lon, name, country } = geoData[0];

    // 当前天气
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=zh_cn`
    );
    const weatherData = await weatherRes.json();

    if (weatherData.cod !== 200) {
      showError('Failed to get weather');
      isLoading = false;
      showLoading(false);
      return false;
    }

    const { temp, feels_like, humidity } = weatherData.main;
    const { description, icon } = weatherData.weather[0];
    const { speed: windSpeed } = weatherData.wind;
    const { visibility } = weatherData;
    const weatherCode = iconToCode(icon);

    // 更新主界面
    tempEl.textContent = `${Math.round(temp)}°`;
    descEl.textContent = description;
    cityEl.textContent = `${name}, ${country}`;
    feelsLikeEl.textContent = `Feels like ${Math.round(feels_like)}°`;
    weatherIconEl.textContent = getWeatherIcon(icon);
    humidityEl.textContent = `${humidity}%`;
    windEl.textContent = `${Math.round(windSpeed * 3.6)} km/h`;
    uvEl.textContent = getUVLevel(windSpeed);
    visibilityEl.textContent = `${(visibility / 1000).toFixed(1)} km`;

    setWeather(weatherCode);

    // 获取小时预报
    await fetchHourlyForecast(lat, lon);

    // 获取7日预报
    await fetchDailyForecast(lat, lon);

    isLoading = false;
    showLoading(false);

    setTimeout(announceWeather, 1500);
    return true;

  } catch (e) {
    console.error('Weather fetch error:', e);
    showError('Network error, please try again');
    isLoading = false;
    showLoading(false);
    setWeather(0);
    return false;
  }
}

async function fetchHourlyForecast(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=zh_cn`
    );
    const data = await res.json();
    if (data.cod !== '200') return;

    // 取接下来24小时（每3小时一个数据，共8个）
    const hourly = data.list.slice(0, 8);
    renderHourlyForecast(hourly);
  } catch (e) {
    console.error('Hourly forecast error:', e);
  }
}

function renderHourlyForecast(hourly) {
  hourlyScroll.innerHTML = '';

  hourly.forEach((item, i) => {
    const time = new Date(item.dt * 1000);
    const temp = Math.round(item.main.temp);
    const icon = getWeatherIcon(item.weather[0].icon);
    const isNow = i === 0;

    const div = document.createElement('div');
    div.className = 'hourly-item glass-card';
    div.innerHTML = `
      <div class="time">${isNow ? 'Now' : formatTime(time)}</div>
      <div class="icon">${icon}</div>
      <div class="temp">${temp}°</div>
    `;
    hourlyScroll.appendChild(div);
  });
}

async function fetchDailyForecast(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=zh_cn`
    );
    const data = await res.json();
    if (data.cod !== '200') return;

    // 处理每日数据（每天一个预报，取中午的数据）
    const daily = {};
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!daily[date] || new Date(item.dt * 1000).getHours() === 12) {
        daily[date] = item;
      }
    });

    const days = Object.values(daily).slice(0, 7);
    renderDailyForecast(days);
  } catch (e) {
    console.error('Daily forecast error:', e);
  }
}

function renderDailyForecast(days) {
  dailyList.innerHTML = '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  days.forEach((item, i) => {
    const date = new Date(item.dt * 1000);
    const tempMin = Math.round(item.main.temp_min);
    const tempMax = Math.round(item.main.temp_max);
    const icon = getWeatherIcon(item.weather[0].icon);
    const desc = item.weather[0].description;
    const dayName = i === 0 ? 'Today' : weekdays[date.getDay()];

    const div = document.createElement('div');
    div.className = 'daily-item';
    div.innerHTML = `
      <div class="day">${dayName}</div>
      <div class="icon">${icon}</div>
      <div class="desc">${desc}</div>
      <div class="temps">
        <span class="high">${tempMax}°</span>
        <span class="low">${tempMin}°</span>
      </div>
    `;
    dailyList.appendChild(div);
  });
}

function formatTime(date) {
  return date.getHours().toString().padStart(2, '0') + ':00';
}

function getUVLevel(windSpeed) {
  // OpenWeather没有UV指数，用风速模拟
  if (windSpeed > 10) return 'High';
  if (windSpeed > 5) return 'Medium';
  return 'Low';
}

function showLoading(show) {
  if (show) {
    tempEl.textContent = '--°';
    descEl.textContent = 'Loading...';
    cityEl.textContent = '--';
    feelsLikeEl.textContent = 'Feels like --°';
    humidityEl.textContent = '--%';
    windEl.textContent = '--';
    uvEl.textContent = '--';
    visibilityEl.textContent = '-- km';
  }
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-msg';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function iconToCode(icon) {
  const map = {
    '01d': 0, '01n': 800,
    '02d': 1, '02n': 801,
    '03d': 2, '03n': 802,
    '04d': 3, '04n': 803,
    '09d': 61, '09n': 61,
    '10d': 63, '10n': 63,
    '11d': 95, '11n': 95,
    '13d': 71, '13n': 71,
    '50d': 45, '50n': 45
  };
  return map[icon] ?? 0;
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

  document.body.className = '';
  document.querySelectorAll('.prop').forEach(p => {
    p.style.opacity = '0';
    p.style.transform = 'scale(0)';
  });

  const slogans = getSlogans(type);
  moodText.textContent = slogans;
  showSpeech(getSpeech(type));
  initWeather(type);

  setTimeout(() => {
    document.body.className = 'bg-' + type;
    showProps(type);
  }, 100);
}

function getSpeech(type) {
  const speeches = {
    rain: 'Take an umbrella!',
    thunder: 'So scary!',
    snow: 'Brrr, so cold!',
    sunny: 'Wear sunscreen!',
    cloudy: 'Feeling blue...',
    fog: 'Can\'t see...',
    'clear-night': 'Good night~',
    default: 'Hmm...'
  };
  return speeches[type] || 'Hmm...';
}

function getSlogans(type) {
  const map = {
    rain: ['The rain is pouring down like crazy', 'This rain is heavier than my diet resolve', 'Rainy days are perfect for sleeping'],
    thunder: ['The thunder is so loud', 'Someone is渡劫! Wait, I\'m not a monster...', 'So scared! Hiding under my blanket'],
    snow: ['Snow is romantic, except when going outside', 'Building a snowman isn\'t hard', 'Snowflakes falling, this crayfish is spacing out'],
    sunny: ['The weather is amazing today', 'Sunshine heals everything', 'Get roasted by the sun or stay home'],
    cloudy: ['My mood is as unpredictable as the weather', 'Even my shadow is gray without sunshine', 'Cloudy days are for daydreaming'],
    fog: ['Everything is white, can\'t see a thing', 'The fog is so thick', 'Walking in the fog and getting lost'],
    'clear-night': ['So many stars, this crayfish is sleepy', 'Good night world, good night crayfish', 'The moonlight is beautiful tonight']
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

// ============ 银河系背景 ============
const galaxyStars = [];
let galaxyTime = 0;

function initGalaxy() {
  for (let i = 0; i < 150; i++) {
    galaxyStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 0.5 + Math.random() * 1.5,
      speed: 0.2 + Math.random() * 0.3,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.02,
      hue: 200 + Math.random() * 60
    });
  }
}
initGalaxy();

const shootingStars = [];

function drawGalaxy() {
  galaxyTime += 0.005;

  // 银河光晕
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.save();
  for (let r = Math.max(canvas.width, canvas.height); r > 0; r -= 80) {
    const alpha = 0.015 + (1 - r / Math.max(canvas.width, canvas.height)) * 0.02;
    const rotation = galaxyTime * 0.05;
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(
      cx + Math.cos(rotation) * 30, cy + Math.sin(rotation) * 30, r * 0.2,
      cx, cy, r
    );
    grad.addColorStop(0, 'rgba(100, 80, 150, 0.5)');
    grad.addColorStop(0.5, 'rgba(60, 40, 100, 0.3)');
    grad.addColorStop(1, 'rgba(20, 20, 50, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();

  // 星星
  galaxyStars.forEach(star => {
    star.twinkle += star.twinkleSpeed;
    const alpha = 0.3 + 0.4 * Math.abs(Math.sin(star.twinkle));
    const size = star.size * (0.8 + 0.3 * Math.sin(star.twinkle));

    ctx.save();
    ctx.globalAlpha = alpha;

    const starGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 2);
    starGrad.addColorStop(0, `hsla(${star.hue}, 80%, 90%, 1)`);
    starGrad.addColorStop(0.5, `hsla(${star.hue}, 70%, 70%, 0.5)`);
    starGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = starGrad;
    ctx.beginPath();
    ctx.arc(star.x, star.y, size * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    star.x += star.speed * 0.05;
    if (star.x > canvas.width + 10) {
      star.x = -10;
      star.y = Math.random() * canvas.height;
    }
  });
}

function updateShootingStars() {
  if (Math.random() < 0.002) {
    shootingStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.3,
      length: 60 + Math.random() * 40,
      speed: 6 + Math.random() * 4,
      angle: Math.PI * 0.25 + Math.random() * 0.1,
      life: 1
    });
  }

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    s.life -= 0.015;
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
      s.x - Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(200, 220, 255, 0.8)');
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ============ 粒子系统 ============
function initWeather(type) {
  particles = [];
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
  console.log(`[Weather] ${type} particles:`, particles.length);
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
  for (let i = 0; i < 16; i++) {
    particles.push({
      angle: (i / 16) * Math.PI * 2,
      speed: 0.006,
      rayLength: 80 + Math.random() * 60,
      opacity: 0.2 + Math.random() * 0.15
    });
  }
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
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: Math.random() * canvas.width * 1.5,
      y: Math.random() * canvas.height,
      width: 200 + Math.random() * 300,
      height: 100 + Math.random() * 80,
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
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7,
      radius: 0.5 + Math.random() * 2,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.025 + Math.random() * 0.03,
      opacity: 0.4 + Math.random() * 0.5
    });
  }
  particles.push({
    isMoon: true,
    x: canvas.width * 0.8,
    y: canvas.height * 0.15,
    radius: 35
  });
}

// ============ 绘制 ============
let thunderFlash = 0;

function draw() {
  if (!canvas.width || !canvas.height) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 银河背景
  drawGalaxy();
  updateShootingStars();
  renderShootingStars();

  // 天气粒子
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
    ctx.strokeStyle = `hsla(${p.hue}, 70%, 70%, 0.8)`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 2, p.y + p.length);
    ctx.stroke();
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
    ctx.strokeStyle = `hsla(${p.hue}, 70%, 75%, 0.9)`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y + p.length);
    ctx.stroke();
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

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0, 'rgba(255, 230, 120, 0.8)');
  grad.addColorStop(0.3, 'rgba(255, 200, 80, 0.4)');
  grad.addColorStop(0.7, 'rgba(255, 150, 50, 0.15)');
  grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    if (p.isGlow) {
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
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.width * 0.5);
    grad.addColorStop(0, 'rgba(120, 130, 145, 0.4)');
    grad.addColorStop(0.5, 'rgba(100, 110, 125, 0.25)');
    grad.addColorStop(1, 'rgba(80, 90, 105, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.width * 0.5, p.height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    p.x += p.speed;
    if (p.x > canvas.width + p.width) {
      p.x = -p.width;
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
      ctx.save();
      ctx.shadowBlur = 40;
      ctx.shadowColor = 'rgba(255, 255, 200, 0.5)';
      ctx.globalAlpha = 0.95;
      const moonGrad = ctx.createRadialGradient(p.x - 10, p.y - 10, 0, p.x, p.y, p.radius);
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
    showError('Geolocation not supported');
    return;
  }

  locateBtn.textContent = '⏳';
  locateBtn.style.opacity = '0.6';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoRes.json();
        const cityName = geoData && geoData.length > 0 ? geoData[0].name : 'Current Location';

        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=zh_cn`
        );
        const weatherData = await weatherRes.json();

        if (weatherData.cod !== 200) {
          showError('Failed to get weather');
          return;
        }

        const { temp, feels_like, humidity } = weatherData.main;
        const { description, icon } = weatherData.weather[0];
        const { speed: windSpeed } = weatherData.wind;
        const { visibility } = weatherData;
        const code = iconToCode(icon);

        tempEl.textContent = `${Math.round(temp)}°`;
        descEl.textContent = description;
        cityEl.textContent = cityName;
        feelsLikeEl.textContent = `Feels like ${Math.round(feels_like)}°`;
        weatherIconEl.textContent = getWeatherIcon(icon);
        humidityEl.textContent = `${humidity}%`;
        windEl.textContent = `${Math.round(windSpeed * 3.6)} km/h`;
        uvEl.textContent = getUVLevel(windSpeed);
        visibilityEl.textContent = `${(visibility / 1000).toFixed(1)} km`;
        locationInput.value = cityName;

        setWeather(code);
      } catch (e) {
        showError('Failed to get weather');
      }
      locateBtn.textContent = '📍';
      locateBtn.style.opacity = '1';
    },
    () => {
      showError('Location failed');
      locateBtn.textContent = '📍';
      locateBtn.style.opacity = '1';
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// ============ 启动 ============
draw();
currentWeather = 'sunny';
initWeather('sunny');
fetchWeather('Beijing');

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

locateBtn.addEventListener('click', getCurrentLocation);

speakBtn.addEventListener('click', () => {
  if (cityEl.textContent === '--') {
    showError('Get weather first');
    return;
  }
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    speakBtn.textContent = '🔊';
  } else {
    announceWeather();
    speakBtn.textContent = '🔇';
    window.speechSynthesis.onend = () => { speakBtn.textContent = '🔊'; };
  }
});

refreshBtn.addEventListener('click', () => {
  const city = locationInput.value.trim() || 'Beijing';
  refreshBtn.classList.add('spinning');
  fetchWeather(city).finally(() => {
    setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
  });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('SW registered'))
    .catch((err) => console.log('SW failed:', err));
}
