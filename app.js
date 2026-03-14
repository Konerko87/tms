const LIFF_ID = '2008915809-vp9PFMVX';

const GAS_API_URL =
'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec';


let currentCar = '';
let currentLineId = '';
let currentDriverName = '';
let selectedType = '';

let routesData = [];
let areasData = [];


/* DOM */

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


/* UI */

function setMsg(t){
msg.textContent=t||''
}

function showLoading(text='讀取中...'){
loadingText.textContent=text
loadingMask.classList.remove('hidden')
}

function hideLoading(){
loadingMask.classList.add('hidden')
}

function openVehicleModal(){
vehicleModal.classList.remove('hidden')
}

function closeVehicleModal(){
vehicleModal.classList.add('hidden')
}

closeVehicleModalBtn.onclick=closeVehicleModal



/* 車號 */

function getCar(){

const url=new URL(window.location.href)

let car=url.searchParams.get("car")

if(car)localStorage.setItem("car",car)

if(!car)car=localStorage.getItem("car")

return car||''

}


/* API */

async function api(action,payload={}){

const res=await fetch(GAS_API_URL,{
method:'POST',
headers:{
'Content-Type':'application/json'
},
body:JSON.stringify({
action,
...payload
})
})

return await res.json()

}


/* 路線 */

async function loadRoutes(){

const result=await api('getRoutes')

if(!result.ok)return

routesData=result.routes||[]

}


/* 區域 */

async function loadAreas(){

const result=await api('getAreas')

if(!result.ok)return

areasData=result.areas||[]

}


/* 清除任務樣式 */

function clearTaskSelectedStyle(){

document.querySelectorAll('.task-btn').forEach(btn=>{
btn.classList.remove('selected-task')
})

}


/* 路線 */

function renderRoutesByType(type){

routeSelect.innerHTML='<option value="">請選擇路線</option>'

const list=routesData.filter(r=>r.type===type)

list.forEach(r=>{

const opt=document.createElement("option")

opt.value=r.name
opt.textContent=r.name

routeSelect.appendChild(opt)

})

}


/* 區域 */

function renderAreas(){

areaSelect.innerHTML='<option value="">請選擇區域</option>'

areasData.forEach(area=>{

const opt=document.createElement("option")

opt.value=area
opt.textContent=area

areaSelect.appendChild(opt)

})

}


/* 任務按鈕 */

document.querySelectorAll('.task-btn').forEach(btn=>{

btn.onclick=()=>{

clearTaskSelectedStyle()

btn.classList.add('selected-task')

selectedType=btn.dataset.type

setMsg('')

routeBlock.classList.add('hidden')
areaBlock.classList.add('hidden')
noteArea.classList.add('hidden')

noteInput.value=''

if(selectedType==="專車"){

noteArea.classList.remove('hidden')
noteInput.placeholder='例如：楊梅專車'
return

}

if(selectedType==="區域司機"){

areaBlock.classList.remove('hidden')
renderAreas()
return

}

routeBlock.classList.remove('hidden')
renderRoutesByType(selectedType)

}

})



/* 初始化 */

async function init(){

try{

showLoading('登入中...')

currentCar=getCar()

if(!currentCar){

carText.textContent='沒有取得車號'
hideLoading()
return

}

carText.textContent=currentCar


await liff.init({liffId:LIFF_ID})


if(!liff.isLoggedIn()){

showLoading('LINE登入中...')
liff.login({redirectUri:window.location.href})
return

}


const profile=await liff.getProfile()

currentLineId=profile.userId


showLoading('讀取司機資料...')

const result=await api('getDriver',{lineId:currentLineId})


if(result.found){

currentDriverName=result.name||''

driverNameText.textContent=currentDriverName

await loadRoutes()
await loadAreas()

tripArea.classList.remove('hidden')

setMsg('登入成功')

}else{

bindArea.classList.remove('hidden')

setMsg('第一次使用，請綁定司機')

}

hideLoading()

}catch(err){

hideLoading()

setMsg('初始化失敗')

console.error(err)

}

}



/* 綁定司機 */

bindBtn.onclick=async()=>{

const name=nameInput.value.trim()

if(!name){

setMsg('請輸入姓名')
return

}

showLoading('綁定司機中...')

const result=await api('bindDriver',{
lineId:currentLineId,
name
})

hideLoading()

if(!result.ok){

setMsg('綁定失敗')
return

}

currentDriverName=name

driverNameText.textContent=name

bindArea.classList.add('hidden')

await loadRoutes()
await loadAreas()

tripArea.classList.remove('hidden')

setMsg('綁定成功')

}



/* 出車 */

tripBtn.onclick=async()=>{

if(tripBtn.disabled)return

const route=routeSelect.value
const area=areaSelect.value
const note=noteInput.value.trim()


if(!selectedType){

setMsg('請選任務')
return

}


if(selectedType==="區域司機"&&!area){

setMsg('請選區域')
return

}


if(
selectedType!=="專車"&&
selectedType!=="區域司機"&&
!route
){

setMsg('請選路線')
return

}


if(selectedType==="專車"&&!note){

setMsg('請填備註')
return

}


tripBtn.disabled=true


const finalRoute=selectedType==="區域司機"?area:route
const finalNote=selectedType==="區域司機"?'':note


showLoading('出車送出中...')


const result=await api('logTrip',{

lineId:currentLineId,
name:currentDriverName,
car:currentCar,
type:selectedType,
route:finalRoute,
note:finalNote

})


hideLoading()


if(!result.ok){

setMsg('出車失敗')
tripBtn.disabled=false
return

}


/* 成功動畫 */

tripBtn.textContent='✓ 出車成功'
tripBtn.style.background='#22c55e'


await showVehicleStatus()

}



/* 車輛提醒 */

async function showVehicleStatus(){

const data=await api('getVehicleStatus',{car:currentCar})


if(!data.ok){

vehicleModalTitle.textContent='車輛提醒'

vehicleModalContent.textContent=`🚚 ${currentCar}

查無車輛資料`

openVehicleModal()

return

}


let maintainColor=''
let inspectColor=''


if(data.maintRemain<=7){

maintainColor='⚠️'

}


if(data.inspectionRemain<=30){

inspectColor='🚨'

}


const maintainText=`

${maintainColor} 保養提醒
上次保養：${data.lastMaintainDate}
下次保養：${data.maintainDueDate}
剩餘：${data.maintRemain} 天
`


const inspectText=`

${inspectColor} 驗車提醒
上次驗車：${data.lastInspectionDate}
驗車期限：${data.inspectionDueDate}
剩餘：${data.inspectionRemain} 天
`


vehicleModalTitle.textContent=`🚚 ${currentCar}`

vehicleModalContent.textContent=maintainText+inspectText

openVehicleModal()

}



/* 保養完成 */

maintBtn.onclick=async()=>{

const yes=confirm(`確認已完成保養？\n${currentCar}`)

if(!yes)return

await api('completeMaintain',{car:currentCar})

await showVehicleStatus()

}



/* 驗車完成 */

inspectBtn.onclick=async()=>{

const yes=confirm(`確認已完成驗車？\n${currentCar}`)

if(!yes)return

await api('completeInspection',{car:currentCar})

await showVehicleStatus()

}



/* 啟動 */

document.addEventListener("DOMContentLoaded",()=>{

init()

})
