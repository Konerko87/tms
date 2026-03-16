const LIFF_ID = '2008915809-vp9PFMVX';

const GAS_API_URL =
  'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec';

let currentCar = '';
let currentLineId = '';
let currentDriverName = '';
let selectedType = '';

let routesData = [];
let areasData = [];

let carText;
let driverNameText;

let bindArea;
let nameInput;
let bindBtn;

let tripArea;

let routeBlock;
let routeSelect;

let areaBlock;
let areaSelect;

let noteArea;
let noteInput;

let tripBtn;
let msg;

let loadingMask;
let loadingText;

let vehicleModal;
let vehicleModalTitle;
let vehicleModalContent;
let maintBtn;
let inspectBtn;
let closeVehicleModalBtn;

function setMsg(t) {
  if (msg) msg.textContent = t || '';
}

function showLoading(text = '讀取中...') {
  if (loadingText) loadingText.textContent = text;
  if (loadingMask) loadingMask.classList.remove('hidden');
}

function hideLoading() {
  if (loadingMask) loadingMask.classList.add('hidden');
}

function openVehicleModal() {
  if (vehicleModal) vehicleModal.classList.remove('hidden');
}

function closeVehicleModal() {
  if (vehicleModal) vehicleModal.classList.add('hidden');
}

function resetInitView() {
  if (bindArea) bindArea.classList.add('hidden');
  if (tripArea) tripArea.classList.add('hidden');

  if (routeBlock) routeBlock.classList.add('hidden');
  if (areaBlock) areaBlock.classList.add('hidden');
  if (noteArea) noteArea.classList.add('hidden');

  if (loadingMask) loadingMask.classList.add('hidden');

  if (nameInput) nameInput.value = '';

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

/* 改成 GET，避開 GAS + LIFF 的 CORS POST 問題 */
async function api(action, payload = {}) {
  try {
    const params = new URLSearchParams();

    params.set('action', action);

    Object.entries(payload).forEach(([key, value]) => {
      params.set(key, value == null ? '' : String(value));
    });

    const url = `${GAS_API_URL}?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET'
    });

    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    console.error('API error:', err);
    return {
      ok: false,
      message: 'API失敗'
    };
  }
}

function clearTaskSelectedStyle() {
  document.querySelectorAll('.task-btn').forEach(btn => {
    btn.classList.remove('selected-task');
  });
}

function renderRoutesByType(type) {
  if (!routeSelect) return;

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
  if (!areaSelect) return;

  areaSelect.innerHTML = '<option value="">請選擇區域</option>';

  areasData.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    areaSelect.appendChild(opt);
  });
}

function bindTaskButtons() {
  document.querySelectorAll('.task-btn').forEach(btn => {
    btn.onclick = () => {
      clearTaskSelectedStyle();
      btn.classList.add('selected-task');

      selectedType = btn.dataset.type || '';

      setMsg('');

      if (routeBlock) routeBlock.classList.add('hidden');
      if (areaBlock) areaBlock.classList.add('hidden');
      if (noteArea) noteArea.classList.add('hidden');

      if (routeSelect) routeSelect.value = '';
      if (areaSelect) areaSelect.value = '';
      if (noteInput) noteInput.value = '';

      if (selectedType === '專車') {
        if (noteArea) noteArea.classList.remove('hidden');
        if (noteInput) noteInput.placeholder = '例如：楊梅專車';
        return;
      }

      if (selectedType === '區域司機') {
        if (areaBlock) areaBlock.classList.remove('hidden');
        renderAreas();
        return;
      }

      if (routeBlock) routeBlock.classList.remove('hidden');
      renderRoutesByType(selectedType);
    };
  });
}

async function init() {
  try {
    resetInitView();

    showLoading('登入中...');

    currentCar = getCar();

    if (!currentCar) {
      if (carText) carText.textContent = '沒有取得車號';
      hideLoading();
      return;
    }

    if (carText) carText.textContent = currentCar;

    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return;
    }

    const profile = await liff.getProfile();
    currentLineId = String(profile.userId || '').trim();

    if (!currentLineId) {
      hideLoading();
      setMsg('LINE ID 取得失敗');
      return;
    }

    showLoading('讀取司機資料...');

    const initResult = await api('initData', { lineId: currentLineId });

    console.log('initData result:', initResult);

    if (!initResult || !initResult.ok) {
      hideLoading();
      setMsg(initResult && initResult.message ? initResult.message : '初始化失敗');
      return;
    }

    routesData = Array.isArray(initResult.routes) ? initResult.routes : [];
    areasData = Array.isArray(initResult.areas) ? initResult.areas : [];

    const driver = initResult.driver || {};

    if (driver && driver.found === true) {
      currentDriverName = String(driver.name || '').trim();

      if (driverNameText) driverNameText.textContent = currentDriverName;

      if (bindArea) bindArea.classList.add('hidden');
      if (tripArea) tripArea.classList.remove('hidden');

      setMsg('登入成功');
    } else {
      currentDriverName = '';

      if (driverNameText) driverNameText.textContent = '尚未綁定';

      if (bindArea) bindArea.classList.remove('hidden');
      if (tripArea) tripArea.classList.add('hidden');

      if (nameInput) nameInput.focus();

      setMsg('第一次使用請輸入姓名');
    }

    hideLoading();
  } catch (err) {
    console.error(err);
    hideLoading();
    setMsg('初始化失敗');
  }
}

async function bindDriver() {
  const name = nameInput ? nameInput.value.trim() : '';

  if (!currentLineId) {
    setMsg('尚未取得 LINE 身分');
    return;
  }

  if (!name) {
    setMsg('請輸入姓名');
    return;
  }

  showLoading('綁定中...');

  const result = await api('bindDriver', {
    lineId: currentLineId,
    name
  });

  hideLoading();

  if (!result || !result.ok) {
    setMsg(result && result.message ? result.message : '綁定失敗');
    return;
  }

  currentDriverName = name;

  if (driverNameText) driverNameText.textContent = name;

  if (bindArea) bindArea.classList.add('hidden');
  if (tripArea) tripArea.classList.remove('hidden');

  if (nameInput) nameInput.value = '';

  setMsg('綁定成功');
}

async function showVehicleStatus() {
  const data = await api('getVehicleStatus', { car: currentCar });

  if (!data || !data.ok) {
    if (vehicleModalTitle) vehicleModalTitle.textContent = '車輛提醒';
    if (vehicleModalContent) {
      vehicleModalContent.textContent = `🚚 ${currentCar}

查無車輛資料`;
    }
    openVehicleModal();
    return;
  }

  let maintainColor = '';
  let inspectColor = '';

  if (data.maintRemain !== null && data.maintRemain <= 7) {
    maintainColor = '⚠️';
  }

  if (data.inspectionRemain !== null && data.inspectionRemain <= 30) {
    inspectColor = '🚨';
  }

  const maintainText = `
${maintainColor} 保養提醒
上次保養：${data.lastMaintainDate || '-'}
下次保養：${data.maintainDueDate || '-'}
剩餘：${data.maintRemain ?? '-'} 天
`;

  const inspectText = `
${inspectColor} 驗車提醒
上次驗車：${data.lastInspectionDate || '-'}
驗車期限：${data.inspectionDueDate || '-'}
剩餘：${data.inspectionRemain ?? '-'} 天
`;

  if (vehicleModalTitle) vehicleModalTitle.textContent = `🚚 ${currentCar}`;
  if (vehicleModalContent) vehicleModalContent.textContent = maintainText + inspectText;

  openVehicleModal();
}

async function submitTrip() {
  if (tripBtn && tripBtn.disabled) return;

  const route = routeSelect ? routeSelect.value : '';
  const area = areaSelect ? areaSelect.value : '';
  const note = noteInput ? noteInput.value.trim() : '';

  if (!currentLineId) {
    setMsg('尚未取得 LINE 身分');
    return;
  }

  if (!currentDriverName) {
    setMsg('尚未綁定司機');
    return;
  }

  if (!selectedType) {
    setMsg('請選任務');
    return;
  }

  if (selectedType === '區域司機' && !area) {
    setMsg('請選區域');
    return;
  }

  if (
    selectedType !== '專車' &&
    selectedType !== '區域司機' &&
    !route
  ) {
    setMsg('請選路線');
    return;
  }

  if (selectedType === '專車' && !note) {
    setMsg('請填備註');
    return;
  }

  if (tripBtn) tripBtn.disabled = true;

  const finalRoute = selectedType === '區域司機' ? area : route;
  const finalNote = selectedType === '區域司機' ? '' : note;

  showLoading('出車送出中...');

  const result = await api('logTrip', {
    lineId: currentLineId,
    name: currentDriverName,
    car: currentCar,
    type: selectedType,
    route: finalRoute,
    note: finalNote
  });

  hideLoading();

  if (!result || !result.ok) {
    setMsg(result && result.message ? result.message : '出車失敗');
    if (tripBtn) tripBtn.disabled = false;
    return;
  }

  if (tripBtn) {
    tripBtn.textContent = '✓ 出車成功';
    tripBtn.style.background = '#22c55e';
  }

  await showVehicleStatus();
}

async function completeMaintain() {
  const yes = confirm(`確認已完成保養？\n${currentCar}`);
  if (!yes) return;

  await api('completeMaintain', { car: currentCar });
  await showVehicleStatus();
}

async function completeInspection() {
  const yes = confirm(`確認已完成驗車？\n${currentCar}`);
  if (!yes) return;

  await api('completeInspection', { car: currentCar });
  await showVehicleStatus();
}

document.addEventListener('DOMContentLoaded', () => {
  carText = document.getElementById('carText');
  driverNameText = document.getElementById('driverNameText');

  bindArea = document.getElementById('bindArea');
  nameInput = document.getElementById('nameInput');
  bindBtn = document.getElementById('bindBtn');

  tripArea = document.getElementById('tripArea');

  routeBlock = document.getElementById('routeBlock');
  routeSelect = document.getElementById('routeSelect');

  areaBlock = document.getElementById('areaBlock');
  areaSelect = document.getElementById('areaSelect');

  noteArea = document.getElementById('noteArea');
  noteInput = document.getElementById('noteInput');

  tripBtn = document.getElementById('tripBtn');
  msg = document.getElementById('msg');

  loadingMask = document.getElementById('loadingMask');
  loadingText = document.getElementById('loadingText');

  vehicleModal = document.getElementById('vehicleModal');
  vehicleModalTitle = document.getElementById('vehicleModalTitle');
  vehicleModalContent = document.getElementById('vehicleModalContent');
  maintBtn = document.getElementById('maintBtn');
  inspectBtn = document.getElementById('inspectBtn');
  closeVehicleModalBtn = document.getElementById('closeVehicleModalBtn');

  if (closeVehicleModalBtn) {
    closeVehicleModalBtn.onclick = () => closeVehicleModal();
  }

  if (bindBtn) {
    bindBtn.onclick = () => bindDriver();
  }

  if (tripBtn) {
    tripBtn.onclick = () => submitTrip();
  }

  if (maintBtn) {
    maintBtn.onclick = () => completeMaintain();
  }

  if (inspectBtn) {
    inspectBtn.onclick = () => completeInspection();
  }

  bindTaskButtons();
  init();
});
