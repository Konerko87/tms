const LIFF_ID = '2008915809-vp9PFMVX'

const GAS_API_URL =
'https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec'


let currentCar=''
let currentLineId=''
let currentDriverName=''
let selectedType=''

let routesData=[]


const carText=document.getElementById('carText')
const driverNameText=document.getElementById('driverNameText')

const bindArea=document.getElementById('bindArea')
const nameInput=document.getElementById('nameInput')
const bindBtn=document.getElementById('bindBtn')

const tripArea=document.getElementById('tripArea')

const routeBlock=document.getElementById('routeBlock')
const routeSelect=document.getElementById('routeSelect')

const noteArea=document.getElementById('noteArea')
const noteInput=document.getElementById('noteInput')

const tripBtn=document.getElementById('tripBtn')

const msg=document.getElementById('msg')


function setMsg(t){

msg.textContent=t||''

}


function getCar(){

const url=new URL(window.location.href)

let car=url.searchParams.get("car")

if(car)localStorage.setItem("car",car)

if(!car)car=localStorage.getItem("car")

return car||''

}


async function api(action,payload={}){

const params=new URLSearchParams({

action,
...payload

})

const res=await fetch(`${GAS_API_URL}?${params}`)

return await res.json()

}


async function loadRoutes(){

const result=await api('getRoutes')

if(!result.ok)return

routesData=result.routes

}


document.querySelectorAll('.task-btn').forEach(btn=>{

btn.onclick=()=>{

selectedType=btn.dataset.type

routeSelect.innerHTML=''


if(selectedType==="專車"){

routeBlock.classList.add('hidden')
noteArea.classList.remove('hidden')

return

}


if(selectedType==="區域司機"){

routeBlock.classList.add('hidden')
noteArea.classList.remove('hidden')

noteInput.placeholder="輸入區域 (例如 台中)"

return

}


noteArea.classList.add('hidden')
routeBlock.classList.remove('hidden')

const list=routesData.filter(r=>r.type===selectedType)

list.forEach(r=>{

const opt=document.createElement("option")

opt.value=r.name
opt.textContent=r.name

routeSelect.appendChild(opt)

})

}

})


async function init(){

currentCar=getCar()

if(!currentCar){

carText.textContent='沒有取得車號'
return

}

carText.textContent=currentCar


await liff.init({liffId:LIFF_ID})


if(!liff.isLoggedIn()){

liff.login({redirectUri:window.location.href})
return

}


const profile=await liff.getProfile()

currentLineId=profile.userId


const result=await api('getDriver',{lineId:currentLineId})


if(result.found){

currentDriverName=result.name

driverNameText.textContent=currentDriverName

tripArea.classList.remove('hidden')

await loadRoutes()

}else{

bindArea.classList.remove('hidden')

}

}


bindBtn.onclick=async()=>{

const name=nameInput.value.trim()

if(!name)return

await api('bindDriver',{lineId:currentLineId,name})

currentDriverName=name

driverNameText.textContent=name

bindArea.classList.add('hidden')

tripArea.classList.remove('hidden')

await loadRoutes()

}


tripBtn.onclick=async()=>{

const route=routeSelect.value
const note=noteInput.value


if(!selectedType){

setMsg("請選任務")
return

}


if(selectedType==="區域司機" && !note){

setMsg("請輸入區域")
return

}


if(selectedType!=="專車" && selectedType!=="區域司機" && !route){

setMsg("請選路線")
return

}


tripBtn.disabled=true


const result=await api('logTrip',{

lineId:currentLineId,
name:currentDriverName,
car:currentCar,
type:selectedType,
route:selectedType==="區域司機"?note:route,
note:selectedType==="區域司機"?'':note

})


if(result.ok){

setMsg("出車成功")

showVehicleStatus()

}else{

setMsg("出車失敗")

tripBtn.disabled=false

}

}


async function showVehicleStatus(){

const data=await api('getVehicleStatus',{car:currentCar})

if(!data.ok)return

alert(

`🚚 ${currentCar} 出車成功

保養剩餘 ${data.maintRemain} 天
下次保養 ${data.maintainDue}

驗車期限 ${data.inspectionDate}
剩餘 ${data.inspectionRemain} 天`

)

}


init()
