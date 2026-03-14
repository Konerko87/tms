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

function getCar() {
  const url = new URL(window.location.href);
  let car = url.searchParams.get('car');

  if (car) localStorage.setItem('car', car);
  if (!car) car = localStorage.getItem('car');

  return car || '';
}

async function api(action, payload = {}) {
  const params = new URLSearchParams({
    action,
    ...payload
  });

  const res = await fetch(`${GAS_API_URL}?${params.toString()}`);
  return await res.json();
}

async function loadRoutes() {
  const result = await api('getRoutes');
  if (!result.ok) return;
  routesData = result.routes || [];
}

async function loadAreas() {
  const result = await api('getAreas');
  if (!result.ok) return;
  areasData = result.areas || [];
}

function clearTaskSelectedStyle() {
  document.querySelectorAll('.task-btn').forEach(btn => {
    btn.classList.remove('selected-task');
  });
}

function renderRoutesByType(type) {
  routeSelect.innerHTML = '<option value="">請選擇路線</option>';

  const list = routesData.filter(r => r.type === type);
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

    selectedType = btn.dataset.type;
    setMsg('');

    routeBlock.classList.add('hidden');
    areaBlock.classList.add('hidden');
    noteArea.classList.add('hidden');

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
    showLoading('登入中，請稍候...');

    currentCar = getCar();

    if (!currentCar) {
      carText.textContent = '沒有取得車號';
      hideLoading();
      return;
    }

    carText.textContent = currentCar;

    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      showLoading('即將跳轉 LINE 登入...');
      liff.login({ redirectUri: window.location.href });
      return;
    }

    showLoading('讀取 LINE 資料中...');
    const profile = await liff.getProfile();
    currentLineId = profile.userId;

    showLoading('讀取司機資料中...');
    const result = await api('getDriver', { lineId: currentLineId });

    if (result.found) {
      currentDriverName = result.name || '';
      driverNameText.textContent = currentDriverName;

      showLoading('載入任務資料中...');
      await loadRoutes();
      await loadAreas();

      tripArea.classList.remove('hidden');
      setMsg('登入成功，請選擇任務');
    } else {
      bindArea.classList.remove('hidden');
      setMsg('第一次使用，請先綁定司機');
    }

    hideLoading();
  } catch (err) {
    hideLoading();
    setMsg('初始化失敗，請重新整理');
    console.error(err);
  }
}

bindBtn.onclick = async () => {
  try {
    const name = nameInput.value.trim();

    if (!name) {
      setMsg('請輸入姓名');
      return;
    }

    showLoading('綁定司機中...');
    const result = await api('bindDriver', {
      lineId: currentLineId,
      name
    });

    if (!result.ok) {
      hideLoading();
      setMsg(result.message || '綁定失敗');
      return;
    }

    currentDriverName = name;
    driverNameText.textContent = name;

    await loadRoutes();
    await loadAreas();

    bindArea.classList.add('hidden');
    tripArea.classList.remove('hidden');

    hideLoading();
    setMsg('綁定成功，請選擇任務');
  } catch (err) {
    hideLoading();
    setMsg('綁定失敗');
    console.error(err);
  }
};

tripBtn.onclick = async () => {
  try {
    if (tripBtn.disabled) return;

    const route = routeSelect.value;
    const area = areaSelect.value;
    const note = noteInput.value.trim();

    if (!selectedType) {
      setMsg('請選任務');
      return;
    }

    if (selectedType === '區域司機' && !area) {
      setMsg('請選擇區域');
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

    tripBtn.disabled = true;
    setMsg('');

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

    if (!result.ok) {
      hideLoading();
      setMsg(result.message || '出車失敗');
      tripBtn.disabled = false;
      return;
    }

    tripBtn.textContent = '已出車';
    setMsg('出車成功');

    await showVehicleStatus();
    hideLoading();
  } catch (err) {
    hideLoading();
    setMsg('出車失敗');
    tripBtn.disabled = false;
    console.error(err);
  }
};

async function showVehicleStatus() {
  const data = await api('getVehicleStatus', { car: currentCar });

  if (!data.ok) {
    vehicleModalTitle.textContent = '車輛提醒';
    vehicleModalContent.textContent = `🚚 ${currentCar}\n\n出車成功，但查無車輛提醒資料`;
    openVehicleModal();
    return;
  }

  const maintainText = data.maintRemain == null
    ? `保養提醒
未設定`
    : `保養提醒
上次保養：${data.lastMaintainDate}
下次保養期限：${data.maintainDueDate}
剩餘：${data.maintRemain} 天`;

  const inspectText = data.inspectionRemain == null
    ? `驗車提醒
未設定`
    : `驗車提醒
上次驗車：${data.lastInspectionDate}
驗車期限：${data.inspectionDueDate} 前
剩餘：${data.inspectionRemain} 天`;

  vehicleModalTitle.textContent = `🚚 ${currentCar} 出車成功`;
  vehicleModalContent.textContent = `${maintainText}\n\n${inspectText}`;
  openVehicleModal();
}

maintBtn.onclick = async () => {
  const yes = confirm(`請再次確認：\n\n車號 ${currentCar}\n今天是否已完成保養？`);
  if (!yes) return;

  try {
    showLoading('更新保養日期中...');
    const result = await api('completeMaintain', { car: currentCar });
    hideLoading();

    if (!result.ok) {
      alert(result.message || '更新保養失敗');
      return;
    }

    alert(`保養日期已更新為：${result.lastMaintainDate}`);
    await showVehicleStatus();
  } catch (err) {
    hideLoading();
    alert('更新保養失敗');
    console.error(err);
  }
};

inspectBtn.onclick = async () => {
  const yes = confirm(`請再次確認：\n\n車號 ${currentCar}\n今天是否已完成驗車？`);
  if (!yes) return;

  try {
    showLoading('更新驗車日期中...');
    const result = await api('completeInspection', { car: currentCar });
    hideLoading();

    if (!result.ok) {
      alert(result.message || '更新驗車失敗');
      return;
    }

    alert(`上次驗車日已更新為：${result.lastInspectionDate}`);
    await showVehicleStatus();
  } catch (err) {
    hideLoading();
    alert('更新驗車失敗');
    console.error(err);
  }
};

init();
