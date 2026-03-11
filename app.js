const LIFF_ID = '2008915809-vp9PFMVX';

const GAS_API_URL =
'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec';

let currentCar = '';
let currentLineId = '';
let currentDriverName = '';

let routeMap = {};

/* DOM */

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


function setMsg(text){
  msg.textContent = text || '';
}


/* 取得 car */

function getCar(){

  const url = new URL(window.location.href);

  let car = url.searchParams.get("car");

  if(!car){

    const hash = window.location.hash || "";

    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

    car = hashParams.get("car");

  }

  if(car){

    localStorage.setItem("car", car);

  }

  if(!car){

    car = localStorage.getItem("car");

  }

  return car || "";

}


/* API */

async function api(action,payload={}){

  const res = await fetch(GAS_API_URL,{
    method:'POST',
    headers:{
      'Content-Type':'text/plain;charset=utf-8'
    },
    body:JSON.stringify({
      action,
      ...payload
    })
  });

  return await res.json();

}


/* 載入路線 */

async function loadRoutes(){

  const result = await api('getRoutes');

  if(!result.ok) return;

  routeSelect.innerHTML = '<option value="">請選擇路線</option>';

  result.routes.forEach(r => {

    const opt = document.createElement('option');

    opt.value = r.name;
    opt.textContent = r.name;

    routeSelect.appendChild(opt);

    routeMap[r.name] = r.type;

  });

}


/* 路線變更 */

routeSelect.addEventListener('change',()=>{

  const type = routeMap[routeSelect.value];

  if(type === "專車"){

    noteArea.classList.remove('hidden');

  }else{

    noteArea.classList.add('hidden');

  }

});


/* 初始化 */

async function init(){

  try{

    currentCar = getCar();

    if(!currentCar){

      carText.textContent = "沒有取得車號";

      return;

    }

    carText.textContent = currentCar;

    await liff.init({
      liffId: LIFF_ID
    });

    if(!liff.isLoggedIn()){

      liff.login({
        redirectUri: window.location.href
      });

      return;

    }

    const profile = await liff.getProfile();

    currentLineId = profile.userId;

    const result = await api('getDriver',{
      lineId: currentLineId
    });

    if(result.found){

      currentDriverName = result.driverName;

      driverNameText.textContent = currentDriverName;

      driverArea.classList.remove('hidden');
      tripArea.classList.remove('hidden');

      await loadRoutes();

    }

    else{

      bindArea.classList.remove('hidden');

    }

  }

  catch(err){

    console.error(err);

    setMsg(err.message);

  }

}


/* 綁定司機 */

bindBtn.addEventListener('click', async ()=>{

  const name = nameInput.value.trim();

  if(!name){

    setMsg("請輸入姓名");

    return;

  }

  const result = await api('bindDriver',{
    lineId: currentLineId,
    name
  });

  if(result.ok){

    currentDriverName = name;

    driverNameText.textContent = name;

    bindArea.classList.add('hidden');

    driverArea.classList.remove('hidden');
    tripArea.classList.remove('hidden');

    await loadRoutes();

  }

});


/* 出車 */

tripBtn.addEventListener('click', async ()=>{

  const route = routeSelect.value;

  const note = noteInput.value.trim();

  if(!route){

    setMsg("請選擇路線");

    return;

  }

  if(routeMap[route] === "專車" && !note){

    setMsg("專車請填寫備註");

    return;

  }

  const result = await api('logTrip',{
    lineId: currentLineId,
    name: currentDriverName,
    car: currentCar,
    route: route,
    note: note
  });

  if(result.ok){

    setMsg("✅ 出車成功");

  }else{

    setMsg("出車失敗");

  }

});


init();

