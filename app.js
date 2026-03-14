const LIFF_ID = '2008915809-vp9PFMVX';

const GAS_API_URL =
  'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec';

let currentCar = '';
let currentLineId = '';
let currentDriverName = '';
let selectedType = '';

let routesData = [];
let areasData = [];

const carText = document.getElementById('carText');
const driverNameText = document.getElementById('driverNameText');

const bindArea = document.getElementById('bindArea');
const nameInput = document.getElementById('nameInput');
const bindBtn = document.getElementById('bindBtn');

const tripArea = document.getElementById('tripArea');

const routeBlock = document.getElementById('routeBlock');
const routeSelect = document.getElementById('routeSelect');

const areaBlock = document.getElementById('areaBlock');
const areaSelect = document.getElementById('areaSelect');

const noteArea = document.getElementById('noteArea');
const noteInput = document.getElementById('noteInput');

const tripBtn = document.getElementById('tripBtn');
const msg = document.getElementById('msg');

const loadingMask = document.getElementById('loadingMask');
const loadingText = document.getElementById('loadingText');

const vehicleModal = document.getElementById('vehicleModal');
const vehicleModalTitle = document.getElementById('vehicleModalTitle');
const vehicleModalContent = document.getElementById('vehicleModalContent');
const maintBtn = document.getElementById('maintBtn');
const inspectBtn = document.getElementById('inspectBtn');
const closeVehicleModalBtn = document.getElementById('closeVehicleModalBtn');

function setMsg(t) {
  msg.textContent = t || '';
}

function showLoading(text = '讀取中...') {
  loadingText.textContent = text;
  loadingMask.classList.remove('hidden');
}

function hideLoading() {
  loadingMask.classList.add('hidden');
}

function openVehicleModal() {
  vehicleModal.classList.remove('hidden');
}

function closeVehicleModal() {
  vehicleModal.classList.add('hidden');
}

closeVehicleModalBtn.onclick = closeVehicleModal;

function resetInitView() {
  bindArea.classList.add('hidden');
  tripArea.classList.add('hidden');
  routeBlock.classList.add('hidden');
  areaBlock.classList.add('hidden');
  noteArea.classList.add('hidden');

  loadingMask.classList.add('hidden');

  nameInput.value = '';
  setMsg('');
}

function getCar() {
  const url = new URL(window.location.href);

  let car = url.searchParams.get('car');

  if (car) {
    car = String(car).trim().toUpperCase();
    localStorage.setItem('car', car);
  }

  if (!car) {
    car = localStorage.getItem('car');
  }

  return String(car || '').trim().toUpperCase();
}

async function api(action, payload = {}) {
  try {
    const res = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    const text = await res.text();
    return JSON.parse(text);

  } catch (err) {

    console.error('API error:', err);

    return {
      ok: false,
      message: 'API 呼叫失敗'
    };
  }
}

function clearTaskSelectedStyle() {
  document.querySelectorAll('.task-btn').forEach(btn => {
    btn.classList.remove('selected-task');
  });
}

function renderRoutesByType(type) {

  routeSelect.innerHTML = '<option value="">請選擇路線</option>';

  const list = routesData.filter(r => String(r.type || '').trim() === type);

  list.forEach(r => {

    const opt = document.createElement('option');

    opt.value = r.name;
    opt.textContent = r.name;

    routeSelect.appendChild(opt);

  });
}

function renderAreas() {

  areaSelect.innerHTML = '<option value="">請選擇區域</option>';

  areasData.forEach(area => {

    const opt = document.createElement('option');

    opt.value = area;
    opt.textContent = area;

    areaSelect.appendChild(opt);

  });
}

document.querySelectorAll('.task-btn').forEach(btn => {

  btn.onclick = () => {

    clearTaskSelectedStyle();

    btn.classList.add('selected-task');

    selectedType = btn.dataset.type || '';

    setMsg('');

    routeBlock.classList.add('hidden');
    areaBlock.classList.add('hidden');
    noteArea.classList.add('hidden');

    routeSelect.value = '';
    areaSelect.value = '';
    noteInput.value = '';

    if (selectedType === '專車') {

      noteArea.classList.remove('hidden');
      noteInput.placeholder = '例如：楊梅專車';

      return;

    }

    if (selectedType === '區域司機') {

      areaBlock.classList.remove('hidden');
      renderAreas();

      return;

    }

    routeBlock.classList.remove('hidden');
    renderRoutesByType(selectedType);

  };

});

async function init() {

  try {

    resetInitView();

    showLoading('登入中...');

    currentCar = getCar();

    if (!currentCar) {

      carText.textContent = '沒有取得車號';

      hideLoading();

      return;

    }

    carText.textContent = currentCar;

    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {

      liff.login({ redirectUri: window.location.href });

      return;

    }

    const profile = await liff.getProfile();

    currentLineId = String(profile.userId || '').trim();

    if (!currentLineId) {

      hideLoading();
      setMsg('讀不到 LINE ID');

      return;

    }

    showLoading('讀取司機資料...');

    const initResult = await api('initData', { lineId: currentLineId });

    console.log('initData result:', initResult);

    if (!initResult || !initResult.ok) {

      hideLoading();

      setMsg('初始化失敗');

      return;

    }

    routesData = Array.isArray(initResult.routes) ? initResult.routes : [];
    areasData = Array.isArray(initResult.areas) ? initResult.areas : [];

    const driver = initResult.driver || {};

    if (driver && driver.found === true) {

      currentDriverName = String(driver.name || '').trim();

      driverNameText.textContent = currentDriverName;

      bindArea.classList.add('hidden');
      tripArea.classList.remove('hidden');

      setMsg('登入成功');

    } else {

      currentDriverName = '';

      driverNameText.textContent = '尚未綁定';

      bindArea.classList.remove('hidden');
      tripArea.classList.add('hidden');

      nameInput.focus();

      setMsg('第一次使用，請輸入姓名綁定');

    }

    hideLoading();

  } catch (err) {

    console.error(err);

    hideLoading();

    setMsg('初始化失敗');

  }

}

bindBtn.onclick = async () => {

  const name = nameInput.value.trim();

  if (!currentLineId) {

    setMsg('尚未取得 LINE 身分');

    return;

  }

  if (!name) {

    setMsg('請輸入姓名');

    return;

  }

  showLoading('綁定司機中...');

  const result = await api('bindDriver', {
    lineId: currentLineId,
    name
  });

  hideLoading();

  if (!result || !result.ok) {

    setMsg('綁定失敗');

    return;

  }

  currentDriverName = name;

  driverNameText.textContent = name;

  bindArea.classList.add('hidden');
  tripArea.classList.remove('hidden');

  nameInput.value = '';

  setMsg('綁定成功');

};

document.addEventListener('DOMContentLoaded', () => {

  init();

});
