/* =============================================
   虾天气 - Weather Crayfish App
   ============================================= */

const canvas = document.getElementById('weatherCanvas');
const ctx = canvas.getContext('2d');
const crayfish = document.getElementById('crayfish');
const moodText = document.getElementById('moodText');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const cityEl = document.getElementById('city');
const updateTimeEl = document.getElementById('updateTime');

let particles = [];
let weatherType = 'default';
let lastWeather = '';

// ============ 天气数据获取（Open-Meteo）============

const WMO_DESC = {
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
  95: '雷暴', 96: '雷暴+小冰雹', 99: '雷暴+大冰雹'
};

async function fetchWeather(location) {
  try {
    // 1. 城市名 → 经纬度
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=zh`
    );
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      showError('找不到这个城市，换个名字试试？');
      return false;
    }
    const { latitude, longitude, name, country } = geoData.results[0];

    // 2. 获取天气
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto&language=zh`
    );
    const weatherData = await weatherRes.json();
    const current = weatherData.current;
    const tempC = Math.round(current.temperature_2m);
    const code = current.weather_code;

    tempEl.textContent = `${tempC}°`;
    descEl.textContent = WMO_DESC[code] || '未知';
    cityEl.textContent = `${name}, ${country}`;

    const now = new Date();
    updateTimeEl.textContent = `更新 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    updateWeather(code, tempC);
    return true;
  } catch (e) {
    showError('获取天气失败');
    return false;
  }
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-msg';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ============ 天气码映射（Open-Meteo WMO）============

function updateWeather(code, temp) {
  // WMO code: https://open-meteo.com/en/docs
  if ([95, 96, 99].includes(code)) {
    setWeather('thunder', temp);
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    setWeather('snow', temp);
  } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    setWeather('rain', temp);
  } else if ([45, 48].includes(code)) {
    setWeather('fog', temp);
  } else if ([2, 3].includes(code)) {
    setWeather('cloudy', temp);
  } else if ([0, 1].includes(code)) {
    const hour = new Date().getHours();
    setWeather(hour >= 6 && hour < 19 ? 'sunny' : 'clear-night', temp);
  } else {
    setWeather('default', temp);
  }
}

// ============ 天气状态切换 ============

function setWeather(type, temp) {
  if (lastWeather === type) return;
  lastWeather = type;
  weatherType = type;
  particles = [];

  // 移除旧状态
  document.body.className = '';
  crayfish.className = 'crayfish';

  const slogans = {
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
      'ᐅ’’☃️堆个雪人不难，难的是堆一个像我的',
      '雪花飘呀飘，本虾在发呆',
      '冷到打字都在颤抖，伸手都是冒险',
      '下雪不冷化雪冷，这话谁说的站出来'
    ],
    sunny: [
      '今天天气好炸了，心情也跟着炸',
      '阳光治愈一切，不接受反驳',
      '出门被晒化，不出门被懒化，选哪个',
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
      '晚安世界，晚安虾虾🌙',
      '今晚月色真美，风也温柔',
      '睡个好觉，明天继续元气满满',
      '星星眨眼睛，像在说晚安'
    ]
  };

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  switch (type) {
    case 'rain':
      document.body.className = 'bg-rain';
      crayfish.className = 'crayfish rain';
      moodText.textContent = pick(slogans.rain);
      initRain();
      break;
    case 'thunder':
      document.body.className = 'bg-thunder';
      crayfish.className = 'crayfish thunder';
      moodText.textContent = pick(slogans.thunder);
      initThunder();
      break;
    case 'snow':
      document.body.className = 'bg-snow';
      crayfish.className = 'crayfish cloudy';
      moodText.textContent = pick(slogans.snow);
      initSnow();
      break;
    case 'sunny':
      document.body.className = 'bg-sunny';
      crayfish.className = 'crayfish sunny';
      moodText.textContent = temp > 30 ? pick(slogans.sunny) : pick(slogans.sunny);
      initSunny();
      break;
    case 'cloudy':
      document.body.className = 'bg-cloudy';
      crayfish.className = 'crayfish cloudy';
      moodText.textContent = pick(slogans.cloudy);
      initCloudy();
      break;
    case 'fog':
      document.body.className = 'bg-fog';
      crayfish.className = 'crayfish cloudy';
      moodText.textContent = pick(slogans.fog);
      initFog();
      break;
    case 'clear-night':
      document.body.className = 'bg-clear-night';
      crayfish.className = 'crayfish';
      moodText.textContent = pick(slogans['clear-night']);
      initClearNight();
      break;
    default:
      crayfish.className = 'crayfish';
      moodText.textContent = '感受天气中...';
      break;
  }
}

// ============ 粒子系统 ============

function initRain() {
  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 8 + Math.random() * 8,
      length: 15 + Math.random() * 20,
      opacity: 0.3 + Math.random() * 0.5
    });
  }
}

function initSnow() {
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 1 + Math.random() * 2,
      radius: 2 + Math.random() * 4,
      wobble: Math.random() * Math.PI * 2,
      opacity: 0.5 + Math.random() * 0.5
    });
  }
}

function initSunny() {
  for (let i = 0; i < 8; i++) {
    particles.push({
      angle: (i / 8) * Math.PI * 2,
      radius: 0,
      speed: 0.005,
      rayLength: 60 + Math.random() * 40,
      opacity: 0.15 + Math.random() * 0.1
    });
  }
}

function initCloudy() {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: 50 + Math.random() * 200,
      width: 150 + Math.random() * 200,
      height: 60 + Math.random() * 40,
      speed: 0.2 + Math.random() * 0.3,
      opacity: 0.2 + Math.random() * 0.2
    });
  }
}

function initFog() {
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 80 + Math.random() * 150,
      speed: 0.3 + Math.random() * 0.3,
      opacity: 0.08 + Math.random() * 0.1
    });
  }
}

function initThunder() {
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 12 + Math.random() * 12,
      length: 20 + Math.random() * 30,
      opacity: 0.4 + Math.random() * 0.4
    });
  }
}

function initClearNight() {
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 1 + Math.random() * 2,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.03,
      opacity: 0.4 + Math.random() * 0.6
    });
  }
}

// ============ 画布重绘 ============

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let thunderFlash = 0;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (weatherType) {
    case 'rain': drawRain(); break;
    case 'snow': drawSnow(); break;
    case 'sunny': drawSunny(); break;
    case 'cloudy': drawCloudy(); break;
    case 'fog': drawFog(); break;
    case 'thunder': drawThunder(); break;
    case 'clear-night': drawClearNight(); break;
  }

  requestAnimationFrame(draw);
}

function drawRain() {
  ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
  ctx.lineWidth = 1.5;
  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 1, p.y + p.length);
    ctx.stroke();
    p.y += p.speed;
    if (p.y > canvas.height) {
      p.y = -p.length;
      p.x = Math.random() * canvas.width;
    }
  });
  ctx.globalAlpha = 1;
}

function drawSnow() {
  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    p.wobble += 0.02;
    p.x += Math.sin(p.wobble) * 0.5;
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
  const cy = 120;
  const maxR = Math.min(canvas.width, canvas.height) * 0.35;

  // 光晕
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0, 'rgba(255, 220, 100, 0.6)');
  grad.addColorStop(0.4, 'rgba(255, 180, 50, 0.2)');
  grad.addColorStop(1, 'rgba(255, 150, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 射线
  particles.forEach(p => {
    p.angle += p.speed;
    const outerX = cx + Math.cos(p.angle) * maxR * 0.8;
    const outerY = cy + Math.sin(p.angle) * maxR * 0.8;
    const innerX = cx + Math.cos(p.angle) * (maxR * 0.3);
    const innerY = cy + Math.sin(p.angle) * (maxR * 0.3);
    ctx.globalAlpha = p.opacity;
    ctx.strokeStyle = 'rgba(255, 220, 100, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(outerX, outerY);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function drawCloudy() {
  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.width * 0.6);
    grad.addColorStop(0, 'rgba(200, 200, 220, 0.6)');
    grad.addColorStop(1, 'rgba(150, 150, 170, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.width * 0.6, p.height * 0.5, 0, 0, Math.PI * 2);
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
    grad.addColorStop(0, 'rgba(180, 180, 190, 0.4)');
    grad.addColorStop(1, 'rgba(180, 180, 190, 0)');
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

function drawThunder() {
  // 雨
  ctx.strokeStyle = 'rgba(100, 120, 200, 0.6)';
  ctx.lineWidth = 1.5;
  particles.forEach(p => {
    ctx.globalAlpha = p.opacity;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.5, p.y + p.length);
    ctx.stroke();
    p.y += p.speed;
    if (p.y > canvas.height) {
      p.y = -p.length;
      p.x = Math.random() * canvas.width;
    }
  });

  // 闪电
  if (Math.random() < 0.008) {
    thunderFlash = 8;
  }
  if (thunderFlash > 0) {
    ctx.globalAlpha = thunderFlash / 8 * 0.3;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    thunderFlash--;
  }
  ctx.globalAlpha = 1;
}

function drawClearNight() {
  particles.forEach(p => {
    p.twinkle += p.speed;
    const alpha = p.opacity * (0.4 + 0.6 * Math.abs(Math.sin(p.twinkle)));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ============ 初始化 ============

draw();

// 默认加载
fetchWeather('北京');

// 搜索
document.getElementById('searchBtn').addEventListener('click', () => {
  const loc = document.getElementById('locationInput').value.trim();
  if (loc) fetchWeather(loc);
});

document.getElementById('locationInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const loc = e.target.value.trim();
    if (loc) fetchWeather(loc);
  }
});

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
