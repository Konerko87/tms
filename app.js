const LIFF_ID = '2008915809-vp9PFMVX';
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec';

let currentCar = '';
let currentLineId = '';
let currentDriverName = '';
let routeMap = {};
let submittingTrip = false;

const carText = document.getElementById('carText');
const driverArea = document.getElementById('driverArea');
const driverNameText = document.getElementById('driverNameText');
const bindArea = document.getElementById('bindArea');
const nameInput = document.getElementById('nameInput');
const bindBtn = document.getElementById('bindBtn');
const tripArea = document.getElementById('tripArea');
const routeSelect = document.getElementById('routeSelect');
const noteArea = document.getElementById('noteArea');
const noteInput = document.getElementById('noteInput');
const tripBtn = document.getElementById('tripBtn');
const msg = document.getElementById('msg');

function setMsg(text) {
  msg.textContent = text || '';
}

function getCar() {
  const url = new URL(window.location.href);
  let car = url.searchParams.get('car');

  if (!car) {
    const hash = window.location.hash || '';
    const hashWithoutSharp = hash.replace(/^#/, '');

    let hashParams = new URLSearchParams(hashWithoutSharp);
    car = hashParams.get('car');

    if (!car && hashWithoutSharp.includes('?')) {
      const part = hashWithoutSharp.split('?')[1] || '';
      hashParams = new URLSearchParams(part);
      car = hashParams.get('car');
    }
  }

  if (car) {
    localStorage.setItem('car', car);
  }

  if (!car) {
    car = localStorage.getItem('car');
  }

  return (car || '').trim();
}

async function api(action, payload = {}) {
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      action,
      ...payload
    })
  });

  return await res.json();
}

async function loadRoutes() {
  const result = await api('getRoutes');

  if (!result.ok) {
    setMsg(result.message || '載入路線失敗');
    return;
  }

  routeMap = {};
  routeSelect.innerHTML = '<option value="">請選擇路線</option>';

  result.routes.forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.name;
    opt.textContent = r.name;
    routeSelect.appendChild(opt);
    routeMap[r.name] = r.type;
  });
}

function updateNoteVisibility() {
  const type = routeMap[routeSelect.value];
  if (type === '專車') {
    noteArea.classList.remove('hidden');
  } else {
    noteArea.classList.add('hidden');
    noteInput.value = '';
  }
}

routeSelect.addEventListener('change', updateNoteVisibility);

async function init() {
  try {
    currentCar = getCar();

    if (!currentCar) {
      carText.textContent = '沒有取得車號';
      setMsg('請確認 QR Code 是否帶有 car 參數');
      return;
    }

    carText.textContent = currentCar;
    setMsg('登入 LINE 中...');

    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login({
        redirectUri: window.location.href
      });
      return;
    }

    const profile = await liff.getProfile();
    currentLineId = profile.userId;

    setMsg('查詢司機資料中...');

    const result = await api('getDriver', {
      lineId: currentLineId
    });

    if (!result.ok) {
      setMsg(result.message || '查詢司機失敗');
      return;
    }

    if (result.found) {
      currentDriverName = result.driverName || '';
      driverNameText.textContent = currentDriverName;
      driverArea.classList.remove('hidden');
      tripArea.classList.remove('hidden');
      await loadRoutes();
      setMsg('');
    } else {
      bindArea.classList.remove('hidden');
      setMsg('請先輸入姓名完成綁定');
    }
  } catch (err) {
    console.error(err);
    setMsg('初始化失敗：' + err.message);
  }
}

bindBtn.addEventListener('click', async () => {
  try {
    const name = nameInput.value.trim();

    if (!name) {
      setMsg('請輸入姓名');
      return;
    }

    bindBtn.disabled = true;
    setMsg('綁定中...');

    const result = await api('bindDriver', {
      lineId: currentLineId,
      name
    });

    if (!result.ok) {
      setMsg(result.message || '綁定失敗');
      bindBtn.disabled = false;
      return;
    }

    currentDriverName = name;
    driverNameText.textContent = name;

    bindArea.classList.add('hidden');
    driverArea.classList.remove('hidden');
    tripArea.classList.remove('hidden');

    await loadRoutes();
    setMsg('綁定成功');
  } catch (err) {
    console.error(err);
    setMsg('綁定失敗：' + err.message);
  } finally {
    bindBtn.disabled = false;
  }
});

tripBtn.addEventListener('click', async () => {
  try {
    if (submittingTrip || tripBtn.disabled) {
      return;
    }

    const route = routeSelect.value.trim();
    const note = noteInput.value.trim();
    const routeType = routeMap[route] || '';

    if (!route) {
      setMsg('請選擇路線');
      return;
    }

    if (routeType === '專車' && !note) {
      setMsg('專車請填寫備註');
      return;
    }

    submittingTrip = true;
    tripBtn.disabled = true;
    setMsg('出車登記中...');

    const result = await api('logTrip', {
      lineId: currentLineId,
      name: currentDriverName,
      car: currentCar,
      route,
      note
    });

    if (!result.ok) {
      setMsg(result.message || '出車失敗');
      tripBtn.disabled = false;
      submittingTrip = false;
      return;
    }

    setMsg('✅ 出車成功');
    tripBtn.textContent = '已出車';
  } catch (err) {
    console.error(err);
    setMsg('出車失敗：' + err.message);
    tripBtn.disabled = false;
    submittingTrip = false;
  }
});

init();


