const LIFF_ID='2008915809-vp9PFMVX'

const GAS_API_URL='https://script.google.com/macros/s/AKfycbzTy3tN4O_cSQCz2f2Yp8ypCmmOvttJN6OJQOU02TP1-s3_RbXfOUL6oCrmC2XJcOH5/exec'

let currentCar=''
let currentLineId=''
let currentDriverName=''
let routesData=[]

const carText=document.getElementById('carText')
const driverArea=document.getElementById('driverArea')
const driverNameText=document.getElementById('driverNameText')

const bindArea=document.getElementById('bindArea')
const nameInput=document.getElementById('nameInput')
const bindBtn=document.getElementById('bindBtn')

const tripArea=document.getElementById('tripArea')

const taskTypeSelect=document.getElementById('taskTypeSelect')
const routeSelect=document.getElementById('routeSelect')

const routeBlock=document.getElementById('routeBlock')
const noteArea=document.getElementById('noteArea')
const noteInput=document.getElementById('noteInput')

const tripBtn=document.getElementById('tripBtn')
const msg=document.getElementById('msg')

function setMsg(t){msg.textContent=t||''}

function getCar(){

const url=new URL(window.location.href)

let car=url.searchParams.get("car")

if(car)localStorage.setItem("car",car)

if(!car)car=localStorage.getItem("car")

return car||""

}

async function api(action,payload={})

{

const res=await fetch(GAS_API_URL,{

method:'POST',

headers:{'Content-Type':'text/plain'},

body:JSON.stringify({action,...payload})

})

return await res.json()

}

async function loadRoutes(){

const result=await api('getRoutes')

if(!result.ok)return

routesData=result.routes

}

taskTypeSelect.addEventListener('change',()=>{

const type=taskTypeSelect.value

routeSelect.innerHTML=''

if(type==="專車"){

routeBlock.classList.add('hidden')
noteArea.classList.remove('hidden')
return

}

noteArea.classList.add('hidden')
routeBlock.classList.remove('hidden')

const list=routesData.filter(r=>r.type===type)

list.forEach(r=>{

const opt=document.createElement("option")

opt.value=r.name
opt.textContent=r.name

routeSelect.appendChild(opt)

})

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

currentDriverName=result.driverName

driverNameText.textContent=currentDriverName

driverArea.classList.remove('hidden')
tripArea.classList.remove('hidden')

await loadRoutes()

}

else{

bindArea.classList.remove('hidden')

}

}

bindBtn.addEventListener('click',async()=>{

const name=nameInput.value.trim()

if(!name)return

await api('bindDriver',{lineId:currentLineId,name})

currentDriverName=name

driverNameText.textContent=name

bindArea.classList.add('hidden')
driverArea.classList.remove('hidden')
tripArea.classList.remove('hidden')

await loadRoutes()

})

tripBtn.addEventListener('click',async()=>{

if(tripBtn.disabled)return

const type=taskTypeSelect.value
const route=routeSelect.value
const note=noteInput.value

if(!type){

setMsg("請選任務")
return

}

if(type!=="專車"&&!route){

setMsg("請選路線")
return

}

if(type==="專車"&&!note){

setMsg("請填備註")
return

}

tripBtn.disabled=true

const result=await api('logTrip',{

lineId:currentLineId,
name:currentDriverName,
car:currentCar,
type:type,
route:route,
note:note

})

if(result.ok){

setMsg("出車成功")
tripBtn.innerText="已出車"

}else{

setMsg(result.message)
tripBtn.disabled=false

}

})

init()

