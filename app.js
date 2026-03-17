const LIFF_ID = '2008915809-vp9PFMVX';

const GAS_API_URL =
'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec';

let currentCar='';
let currentLineId='';
let currentDriverName='';
let selectedType='';

let routesData=[];
let areasData=[];

const carText=document.getElementById('carText');
const driverNameText=document.getElementById('driverNameText');

const bindArea=document.getElementById('bindArea');
const nameInput=document.getElementById('nameInput');
const bindBtn=document.getElementById('bindBtn');

const tripArea=document.getElementById('tripArea');

const routeBlock=document.getElementById('routeBlock');
const routeSelect=document.getElementById('routeSelect');

const areaBlock=document.getElementById('areaBlock');
const areaSelect=document.getElementById('areaSelect');

const noteArea=document.getElementById('noteArea');
const noteInput=document.getElementById('noteInput');

const tripBtn=document.getElementById('tripBtn');
const msg=document.getElementById('msg');

const loadingMask=document.getElementById('loadingMask');
const loadingText=document.getElementById('loadingText');

const vehicleModal=document.getElementById('vehicleModal');
const vehicleModalTitle=document.getElementById('vehicleModalTitle');
const vehicleModalContent=document.getElementById('vehicleModalContent');

const maintBtn=document.getElementById('maintBtn');
const inspectBtn=document.getElementById('inspectBtn');
const closeVehicleModalBtn=document.getElementById('closeVehicleModalBtn');

