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


/* 取得車號 */

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
headers:{'Content-Type':'text/plain'},
body:JSON.stringify({action,...payload})
})

return await res.json()

}


/* 讀取 routes */

async function loadRoutes(){

const result=await api('getRoutes')

if(!result.ok)return

routesData=result.routes

}


/* 任務按鈕 */

document.querySelectorAll('.task-btn').forEach(btn=>{

btn.addEventListener('click',()=>{

selectedType=btn.dataset.type

routeSelect.innerHTML=''

/* 專車 */

if(selectedType==="專車"){

routeBlock.classList.add('hidden')
noteArea.classList.remove('hidden')

return

}

/* 區域司機 */

if(selectedType==="區域司機"){

routeBlock.classList.add('hidden')
noteArea.classList.remove('hidden')

noteInput.placeholder="請輸入區域 (例如 台中)"

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

})

})


/* 初始化 */

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

tripArea.classList.remove('hidden')

await loadRoutes()

}else{

bindArea.classList.remove('hidden')

}

}


/* 綁定司機 */

bindBtn.addEventListener('click',async()=>{

const name=nameInput.value.trim()

if(!name)return

await api('bindDriver',{lineId:currentLineId,name})

currentDriverName=name

driverNameText.textContent=name

bindArea.classList.add('hidden')

tripArea.classList.remove('hidden')

await loadRoutes()

})


/* 出車 */

tripBtn.addEventListener('click',async()=>{

if(tripBtn.disabled)return

const route=routeSelect.value
const note=noteInput.value

if(!selectedType){

setMsg("請選任務")
return

}

if(selectedType==="區域司機"){

if(!note){
setMsg("請輸入區域")
return
}

}

if(selectedType!=="專車" && selectedType!=="區域司機" && !route){

setMsg("請選路線")
return

}

if(selectedType==="專車"&&!note){

setMsg("請填備註")
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

tripBtn.innerText="已出車"

showVehicleStatus()

}else{

setMsg(result.message)

tripBtn.disabled=false

}

})



/* 車輛提醒 */

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


/* 更新保養 */

async function finishMaintenance(){

const yes=confirm("確認保養完成？")

if(!yes)return

await api('finishMaintenance',{car:currentCar})

alert("保養已更新")

}


/* 更新驗車 */

async function finishInspection(){

const yes=confirm("確認驗車完成？")

if(!yes)return

await api('finishInspection',{car:currentCar})

alert("驗車已更新")

}


init()


init()



