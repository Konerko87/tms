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

/***********************
 UI helpers
***********************/
function setMsg(t) {
  msg.textContent = t || '';
}

function showLoading(text = '讀取中...') {
  loadingText.innerHTML = text;
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

/***********************
 車號取得
***********************/
function getCar() {

  let car = '';

  const url = new URL(window.location.href);

  // 1. 抓 ?car=
  car = url.searchParams.get('car');

  // 2. 抓 #car=
  if (!car) {
    const hash = window.location.hash;

    if (hash && hash.includes('car=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      car = params.get('car');
    }
  }

  // 3. localStorage
  if (!car) {
    car = localStorage.getItem('car');
  }

  if (car) {
    car = car.trim().toUpperCase();
    localStorage.setItem('car', car);
  }

  return car || '';
}

/***********************
 API
***********************/
async function api(action, payload = {}) {
  const url =
    GAS_API_URL +
    '?action=' +
    encodeURIComponent(action) +
    '&' +
    new URLSearchParams(payload).toString();

  const res = await fetch(url);
  const text = await res.text();

  return JSON.parse(text);
}

/***********************
 路線 / 區域
***********************/
function renderRoutesByType(type) {
  routeSelect.innerHTML = '<option value="">請選擇路線</option>';

  let list = [];

  if (type === '爆量專車') {
    list = routesData.filter(r => {
      const t = String(r.type || '').trim();
      return t === '爆量專車' || t === '文流';
    });
  } else {
    list = routesData.filter(r => {
      return String(r.type || '').trim() === type;
    });
  }

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

/***********************
 任務按鈕
***********************/
document.querySelectorAll('.task-btn').forEach(btn => {
  btn.onclick = () => {
    document
      .querySelectorAll('.task-btn')
      .forEach(b => b.classList.remove('selected-task'));

    btn.classList.add('selected-task');

    selectedType = btn.dataset.type || '';

    routeBlock.classList.add('hidden');
    areaBlock.classList.add('hidden');
    noteArea.classList.add('hidden');
    setMsg('');

    if (selectedType === '專車') {
      noteArea.classList.remove('hidden');
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

/***********************
 初始化
***********************/
async function init() {
  try {
    showLoading('登入中...');

    currentCar = getCar();

    if (!currentCar) {
      carText.textContent = '沒有取得車號';
      driverNameText.textContent = '-';
      hideLoading();
      return;
    }

    carText.textContent = currentCar;

    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login({
        redirectUri: window.location.href
      });
      return;
    }

    const profile = await liff.getProfile();
    currentLineId = String(profile.userId || '').trim();

    showLoading('讀取資料...');

    const initResult = await api('initData', { lineId: currentLineId });

    routesData = initResult.routes || [];
    areasData = initResult.areas || [];

    const driver = initResult.driver || {};

    if (driver.found) {
      currentDriverName = driver.name;
      driverNameText.textContent = currentDriverName;

      bindArea.classList.add('hidden');
      tripArea.classList.remove('hidden');
    } else {
      driverNameText.textContent = '未綁定';
      bindArea.classList.remove('hidden');
      tripArea.classList.add('hidden');
    }

    hideLoading();

  } catch (err) {
    console.error(err);
    carText.textContent = currentCar || '沒有取得車號';
    driverNameText.textContent = '讀取失敗';
    setMsg('系統初始化失敗，請重開一次');
    hideLoading();
  }
}

/***********************
 綁定司機
***********************/
bindBtn.onclick = async () => {
  const name = nameInput.value.trim();

  if (!name) {
    setMsg('請輸入姓名');
    return;
  }

  try {
    setMsg('');
    showLoading('綁定司機...');

    const result = await api('bindDriver', {
      lineId: currentLineId,
      name
    });

    hideLoading();

    if (!result.ok) {
      setMsg('綁定失敗');
      return;
    }

    currentDriverName = name;
    driverNameText.textContent = name;

    bindArea.classList.add('hidden');
    tripArea.classList.remove('hidden');

  } catch (err) {
    console.error(err);
    hideLoading();
    setMsg('綁定失敗，請稍後再試');
  }
};

/***********************
 出車
***********************/
tripBtn.onclick = async () => {
  if (tripBtn.disabled) return;

  const route = routeSelect.value;
  const area = areaSelect.value;
  const note = noteInput.value.trim();

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

  try {
    setMsg('');
    tripBtn.disabled = true;

    const finalRoute =
      selectedType === '區域司機' ? area : route;

    const finalNote =
      selectedType === '區域司機' ? '' : note;

    showLoading('🚚 出車送出中...');

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
      setMsg('出車失敗');
      tripBtn.disabled = false;
      return;
    }

    tripBtn.textContent = '✓ 出車成功';

    showLoading('<div class="success-box">🚚 出車成功</div>');

    await new Promise(r => setTimeout(r, 1200));

    await showVehicleStatus();

    hideLoading();

  } catch (err) {
    console.error(err);
    hideLoading();
    setMsg('出車失敗，請稍後再試');
    tripBtn.disabled = false;
  }
};

/***********************
 警示文字
***********************/
function getMaintainWarnText(remain) {
  if (remain === null || remain === undefined || remain === '') return '';
  if (remain < 0) return '🚨 已逾期';
  if (remain <= 3) return '🚨 即將到期';
  if (remain <= 10) return '⚠ 即將到期';
  return '✅ 正常';
}

function getInspectionWarnText(remain) {
  if (remain === null || remain === undefined || remain === '') return '';
  if (remain < 0) return '🚨 已逾期';
  if (remain <= 3) return '🚨 驗車即將到期';
  if (remain <= 10) return '⚠ 驗車即將到期';
  return '✅ 正常';
}

function applyVehicleModalStyle(data) {
  vehicleModalContent.classList.remove('inspect-danger');
  vehicleModalContent.classList.remove('maint-warning');

  const maintRemain = Number(data.maintRemain);
  const inspectionRemain = Number(data.inspectionRemain);

  if (!Number.isNaN(inspectionRemain) && inspectionRemain <= 3) {
    vehicleModalContent.classList.add('inspect-danger');
    return;
  }

  if (!Number.isNaN(maintRemain) && maintRemain <= 10) {
    vehicleModalContent.classList.add('maint-warning');
  }
}

/***********************
 車輛狀態
***********************/
async function showVehicleStatus() {
  const data = await api('getVehicleStatus', { car: currentCar });

  vehicleModalTitle.textContent = '🚚 ' + currentCar;

  if (!data.ok) {
    vehicleModalContent.className = 'status-box';
    vehicleModalContent.textContent = '查無車輛維護資料';
    maintBtn.style.display = 'none';
    inspectBtn.style.display = 'none';

    closeVehicleModalBtn.textContent = '知道了';
    closeVehicleModalBtn.onclick = showSafetyReminder;

    openVehicleModal();
    return;
  }

  const maintainWarn = getMaintainWarnText(data.maintRemain);
  const inspectWarn = getInspectionWarnText(data.inspectionRemain);

  vehicleModalContent.className = 'status-box';
  applyVehicleModalStyle(data);

  vehicleModalContent.textContent =
`保養提醒 ${maintainWarn}
上次保養：${data.lastMaintainDate || '-'}
下次保養：${data.maintainDueDate || '-'}
剩餘：${data.maintRemain ?? '-'}天

驗車提醒 ${inspectWarn}
上次驗車：${data.lastInspectionDate || '-'}
驗車期限：${data.inspectionDueDate || '-'}
剩餘：${data.inspectionRemain ?? '-'}天`;

  maintBtn.style.display = 'inline-block';
  inspectBtn.style.display = 'inline-block';

  maintBtn.textContent = '保養已完成';
  inspectBtn.textContent = '驗車已完成';

  closeVehicleModalBtn.textContent = '知道了';
  closeVehicleModalBtn.onclick = showSafetyReminder;

  openVehicleModal();
}

/***********************
 行車安全提醒
***********************/
function showSafetyReminder() {
  vehicleModalTitle.textContent = '🚚 行車安全提醒';
  vehicleModalContent.className = 'status-box';

  vehicleModalContent.textContent =
`1. 行車前檢查胎壓
2. 煞車是否正常
3. 貨物是否固定
4. 遵守交通規則
5. 保持安全車距

祝您行車平安`;

  maintBtn.style.display = 'none';
  inspectBtn.style.display = 'none';

  closeVehicleModalBtn.textContent = '我知道了';

  closeVehicleModalBtn.onclick = () => {
    try {
      if (typeof liff !== 'undefined' && liff.isInClient()) {
        liff.closeWindow();
      } else {
        window.location.href = 'about:blank';
      }
    } catch (err) {
      window.location.href = 'about:blank';
    }
  };
}

/***********************
 完成保養
***********************/
maintBtn.onclick = async () => {
  const yes = confirm(`確認已完成保養？\n${currentCar}`);
  if (!yes) return;

  try {
    showLoading('更新保養資料...');

    const result = await api('completeMaintain', { car: currentCar });

    hideLoading();

    if (!result.ok) {
      alert('更新保養資料失敗');
      return;
    }

    vehicleModalTitle.textContent = '✓ 保養已完成';
    vehicleModalContent.className = 'status-box';
    vehicleModalContent.textContent = '保養資料已更新';

    maintBtn.style.display = 'none';
    inspectBtn.style.display = 'inline-block';
    inspectBtn.textContent = '我知道了';
    inspectBtn.onclick = showSafetyReminder;

    closeVehicleModalBtn.textContent = '我知道了';
    closeVehicleModalBtn.onclick = showSafetyReminder;

  } catch (err) {
    console.error(err);
    hideLoading();
    alert('更新保養資料失敗');
  }
};

/***********************
 完成驗車
***********************/
inspectBtn.onclick = async () => {
  const yes = confirm(`確認已完成驗車？\n${currentCar}`);
  if (!yes) return;

  try {
    showLoading('更新驗車資料...');

    const result = await api('completeInspection', { car: currentCar });

    hideLoading();

    if (!result.ok) {
      alert('更新驗車資料失敗');
      return;
    }

    vehicleModalTitle.textContent = '✓ 驗車已完成';
    vehicleModalContent.className = 'status-box';
    vehicleModalContent.textContent = '驗車資料已更新';

    inspectBtn.style.display = 'none';
    maintBtn.style.display = 'inline-block';
    maintBtn.textContent = '我知道了';
    maintBtn.onclick = showSafetyReminder;

    closeVehicleModalBtn.textContent = '我知道了';
    closeVehicleModalBtn.onclick = showSafetyReminder;

  } catch (err) {
    console.error(err);
    hideLoading();
    alert('更新驗車資料失敗');
  }
};

/***********************
 Start
***********************/
document.addEventListener('DOMContentLoaded', init);