/***********************
⭐ 強制補抓 car（最強版）
***********************/
(function(){

try{

const full = window.location.href;

let match = full.match(/[?&]car=([^&#]+)/);

if(!match){
match = full.match(/#car=([^&#]+)/);
}

if(match && match[1]){

let c = match[1];

try{
c = decodeURIComponent(c);
}catch(e){}

c = c.trim().toUpperCase();

/* ⭐ 雙寫入 */
localStorage.setItem('car', c);
sessionStorage.setItem('car', c);

console.log('強制寫入car:', c);

}

}catch(e){
console.warn('car parse error', e);
}

})();

/***********************
UI helpers
***********************/
function setMsg(t){
msg.textContent=t||'';
}

function showLoading(text='讀取中...'){
loadingText.textContent=text;
loadingMask.classList.remove('hidden');
}

function hideLoading(){
loadingMask.classList.add('hidden');
}

/***********************
車號取得（最終穩定）
***********************/
function getCar(){

let car='';

const url=new URL(window.location.href);

/* 1 query */
car=url.searchParams.get('car');

/* 2 hash */
if(!car){
const hash=window.location.hash;
if(hash && hash.includes('car=')){
const params=new URLSearchParams(hash.replace('#',''));
car=params.get('car');
}
}

/* 3 sessionStorage */
if(!car){
car=sessionStorage.getItem('car');
}

/* 4 localStorage */
if(!car){
car=localStorage.getItem('car');
}

/* 5 regex */
if(!car){
const full = window.location.href;
const match = full.match(/car=([^&#]+)/);
if(match){
car = match[1];
}
}

if(car){

try{
car = decodeURIComponent(car);
}catch(e){}

car=car.trim().toUpperCase();

/* ⭐ 再寫一次確保同步 */
localStorage.setItem('car',car);
sessionStorage.setItem('car',car);

}

return car||'';

}

/***********************
API（防卡死）
***********************/
async function api(action,payload={}){

const url=
GAS_API_URL+
'?action='+
encodeURIComponent(action)+
'&'+
new URLSearchParams(payload).toString();

const controller = new AbortController();
const timeout = setTimeout(()=>controller.abort(),8000);

try{

const res=await fetch(url,{signal:controller.signal});
const text=await res.text();

console.log('API:',text);

return JSON.parse(text);

}catch(e){

console.error('API錯誤',e);
return {ok:false};

}finally{
clearTimeout(timeout);
}

}

/***********************
初始化（重點修正）
***********************/
async function init(){

try{

showLoading('初始化中...');

/* ⭐ 一定先抓 car */
currentCar=getCar();

if(!currentCar){
carText.textContent='❌ 沒有取得車號';
hideLoading();
return;
}

carText.textContent=currentCar;

/* ⭐ LIFF init */
await liff.init({liffId:LIFF_ID});

/* ⭐ login（不能用 href） */
if(!liff.isLoggedIn()){

const redirectUrl =
window.location.origin +
window.location.pathname +
window.location.search +
window.location.hash;

liff.login({redirectUri:redirectUrl});
return;

}

/* 取得 user */
let profile;

try{
profile=await liff.getProfile();
currentLineId=profile.userId;
}catch(e){
const idToken=liff.getDecodedIDToken();
currentLineId=idToken.sub;
}

/* 讀資料 */
showLoading('讀取資料...');

const initResult=await api('initData',{lineId:currentLineId});

routesData=initResult.routes||[];
areasData=initResult.areas||[];

const driver=initResult.driver||{};

if(driver.found){

currentDriverName=driver.name;
driverNameText.textContent=currentDriverName;

bindArea.classList.add('hidden');
tripArea.classList.remove('hidden');

}else{

driverNameText.textContent='未綁定';

bindArea.classList.remove('hidden');
tripArea.classList.add('hidden');

}

hideLoading();

}catch(err){

console.error(err);
driverNameText.textContent='初始化失敗';
hideLoading();

}

}

/***********************
綁定司機
***********************/
bindBtn.onclick=async()=>{

try{

const name=nameInput.value.trim();

if(!name){
setMsg('請輸入姓名');
return;
}

showLoading('綁定中...');

const result=await api('bindDriver',{
lineId:currentLineId,
name
});

hideLoading();

if(!result.ok){
setMsg('綁定失敗');
return;
}

currentDriverName=name;
driverNameText.textContent=name;

bindArea.classList.add('hidden');
tripArea.classList.remove('hidden');

}catch(e){
hideLoading();
setMsg('錯誤');
}

};

/***********************
出車
***********************/
tripBtn.onclick=async()=>{

try{

if(tripBtn.disabled)return;

const route=routeSelect.value;
const area=areaSelect.value;
const note=noteInput.value.trim();

if(!selectedType){
setMsg('請選任務');
return;
}

if(selectedType==='區域司機'&&!area){
setMsg('請選區域');
return;
}

if(selectedType!=='專車'&&selectedType!=='區域司機'&&!route){
setMsg('請選路線');
return;
}

if(selectedType==='專車'&&!note){
setMsg('請填備註');
return;
}

tripBtn.disabled=true;

const finalRoute=
selectedType==='區域司機'?area:route;

const finalNote=
selectedType==='區域司機'?'':note;

showLoading('🚚 出車送出中...');

const result=await api('logTrip',{
lineId:currentLineId,
name:currentDriverName,
car:currentCar,
type:selectedType,
route:finalRoute,
note:finalNote
});

if(!result.ok){
hideLoading();
setMsg('出車失敗');
tripBtn.disabled=false;
return;
}

tripBtn.textContent='✓ 出車成功';

showLoading('檢查車輛狀態...');

await new Promise(r=>setTimeout(r,1000));

await showVehicleStatus();

hideLoading();

}catch(e){
hideLoading();
tripBtn.disabled=false;
setMsg('系統錯誤');
}

};

/***********************
車輛狀態
***********************/
async function showVehicleStatus(){

try{

const data=await api('getVehicleStatus',{car:currentCar});

vehicleModalTitle.textContent='🚚 '+currentCar;

vehicleModalContent.textContent=
`保養：${data.maintRemain||'-'}天
驗車：${data.inspectionRemain||'-'}天`;

vehicleModal.classList.remove('hidden');

}catch(e){
console.error(e);
}

}

/***********************
完成按鈕
***********************/
maintBtn.onclick=async()=>{

if(!confirm('確認已完成保養？'))return;

await api('completeMaintain',{car:currentCar});
alert('保養完成');

};

inspectBtn.onclick=async()=>{

if(!confirm('確認已完成驗車？'))return;

await api('completeInspection',{car:currentCar});
alert('驗車完成');

};

closeVehicleModalBtn.onclick=()=>{

if(window.liff){
liff.closeWindow();
}else{
window.close();
}

};

/***********************
Start
***********************/
document.addEventListener('DOMContentLoaded',init);
