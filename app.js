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
  utterance.lang = 'zh-CN';
  utterance.rate = 1.1;
  utterance.pitch = 1.2;

  // 尝试找中文语音
  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.includes('zh'));
  if (zhVoice) {
    utterance.voice = zhVoice;
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

  const text = `${city}，现在${desc}，气温${temp}。${mood}`;
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
      '雨好大，像依萍去找她爸要钱那天一样',
      '这雨下得比我减肥的决心还大',
      '下雨天和睡觉最配了，别的都不行',
      '撑伞走在雨中，我就是这条街最靓的虾',
      '雨：我不针对谁，在座各位都得湿'
    ],
    thunder: [
      '这雷声，开最大声都盖不住',
      '谁在渡劫！等等我不是妖精啊',
      '怕怕！抱紧我的小被子先',
      '男朋友都可以不要，雷必须躲',
      '躲被窝里就安全了…吧？'
    ],
    snow: [
      '下雪好浪漫，除了出门的时候',
      '堆个雪人不难，难的是堆一个像我的',
      '雪花飘呀飘，本虾在发呆',
      '冷到打字都在颤抖，伸手都是冒险',
      '下雪不冷化雪冷，这话谁说的站出来'
    ],
    sunny: [
      '今天天气好炸了，心情也跟着炸',
      '阳光治愈一切，不接受反驳',
      '出门被晒化，不出门被懒化',
      '阳光余额充足，请放心使用',
      '这太阳，晒被子第一名'
    ],
    cloudy: [
      '心情像天气一样，阴晴不定…',
      '没有阳光的日子，连影子都是灰的',
      '阴天嘛，适合发呆和想太多',
      '天上云层厚，本虾emo了',
      '今天的我：想躺、想宅、想摸鱼'
    ],
    fog: [
      '前方白茫茫，什么都看不清…',
      '这雾浓得，连虾的眼睛都不亮了',
      '在雾里走着走着就…迷路了',
      '伸手不见五指，本虾怕怕',
      '这雾，滤镜都省了'
    ],
    'clear-night': [
      '星星好多，夜深了虾也困了',
      '晚安世界，晚安虾虾',
      '今晚月色真美，风也温柔',
      '睡个好觉，明天继续元气满满',
      '星星眨眼睛，像在说晚安'
    ]
  };

  const arr = map[type] || ['感受天气中...'];
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

  switch (type) {
    case 'rain': initRain(); break;
    case 'thunder': initThunder(); break;
    case 'snow': initSnow(); break;
    case 'sunny': initSunny(); break;
    case 'cloudy': initCloudy(); break;
    case 'fog': initFog(); break;
    case 'clear-night': initClearNight(); break;
    default: break;
  }
}

function initRain() {
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 10 + Math.random() * 10,
      length: 15 + Math.random() * 25,
      opacity: 0.3 + Math.random() * 0.4
    });
  }
}

function initThunder() {
  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 14 + Math.random() * 14,
      length: 20 + Math.random() * 35,
      opacity: 0.4 + Math.random() * 0.4
    });
  }
}

function initSnow() {
  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 1 + Math.random() * 2.5,
      radius: 2 + Math.random() * 5,
      wobble: Math.random() * Math.PI * 2,
      opacity: 0.5 + Math.random() * 0.5
    });
  }
}

function initSunny() {
  for (let i = 0; i < 12; i++) {
    particles.push({
      angle: (i / 12) * Math.PI * 2,
      speed: 0.008,
      rayLength: 80 + Math.random() * 50,
      opacity: 0.15 + Math.random() * 0.1
    });
  }
  // 光晕粒子
  for (let i = 0; i < 30; i++) {
    particles.push({
      isGlow: true,
      angle: Math.random() * Math.PI * 2,
      radius: 20 + Math.random() * 60,
      speed: 0.02 + Math.random() * 0.02,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.4
    });
  }
}

function initCloudy() {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: Math.random() * canvas.width * 1.5,
      y: 80 + Math.random() * 250,
      width: 180 + Math.random() * 250,
      height: 70 + Math.random() * 50,
      speed: 0.25 + Math.random() * 0.35,
      opacity: 0.15 + Math.random() * 0.2
    });
  }
}

