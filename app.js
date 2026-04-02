const LIFF_ID = '2008915809-vp9PFMVX';

const GAS_API_URL =
  'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec';

let currentCar = '';
let currentLineId = '';
let currentDriverName = '';
let selectedType = '';

let routesData = [];
let areasData = [];

// Cookie 備援（LINE 瀏覽器可能清 sessionStorage）
function setCarCookie(car) {
  try { document.cookie = 'car=' + encodeURIComponent(car) + ';max-age=86400;path=/;SameSite=Lax'; } catch(e) {}
}
function getCarCookie() {
  try {
    const m = document.cookie.match(/(?:^|;\s*)car=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : '';
  } catch(e) { return ''; }
}

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
 * Debug
 ***********************/
function debugLog(...args) {
  console.log('[APP]', ...args);
}

/***********************
 * UI helpers
 ***********************/
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

/***********************
 * normalize car
 ***********************/
function normalizeCar(car) {
  if (!car) return '';
  try {
    car = decodeURIComponent(car);
  } catch (e) {}
  return String(car).trim().toUpperCase();
}

/***********************
 * 從 liff.state 裡抓 car
 ***********************/
function getCarFromLiffState() {
  try {
    const url = new URL(window.location.href);
    const state = url.searchParams.get('liff.state');
    if (!state) return '';

    const decoded = decodeURIComponent(state);
    debugLog('decoded liff.state =', decoded);

    const queryMatch = decoded.match(/[?&]car=([^&#]+)/);
    if (queryMatch && queryMatch[1]) {
      return normalizeCar(queryMatch[1]);
    }

    const hashMatch = decoded.match(/#car=([^&#]+)/);
    if (hashMatch && hashMatch[1]) {
      return normalizeCar(hashMatch[1]);
    }

    return '';
  } catch (e) {
    console.warn('getCarFromLiffState error', e);
    return '';
  }
}

/***********************
 * 強制先從目前網址抓 car，先存起來
 * 目的：第一次 login 前先保住 car
 ***********************/
(function preStoreCarBeforeInit() {
  try {
    let car = '';

    const url = new URL(window.location.href);

    car = url.searchParams.get('car');

    if (!car) {
      const hash = window.location.hash || '';
      if (hash.includes('car=')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        car = params.get('car');
      }
    }

    if (!car) {
      car = getCarFromLiffState();
    }

    car = normalizeCar(car);

    if (car) {
      sessionStorage.setItem('car', car);
      localStorage.setItem('car', car);
      setCarCookie(car);
      debugLog('preStore car =', car);
    } else {
      debugLog('preStore no car found');
    }
  } catch (e) {
    console.warn('preStoreCarBeforeInit error', e);
  }
})();

/***********************
 * 取得車號
 * 優先序：
 * 1. query
 * 2. hash
 * 3. liff.state
 * 4. sessionStorage
 * 5. localStorage
 ***********************/
function getCar() {
  let car = '';

  try {
    const url = new URL(window.location.href);

    // 1 query
    car = url.searchParams.get('car');

    // 2 hash
    if (!car) {
      const hash = window.location.hash || '';
      if (hash.includes('car=')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        car = params.get('car');
      }
    }

    // 3 liff.state
    if (!car) {
      car = getCarFromLiffState();
    }

    // 4 sessionStorage
    if (!car) {
      car = sessionStorage.getItem('car');
    }

    // 5 localStorage
    if (!car) {
      car = localStorage.getItem('car');
    }

    // 6 cookie（LINE 瀏覽器備援）
    if (!car) {
      car = getCarCookie();
    }

    car = normalizeCar(car);

    if (car) {
      sessionStorage.setItem('car', car);
      localStorage.setItem('car', car);
    }

    debugLog('getCar result =', car);
    return car || '';
  } catch (e) {
    console.warn('getCar error', e);
    return '';
  }
}

/***********************
 * API
 ***********************/
async function api(action, payload = {}) {
  const qs = new URLSearchParams({
    action,
    ...payload
  });

  const url = `${GAS_API_URL}?${qs.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    debugLog('API request =', url);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    const text = await res.text();
    debugLog('API response text =', text);

    return JSON.parse(text);
  } catch (e) {
    console.error('API error', e);
    return { ok: false, error: String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

/***********************
 * 路線 / 區域
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
 * 任務按鈕
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
 * 初始化
 ***********************/
async function init() {
  try {
    showLoading('初始化中...');

    // 先抓 car，重點
    currentCar = getCar();

    if (!currentCar) {
      carText.textContent = '❌ 沒有取得車號';
      driverNameText.textContent = '請確認 QR 是否正確';
      hideLoading();
      return;
    }

    carText.textContent = currentCar;
    debugLog('currentCar before liff.init =', currentCar);

    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      // login 前再保一次
      if (currentCar) {
        sessionStorage.setItem('car', currentCar);
        localStorage.setItem('car', currentCar);
      setCarCookie(currentCar);
      }

      // 確保 redirectUrl 一定帶有 car 參數（liff.init 可能改了 URL）
      let redirectUrl = window.location.origin + window.location.pathname;
      if (currentCar) {
        redirectUrl += '?car=' + encodeURIComponent(currentCar);
      } else {
        redirectUrl += window.location.search;
      }

      debugLog('not logged in, redirectUrl =', redirectUrl);

      liff.login({
        redirectUri: redirectUrl
      });
      return;
    }

    // login 後再抓一次，避免 liff.state 或 redirect 後變動
    currentCar = getCar();

    if (!currentCar) {
      carText.textContent = '❌ 登入後仍無車號';
      driverNameText.textContent = '請重新掃描 QR';
      hideLoading();
      return;
    }

    carText.textContent = currentCar;

    let profile;

    try {
      profile = await liff.getProfile();
      currentLineId = profile.userId;
    } catch (err) {
      const idToken = liff.getDecodedIDToken();
      currentLineId = idToken ? idToken.sub : '';
    }

    if (!currentLineId) {
      driverNameText.textContent = 'LINE 身分取得失敗';
      hideLoading();
      return;
    }

    showLoading('讀取資料...');

    const initResult = await api('initData', {
      lineId: currentLineId
    });

    routesData = initResult.routes || [];
    areasData = initResult.areas || [];

    const driver = initResult.driver || {};

    if (driver.found) {
      currentDriverName = driver.name || '';
      driverNameText.textContent = currentDriverName || '已綁定';
      bindArea.classList.add('hidden');
      tripArea.classList.remove('hidden');
    } else {
      currentDriverName = '';
      driverNameText.textContent = '未綁定';
      bindArea.classList.remove('hidden');
      tripArea.classList.add('hidden');
    }

    hideLoading();
  } catch (err) {
    console.error(err);
    carText.textContent = currentCar || '車號讀取失敗';
    driverNameText.textContent = '初始化失敗';
    hideLoading();
  }
}

/***********************
 * 綁定司機
 ***********************/
bindBtn.onclick = async () => {
  try {
    const name = nameInput.value.trim();

    if (!name) {
      setMsg('請輸入姓名');
      return;
    }

    if (!currentLineId) {
      setMsg('LINE 身分未取得');
      return;
    }

    showLoading('綁定中...');

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
    setMsg('');
  } catch (e) {
    console.error(e);
    hideLoading();
    setMsg('綁定錯誤');
  }
};

/***********************
 * 出車
 ***********************/
tripBtn.onclick = async () => {
  try {
    if (tripBtn.disabled) return;

    const route = routeSelect.value;
    const area = areaSelect.value;
    const note = noteInput.value.trim();

    if (!currentCar) {
      setMsg('沒有車號');
      return;
    }

    if (!currentLineId) {
      setMsg('沒有 LINE 身分');
      return;
    }

    if (!currentDriverName) {
      setMsg('請先綁定司機');
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

    if (selectedType !== '專車' && selectedType !== '區域司機' && !route) {
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

    showLoading('檢查車輛狀態...');

    await new Promise(r => setTimeout(r, 800));
    await showVehicleStatus();

    hideLoading();
  } catch (e) {
    console.error(e);
    hideLoading();
    tripBtn.disabled = false;
    setMsg('系統錯誤');
  }
};

/***********************
 * 車輛狀態
 ***********************/
async function showVehicleStatus() {
  try {
    const data = await api('getVehicleStatus', { car: currentCar });

    vehicleModalTitle.textContent = '🚚 ' + currentCar;

    vehicleModalContent.textContent =
`保養提醒
上次保養：${data.lastMaintainDate || '-'}
下次保養：${data.maintainDueDate || '-'}
剩餘：${data.maintRemain || '-'}天

驗車提醒
上次驗車：${data.lastInspectionDate || '-'}
驗車期限：${data.inspectionDueDate || '-'}
剩餘：${data.inspectionRemain || '-'}天`;

    openVehicleModal();
  } catch (e) {
    console.error(e);
  }
}

/***********************
 * 完成按鈕
 ***********************/
maintBtn.onclick = async () => {
  try {
    if (!confirm('確認已完成保養？')) return;

    showLoading('更新保養...');

    const result = await api('completeMaintain', { car: currentCar });

    hideLoading();

    if (!result.ok) {
      alert('保養更新失敗');
      return;
    }

    alert('保養完成');
    closeVehicleModal();
  } catch (e) {
    console.error(e);
    hideLoading();
    alert('保養更新錯誤');
  }
};

inspectBtn.onclick = async () => {
  try {
    if (!confirm('確認已完成驗車？')) return;

    showLoading('更新驗車...');

    const result = await api('completeInspection', { car: currentCar });

    hideLoading();

    if (!result.ok) {
      alert('驗車更新失敗');
      return;
    }

    alert('驗車完成');
    closeVehicleModal();
  } catch (e) {
    console.error(e);
    hideLoading();
    alert('驗車更新錯誤');
  }
};

closeVehicleModalBtn.onclick = () => {
  closeVehicleModal();

  try {
    if (window.liff && typeof liff.closeWindow === 'function') {
      liff.closeWindow();
    } else {
      window.close();
    }
  } catch (e) {
    window.close();
  }
};

/***********************
 * Start
 ***********************/
document.addEventListener('DOMContentLoaded', init);
