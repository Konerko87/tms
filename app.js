const LIFF_ID = '2008915809-vp9PFMVX';
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec';

let currentCar = '';
let currentLineId = '';
let currentDriverName = '';

const carText = document.getElementById('carText');
const driverArea = document.getElementById('driverArea');
const driverNameText = document.getElementById('driverNameText');
const bindArea = document.getElementById('bindArea');
const tripArea = document.getElementById('tripArea');
const msg = document.getElementById('msg');
const nameInput = document.getElementById('nameInput');
const bindBtn = document.getElementById('bindBtn');
const tripBtn = document.getElementById('tripBtn');

function setMsg(text) {
  msg.textContent = text || '';
}

function getCarFromUrl() {
  const url = new URL(window.location.href);

  let car = url.searchParams.get('car');

  if (!car) {
    const hash = window.location.hash || '';
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hashQuery);
    car = hashParams.get('car');
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

async function init() {
  try {
    currentCar = getCarFromUrl();

    if (!currentCar) {
      carText.textContent = '沒有取得車號';
      setMsg('請確認 QR Code 是否包含 car 參數');
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
      setMsg(result.message || '查詢失敗');
      return;
    }

    if (result.found) {
      currentDriverName = result.driverName || '';
      driverNameText.textContent = currentDriverName;
      driverArea.classList.remove('hidden');
      tripArea.classList.remove('hidden');
      setMsg('');
    } else {
      bindArea.classList.remove('hidden');
      setMsg('請先輸入姓名完成綁定');
    }

  } catch (err) {
    console.error(err);
    setMsg('系統初始化失敗：' + err.message);
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

    currentDriverName = result.driverName || name;
    driverNameText.textContent = currentDriverName;

    bindArea.classList.add('hidden');
    driverArea.classList.remove('hidden');
    tripArea.classList.remove('hidden');

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
    tripBtn.disabled = true;
    setMsg('出車登記中...');

    const result = await api('logTrip', {
      lineId: currentLineId,
      name: currentDriverName,
      car: currentCar
    });

    if (!result.ok) {
      setMsg(result.message || '登記失敗');
      tripBtn.disabled = false;
      return;
    }

    setMsg('✅ 出車登記成功');

  } catch (err) {
    console.error(err);
    setMsg('登記失敗：' + err.message);
  } finally {
    tripBtn.disabled = false;
  }
});

init();