function initFog() {
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 100 + Math.random() * 200,
      speed: 0.35 + Math.random() * 0.35,
      opacity: 0.06 + Math.random() * 0.08
    });
  }
}

function initClearNight() {
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7,
      radius: 0.5 + Math.random() * 2.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.025 + Math.random() * 0.035,
      opacity: 0.3 + Math.random() * 0.7
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

// ============ 绘制 ============

let thunderFlash = 0;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (currentWeather) {
    case 'rain': drawRain(); break;
    case 'thunder': drawThunder(); break;
    case 'snow': drawSnow(); break;
    case 'sunny': drawSunny(); break;
    case 'cloudy': drawCloudy(); break;
    case 'fog': drawFog(); break;
    case 'clear-night': drawClearNight(); break;
  }

  requestAnimationFrame(draw);
}

function drawRain() {
  ctx.strokeStyle = 'rgba(174, 194, 224, 0.6)';
  ctx.lineWidth = 1.5;

  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 1.5, p.y + p.length);
    ctx.stroke();

    p.y += p.speed;
    p.x += 0.5;
    if (p.y > canvas.height) {
      p.y = -p.length;
      p.x = Math.random() * canvas.width;
    }
  });

  ctx.globalAlpha = 1;
}

function drawThunder() {
  ctx.strokeStyle = 'rgba(120, 140, 200, 0.7)';
  ctx.lineWidth = 1.5;

  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 1, p.y + p.length);
    ctx.stroke();

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
    ctx.globalAlpha = (thunderFlash / 10) * 0.25;
    ctx.fillStyle = '#e8e8ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    thunderFlash--;
  }

  ctx.globalAlpha = 1;
}

function drawSnow() {
  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    p.wobble += 0.03;
    p.x += Math.sin(p.wobble) * 0.8;
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
  grad.addColorStop(0, 'rgba(255, 230, 120, 0.7)');
  grad.addColorStop(0.3, 'rgba(255, 200, 80, 0.3)');
  grad.addColorStop(0.7, 'rgba(255, 150, 50, 0.1)');
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
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = 'rgba(255, 220, 100, 0.6)';
      ctx.beginPath();
      ctx.arc(gx, gy, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 射线
      p.angle += p.speed;
      const outerX = cx + Math.cos(p.angle) * maxR * 0.85;
      const outerY = cy + Math.sin(p.angle) * maxR * 0.85;
      const innerX = cx + Math.cos(p.angle) * (maxR * 0.35);
      const innerY = cy + Math.sin(p.angle) * (maxR * 0.35);
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = 'rgba(255, 220, 100, 0.7)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }
  });

  ctx.globalAlpha = 1;
}

function drawCloudy() {
  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    const grad = ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, p.width * 0.5
    );
    grad.addColorStop(0, 'rgba(180, 185, 200, 0.5)');
    grad.addColorStop(1, 'rgba(140, 145, 160, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.width * 0.5, p.height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    p.x += p.speed;
    if (p.x > canvas.width + p.width) {
      p.x = -p.width;
    }
  });
  ctx.globalAlpha = 1;
}

function drawFog() {
  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
    grad.addColorStop(0, 'rgba(160, 165, 175, 0.3)');
    grad.addColorStop(1, 'rgba(160, 165, 175, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

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
      // 月亮
      ctx.globalAlpha = 0.9;
      const moonGrad = ctx.createRadialGradient(
        p.x - 10, p.y - 10, 0,
        p.x, p.y, p.radius
      );
      moonGrad.addColorStop(0, 'rgba(255, 255, 230, 1)');
      moonGrad.addColorStop(0.8, 'rgba(255, 245, 200, 0.9)');
      moonGrad.addColorStop(1, 'rgba(255, 230, 150, 0.7)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      p.twinkle += p.speed;
      const alpha = p.opacity * (0.3 + 0.7 * Math.abs(Math.sin(p.twinkle)));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
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

// 启动动画循环
draw();

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

  const text = `${city}，现在${desc}，气温${temp}。${mood}`;

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
