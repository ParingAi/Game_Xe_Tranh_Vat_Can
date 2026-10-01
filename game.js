(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreNode = document.getElementById('score');
  const livesNode = document.getElementById('lives');
  const levelNode = document.getElementById('level');
  const moneyNode = document.getElementById('money');
  const experienceFill = document.getElementById('experience-fill');
  const experienceLabel = document.getElementById('experience-label');
  const highScoreNode = document.getElementById('high-score');
  const startRecordNode = document.getElementById('start-record');
  const startScreen = document.getElementById('start-screen');
  const gameOverScreen = document.getElementById('game-over-screen');
  const pauseScreen = document.getElementById('pause-screen');
  const shopScreen = document.getElementById('shop-screen');
  const toastNode = document.getElementById('toast');
  const newRecordNode = document.getElementById('new-record');
  const carListNode = document.getElementById('car-list');
  const playerNameInput = document.getElementById('player-name');
  const laneCenters = [130, 210, 290];
  const road = { left: 86, right: 334 };
  const STORAGE_KEY = 'dua-xe-ne-bom-high-score';
  const GARAGE_KEY = 'dua-xe-ne-bom-garage';
  const CARS = [
    { id: 'racer-red', type: 'car', name: 'Tia Chớp', price: 0, body: '#f45245', trim: '#87372f', glass: '#a8edf0', skill: 'Xe cơ bản' },
    { id: 'racer-blue', type: 'car', name: 'Đại Dương', price: 45, body: '#3284e8', trim: '#174a91', glass: '#c0f5ff', skill: 'Xe cơ bản' },
    { id: 'racer-yellow', type: 'car', name: 'Ong Vàng', price: 90, body: '#ffc83d', trim: '#a76b14', glass: '#e0faff', shieldHits: 1, skill: 'Khiên chặn 1 va chạm' },
    { id: 'racer-mint', type: 'car', name: 'Bạc Hà', price: 140, body: '#40c99b', trim: '#18765b', glass: '#c3fff0', shieldHits: 1, coinBonus: 1, skill: 'Khiên 1 lần + thêm 1 xu mỗi túi' },
    { id: 'racer-night', type: 'car', name: 'Bóng Đêm', price: 210, body: '#59657f', trim: '#293245', glass: '#d2efff', shieldHits: 2, skill: 'Khiên chặn 2 va chạm' },
    { id: 'scooter-free', type: 'motorcycle', name: 'Xe Máy Nhí', price: 0, body: '#ff824d', trim: '#a5442b', glass: '#c5f5ff', skill: 'Xe cơ bản' },
    { id: 'moto-blue', type: 'motorcycle', name: 'Gió Biển', price: 40, body: '#3689ef', trim: '#174a91', glass: '#c0f5ff', coinBonus: 1, skill: 'Thêm 1 xu mỗi túi' },
    { id: 'moto-red', type: 'motorcycle', name: 'Đường Đua', price: 85, body: '#e84b55', trim: '#8f2637', glass: '#d5faff', shieldHits: 1, skill: 'Khiên chặn 1 va chạm' },
    { id: 'moto-gold', type: 'motorcycle', name: 'Sấm Sét', price: 145, body: '#f3bd35', trim: '#956014', glass: '#d5faff', shieldHits: 1, coinBonus: 1, skill: 'Khiên 1 lần + thêm 1 xu mỗi túi' },
    { id: 'moto-neon', type: 'motorcycle', name: 'Neon X', price: 210, body: '#9c63df', trim: '#4b2b84', glass: '#c5f5ff', shieldHits: 2, skill: 'Khiên chặn 2 va chạm' }
  ];
  const items = [];
  const scenery = [];
  const particles = [];
  const keys = new Set();
  let state = 'ready';
  let score = 0;
  let lives = 3;
  let level = 1;
  let money = loadGarage().money;
  let selectedCarId = loadGarage().selected;
  let ownedCars = new Set(loadGarage().owned);
  let playerName = loadPlayerName();
  let shopCategory = 'car';
  let combo = 0;
  let bestCombo = 0;
  let elapsed = 0;
  let spawnTimer = 0;
  let roadOffset = 0;
  let lastTime = 0;
  let invulnerable = 0;
  let shieldsRemaining = 0;
  let shake = 0;
  let toastTimer = 0;
  let newRecord = false;
  let highScore = loadHighScore();
  let audioContext;
  const car = { lane: 1, x: laneCenters[1], y: 548, radius: 25 };

  function loadHighScore() {
    try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; }
    catch { return 0; }
  }

  function loadGarage() {
    try {
      const saved = JSON.parse(localStorage.getItem(GARAGE_KEY));
      if (saved && Number.isFinite(saved.money) && Array.isArray(saved.owned)) {
        return {
          money: Math.max(0, Math.floor(saved.money)),
          selected: typeof saved.selected === 'string' ? saved.selected : 'racer-red',
          owned: [...new Set(['racer-red', 'scooter-free', ...saved.owned.filter((id) => CARS.some((carOption) => carOption.id === id))])]
        };
      }
    } catch { /* Start with the default garage if storage is unavailable. */ }
    return { money: 60, selected: 'racer-red', owned: ['racer-red', 'scooter-free'] };
  }

  function loadPlayerName() {
    try { return (localStorage.getItem('dua-xe-ne-bom-player-name') || '').trim().slice(0, 18); }
    catch { return ''; }
  }

  function saveGarage() {
    try {
      localStorage.setItem(GARAGE_KEY, JSON.stringify({ money, selected: selectedCarId, owned: [...ownedCars] }));
    } catch { /* Keep the current session playable if storage is unavailable. */ }
  }

  function selectedCar() {
    return CARS.find((carOption) => carOption.id === selectedCarId) || CARS[0];
  }

  function updateRecordDisplay() {
    highScoreNode.textContent = String(highScore);
    startRecordNode.textContent = String(highScore);
    moneyNode.textContent = String(money);
    document.getElementById('garage-money').textContent = `🪙 ${money}`;
    document.getElementById('shop-money').textContent = String(money);
    playerNameInput.value = playerName;
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(420 * ratio);
    canvas.height = Math.round(640 * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function playTone(kind) {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      const tones = {
        coin: [740, 1175, 'sine', .13],
        star: [880, 1480, 'triangle', .2],
        hit: [170, 55, 'sawtooth', .24],
        level: [520, 1040, 'triangle', .28],
        over: [330, 95, 'sine', .3]
      };
      const [from, to, type, duration] = tones[kind];
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, to), now + duration);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.12, now + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.start(now);
      oscillator.stop(now + duration + .01);
    } catch { /* Audio is optional; gameplay continues without it. */ }
  }

  function updateHud() {
    scoreNode.textContent = String(score);
    livesNode.textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    levelNode.textContent = String(level);
    const progress = score % 250;
    experienceFill.style.width = `${(progress / 250) * 100}%`;
    experienceLabel.textContent = `${progress} / 250 EXP`;
  }

  function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    combo = 0;
    bestCombo = 0;
    elapsed = 0;
    spawnTimer = .5;
    roadOffset = 0;
    invulnerable = 0;
    shieldsRemaining = selectedCar().shieldHits || 0;
    shake = 0;
    car.lane = 1;
    car.x = laneCenters[1];
    items.length = 0;
    particles.length = 0;
    newRecord = false;
    updateHud();
    updateRecordDisplay();
    startScreen.classList.add('is-hidden');
    gameOverScreen.classList.add('is-hidden');
    pauseScreen.classList.add('is-hidden');
    shopScreen.classList.add('is-hidden');
    document.getElementById('pause-button').classList.add('is-visible');
    state = 'playing';
    lastTime = performance.now();
    playTone('level');
  }

  function finishGame() {
    state = 'over';
    document.getElementById('pause-button').classList.remove('is-visible');
    document.getElementById('final-score').textContent = String(score);
    document.getElementById('final-level').textContent = String(level);
    document.getElementById('final-combo').textContent = String(bestCombo);
    document.getElementById('final-player-name').textContent = playerName || 'bạn';
    newRecordNode.classList.toggle('is-hidden', !newRecord);
    gameOverScreen.classList.remove('is-hidden');
    playTone('over');
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    document.getElementById('pause-button').classList.remove('is-visible');
    pauseScreen.classList.remove('is-hidden');
  }

  function resumeGame() {
    if (state !== 'paused') return;
    state = 'playing';
    document.getElementById('pause-button').classList.add('is-visible');
    lastTime = performance.now();
    pauseScreen.classList.add('is-hidden');
  }

  function exitToMenu() {
    state = 'ready';
    document.getElementById('pause-button').classList.remove('is-visible');
    pauseScreen.classList.add('is-hidden');
    shopScreen.classList.add('is-hidden');
    gameOverScreen.classList.add('is-hidden');
    startScreen.classList.remove('is-hidden');
    updateRecordDisplay();
  }

  function openShop() {
    renderCars();
    startScreen.classList.add('is-hidden');
    shopScreen.classList.remove('is-hidden');
  }

  function closeShop() {
    shopScreen.classList.add('is-hidden');
    if (state === 'paused') pauseScreen.classList.remove('is-hidden');
    else startScreen.classList.remove('is-hidden');
  }

  function renderCars() {
    document.getElementById('shop-money').textContent = String(money);
    carListNode.replaceChildren();
    const visibleCars = CARS.filter((carOption) => carOption.type === shopCategory);
    for (const carOption of visibleCars) {
      const card = document.createElement('article');
      card.className = 'car-card';
      const preview = document.createElement('div');
      preview.className = 'car-preview';
      preview.style.setProperty('--car-color', carOption.body);
      preview.style.setProperty('--car-trim', carOption.trim);
      preview.setAttribute('aria-hidden', 'true');
      preview.textContent = carOption.type === 'motorcycle' ? '🏍️' : '🚘';
      const detail = document.createElement('div');
      detail.className = 'car-detail';
      const name = document.createElement('strong');
      name.textContent = carOption.name;
      const price = document.createElement('span');
      price.textContent = ownedCars.has(carOption.id) ? 'Đã sở hữu' : `🪙 ${carOption.price}`;
      const skill = document.createElement('span');
      skill.className = 'car-skill';
      skill.textContent = `✨ ${carOption.skill}`;
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'car-action';
      action.textContent = selectedCarId === carOption.id ? 'ĐANG CHỌN' : ownedCars.has(carOption.id) ? 'CHỌN XE' : 'MUA XE';
      action.disabled = selectedCarId === carOption.id || (!ownedCars.has(carOption.id) && money < carOption.price);
      action.addEventListener('click', () => {
        if (ownedCars.has(carOption.id)) selectedCarId = carOption.id;
        else if (money >= carOption.price) {
          money -= carOption.price;
          ownedCars.add(carOption.id);
          selectedCarId = carOption.id;
        }
        saveGarage();
        updateRecordDisplay();
        renderCars();
      });
      detail.append(name, price, skill);
      card.append(preview, detail, action);
      carListNode.append(card);
    }
  }

  function moveCar(direction) {
    if (state !== 'playing') return;
    car.lane = Math.max(0, Math.min(2, car.lane + direction));
  }

  function toast(text) {
    toastNode.textContent = text;
    toastNode.classList.remove('show');
    void toastNode.offsetWidth;
    toastNode.classList.add('show');
    toastTimer = .95;
  }

  function addScore(amount) {
    score += amount;
    if (score > highScore) {
      highScore = score;
      newRecord = true;
      try { localStorage.setItem(STORAGE_KEY, String(highScore)); }
      catch { /* The game remains playable when storage is unavailable. */ }
      updateRecordDisplay();
    }
    const nextLevel = 1 + Math.floor(score / 250);
    if (nextLevel > level) {
      level = nextLevel;
      toast(`🎉 LEVEL UP!  🔥 LEVEL ${level}`);
      playTone('level');
    }
    updateHud();
  }

  function collect(item) {
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    const base = item.type === 'star' ? 30 : 10;
    const bonus = combo > 1 ? Math.floor(base * Math.min(combo - 1, 8) * .15) : 0;
    const previousLevel = level;
    let coinAward = 0;
    if (item.type === 'coin') {
      coinAward = 1 + (selectedCar().coinBonus || 0);
      money += coinAward;
      saveGarage();
      updateRecordDisplay();
    }
    addScore(base + bonus);
    if (level === previousLevel) {
      toast(`+${base + bonus} ${item.type === 'star' ? '⭐' : '💰'}${item.type === 'coin' ? `  +${coinAward} 🪙` : ''}${combo > 1 ? `  COMBO x${combo}` : ''}`);
    }
    playTone(item.type);
    burst(item.x, item.y, item.type === 'star' ? '#ffe16d' : '#fff3a5', 8);
  }

  function hitHazard(item) {
    if (shieldsRemaining > 0) {
      shieldsRemaining -= 1;
      invulnerable = 1.25;
      shake = .2;
      toast(`🛡️ ĐỠ ĐÒN! CÒN ${shieldsRemaining}`);
      playTone('hit');
      burst(car.x, car.y, '#ffe16d', 15);
      return;
    }
    lives -= 1;
    combo = 0;
    invulnerable = 1.25;
    shake = .38;
    toast('💥 -1 ❤️');
    playTone('hit');
    burst(car.x, car.y, '#ff765d', 15);
    updateHud();
    if (lives <= 0) finishGame();
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 150;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .45 + Math.random() * .45, maxLife: .9, color, size: 3 + Math.random() * 4 });
    }
  }

  function spawnItem() {
    const roll = Math.random();
    let type;
    if (roll < .47) type = 'coin';
    else if (roll < .60) type = 'star';
    else if (roll < Math.min(.79 + (level - 1) * .035, .9)) type = 'bomb';
    else type = ['rock', 'barrier', 'barrel'][Math.floor(Math.random() * 3)];
    const lane = Math.floor(Math.random() * 3);
    const lastItem = items[items.length - 1];
    if (lastItem && lastItem.lane === lane && lastItem.y < 100) {
      return spawnItem();
    }
    const isHazard = type !== 'coin' && type !== 'star';
    const blurChance = level < 4 ? 0 : Math.min(.12 + (level - 4) * .09, .72);
    items.push({
      type,
      lane,
      x: laneCenters[lane],
      y: -45,
      size: type === 'barrier' ? 30 : 25,
      rotation: 0,
      passed: false,
      blurred: isHazard && Math.random() < blurChance,
      blurAmount: Math.min(.75 + Math.max(0, level - 4) * .18, 2.4)
    });
  }

  function seedScenery() {
    for (let i = 0; i < 22; i += 1) {
      scenery.push({ y: Math.random() * 640, side: i % 2 === 0 ? 'left' : 'right', x: 22 + Math.random() * 40, type: ['tree', 'flower', 'cloud'][i % 3], scale: .75 + Math.random() * .45 });
    }
  }

  function drawBackground(dt, speed) {
    ctx.fillStyle = '#83ce82';
    ctx.fillRect(0, 0, 420, 640);
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    for (let y = -30 + (roadOffset * .55) % 72; y < 670; y += 72) {
      ctx.fillRect(8, y, 7, 28);
      ctx.fillRect(405, y + 32, 6, 25);
    }

    for (const deco of scenery) {
      deco.y += speed * dt * (deco.type === 'cloud' ? .22 : .72);
      if (deco.y > 680) { deco.y = -35; deco.side = Math.random() < .5 ? 'left' : 'right'; deco.x = 18 + Math.random() * 45; }
      const x = deco.side === 'left' ? deco.x : 420 - deco.x;
      ctx.save();
      ctx.translate(x, deco.y);
      ctx.scale(deco.scale, deco.scale);
      ctx.font = `${deco.type === 'tree' ? 27 : 21}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(deco.type === 'tree' ? '🌳' : deco.type === 'cloud' ? '☁️' : '🌼', 0, 0);
      ctx.restore();
    }

    ctx.fillStyle = '#626c70';
    ctx.fillRect(road.left, 0, road.right - road.left, 640);
    ctx.fillStyle = '#f7f0d5';
    ctx.fillRect(road.left - 5, 0, 5, 640);
    ctx.fillRect(road.right, 0, 5, 640);
    ctx.fillStyle = '#e45f55';
    for (let y = -28 + roadOffset % 56; y < 650; y += 56) {
      ctx.fillRect(road.left - 5, y, 5, 28);
      ctx.fillRect(road.right, y + 28, 5, 28);
    }
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    const dashOffset = roadOffset % 68;
    for (const x of [170, 250]) {
      for (let y = -68 + dashOffset; y < 650; y += 68) ctx.fillRect(x - 2, y, 4, 34);
    }
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    ctx.fillRect(road.left + 8, 0, 16, 640);
  }

  function drawItem(item) {
    const symbols = { coin: '💰', star: '⭐', bomb: '💣', rock: '🪨', barrier: '🚧', barrel: '🛢️' };
    ctx.save();
    ctx.filter = item.blurred ? `blur(${item.blurAmount}px)` : 'none';
    ctx.translate(item.x, item.y);
    const badgeColors = { coin: '#ffd34e', star: '#fff1a1', bomb: '#ff8972', rock: '#d7e0dc', barrier: '#ffe0a0', barrel: '#c4e5e8' };
    ctx.beginPath();
    ctx.fillStyle = badgeColors[item.type];
    ctx.strokeStyle = '#244b45';
    ctx.lineWidth = 2.5;
    ctx.arc(0, 0, item.size + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (item.type === 'star') {
      ctx.shadowColor = '#ffe05a';
      ctx.shadowBlur = 8;
    }
    ctx.font = `${item.size * 1.65}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbols[item.type], 0, 1);
    if (item.type === 'bomb') {
      ctx.strokeStyle = 'rgba(255,235,98,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 19 + Math.sin(elapsed * 8 + item.y) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCar() {
    const paint = selectedCar();
    car.x += (laneCenters[car.lane] - car.x) * .22;
    ctx.save();
    ctx.filter = 'none';
    ctx.translate(car.x, car.y);
    ctx.rotate((laneCenters[car.lane] - car.x) * .0015);
    ctx.shadowColor = 'rgba(15, 48, 42, .42)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    if (paint.type === 'motorcycle') {
      ctx.fillStyle = '#273b3a';
      for (const y of [-22, 22]) {
        ctx.beginPath();
        ctx.ellipse(0, y, 7, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bbc9c7';
        ctx.beginPath();
        ctx.arc(0, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#273b3a';
      }
      ctx.beginPath();
      ctx.roundRect(-9, -17, 18, 35, 8);
      ctx.fillStyle = paint.body;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = paint.trim;
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-7, -4, 14, 14, 5);
      ctx.fillStyle = '#263b3a';
      ctx.fill();
      ctx.fillStyle = paint.glass;
      ctx.fillRect(-4, -15, 8, 5);
      ctx.fillStyle = '#fff2a3';
      ctx.beginPath();
      ctx.arc(0, -19, 3, 0, Math.PI * 2);
      ctx.fill();
      if (invulnerable > 0) {
        ctx.strokeStyle = '#fff3a6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 37, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#263b3a';
    ctx.fillRect(-21, -18, 7, 17);
    ctx.fillRect(14, -18, 7, 17);
    ctx.fillRect(-21, 7, 7, 17);
    ctx.fillRect(14, 7, 7, 17);
    ctx.beginPath();
    ctx.roundRect(-17, -29, 34, 58, 10);
    ctx.fillStyle = paint.body;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = paint.trim;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.roundRect(-12, -16, 24, 23, 6);
    ctx.fillStyle = paint.glass;
    ctx.fill();
    ctx.strokeStyle = '#255a5b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff2a3';
    ctx.fillRect(-12, -26, 7, 4);
    ctx.fillRect(5, -26, 7, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-11, 11, 6, 4);
    ctx.fillRect(5, 11, 6, 4);
    if (invulnerable > 0) {
      ctx.strokeStyle = '#fff3a6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-21, -33, 42, 66, 13);
      ctx.stroke();
    }
    ctx.restore();
  }

  function update(dt) {
    elapsed += dt;
    const speed = 205 + Math.min(elapsed * 5.2, 270) + (level - 1) * 28;
    roadOffset += speed * dt;
    invulnerable = Math.max(0, invulnerable - dt);
    shake = Math.max(0, shake - dt);
    toastTimer = Math.max(0, toastTimer - dt);
    if (toastTimer === 0) toastNode.classList.remove('show');

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnItem();
      spawnTimer = Math.max(.3, 1.12 - elapsed * .006 - (level - 1) * .09) * (.82 + Math.random() * .36);
    }

    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      item.y += speed * dt;
      item.rotation += dt * 2;
      if (!item.passed && item.lane === car.lane && Math.abs(item.y - car.y) < (item.type === 'barrier' ? 34 : 31)) {
        item.passed = true;
        if (item.type === 'coin' || item.type === 'star') collect(item);
        else if (invulnerable <= 0) hitHazard(item);
        items.splice(i, 1);
        continue;
      }
      if (item.y > 690) {
        if (item.type === 'coin' || item.type === 'star') combo = 0;
        items.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 110 * dt;
      particle.life -= dt;
      if (particle.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(timestamp) {
    const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, .04);
    lastTime = timestamp;
    if (state === 'playing') update(dt);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * shake * 22, (Math.random() - .5) * shake * 22);
    const backgroundDelta = state === 'playing' ? dt : 0;
    drawBackground(backgroundDelta, state === 'playing' ? 205 + Math.min(elapsed * 5.2, 270) : 70);
    for (const item of items) drawItem(item);
    drawParticles();
    drawCar();
    ctx.restore();
    requestAnimationFrame(frame);
  }

  document.getElementById('start-button').addEventListener('click', startGame);
  document.getElementById('restart-button').addEventListener('click', startGame);
  document.getElementById('pause-button').addEventListener('click', pauseGame);
  document.getElementById('continue-button').addEventListener('click', resumeGame);
  document.getElementById('pause-restart-button').addEventListener('click', startGame);
  document.getElementById('exit-button').addEventListener('click', exitToMenu);
  document.getElementById('open-shop-button').addEventListener('click', openShop);
  document.getElementById('close-shop-button').addEventListener('click', closeShop);
  document.getElementById('car-tab').addEventListener('click', () => {
    shopCategory = 'car';
    document.getElementById('car-tab').classList.add('is-active');
    document.getElementById('motorcycle-tab').classList.remove('is-active');
    document.getElementById('car-tab').setAttribute('aria-selected', 'true');
    document.getElementById('motorcycle-tab').setAttribute('aria-selected', 'false');
    renderCars();
  });
  document.getElementById('motorcycle-tab').addEventListener('click', () => {
    shopCategory = 'motorcycle';
    document.getElementById('motorcycle-tab').classList.add('is-active');
    document.getElementById('car-tab').classList.remove('is-active');
    document.getElementById('motorcycle-tab').setAttribute('aria-selected', 'true');
    document.getElementById('car-tab').setAttribute('aria-selected', 'false');
    renderCars();
  });
  playerNameInput.addEventListener('input', () => {
    playerName = playerNameInput.value.slice(0, 18).trim();
    try { localStorage.setItem('dua-xe-ne-bom-player-name', playerName); }
    catch { /* Saving a name is optional. */ }
  });
  document.getElementById('left-button').addEventListener('pointerdown', (event) => { event.preventDefault(); moveCar(-1); });
  document.getElementById('right-button').addEventListener('pointerdown', (event) => { event.preventDefault(); moveCar(1); });

  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'a', 'd', ' '].includes(key)) event.preventDefault();
    if (key === 'escape') {
      if (state === 'playing') pauseGame();
      else if (state === 'paused') resumeGame();
      return;
    }
    if (keys.has(key)) return;
    keys.add(key);
    if (key === 'arrowleft' || key === 'a') moveCar(-1);
    if (key === 'arrowright' || key === 'd') moveCar(1);
    if ((key === 'enter' || key === ' ') && (state === 'ready' || state === 'over')) startGame();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('resize', resizeCanvas);

  resizeCanvas();
  seedScenery();
  updateRecordDisplay();
  updateHud();
  saveGarage();
  requestAnimationFrame(frame);
})();
