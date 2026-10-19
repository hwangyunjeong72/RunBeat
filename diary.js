"use strict";
/* RunBeat Diary: no account, no remote database, user content rendered via textContent. */
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "runbeat-diary-v1";
  const home = document.querySelector("#app > .inner");
  const root = $("diaryRoot"), calendarScreen = $("diaryCalendarScreen"), editorScreen = $("diaryEditorScreen");
  const dateKey = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const today = dateKey(new Date());
  const validDate = s => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y,m,d]=s.split("-").map(Number);
    const check=new Date(y,m-1,d);
    return y>=2020 && y<=2100 && check.getFullYear()===y && check.getMonth()===m-1 && check.getDate()===d;
  };
  const node = (tag,className,text) => {
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!==undefined)el.textContent=String(text);
    return el;
  };
  const parseDuration = raw => {
    const s=String(raw||"").trim(), groups=s.split(":");
    if(!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(s))return null;
    const p=groups.map(Number), seconds=p.length===2?p[0]*60+p[1]:p[0]*3600+p[1]*60+p[2];
    if(p.length===2 && p[1]>=60)return null;
    if(p.length===3 && (p[1]>=60||p[2]>=60))return null;
    return seconds>0 && seconds<=86400?seconds:null;
  };
  const formatDuration = value => {
    if(!Number.isFinite(value)||value<=0)return "";
    const seconds=Math.round(value);
    if(seconds>=3600)return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(x=>String(x).padStart(2,"0")).join(":");
    return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
  };
  const pace = (seconds,km) => {
    if(!(seconds>0&&km>0))return "--:--";
    const perKm=Math.round(seconds/km);
    return String(Math.floor(perKm/60)).padStart(2,"0")+":"+String(perKm%60).padStart(2,"0");
  };
  const normalize = data => {
    if(!Array.isArray(data))return [];
    return data.filter(e=>e&&typeof e==="object"&&typeof e.id==="string"&&validDate(e.date)
      &&Number.isFinite(e.km)&&e.km>0&&e.km<=999&&Number.isFinite(e.seconds)&&e.seconds>0&&e.seconds<=86400)
      .map(e=>({
        id:e.id.slice(0,100),date:e.date,km:e.km,seconds:e.seconds,
        genre:typeof e.genre==="string"?e.genre.slice(0,60):"",
        mood:["힘듦","보통","좋음"].includes(e.mood)?e.mood:"보통",
        walk:Number.isInteger(e.walk)&&e.walk>=0&&e.walk<=100000?e.walk:null,
        effort:Number.isInteger(e.effort)&&e.effort>=1&&e.effort<=10?e.effort:null,
        note:typeof e.note==="string"?e.note.slice(0,1200):"",
        created:Number.isFinite(e.created)?e.created:0
      })).slice(0,2000);
  };
  const readRecords=()=>{
    try{return normalize(JSON.parse(localStorage.getItem(KEY)||"[]"));}
    catch(error){console.warn("RunBeat diary load:",error);return [];}
  };
  let records=readRecords();
  let selected=today, shownMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1), editing=null;
  const persist = next => {
    try {localStorage.setItem(KEY,JSON.stringify(next));records=next;return true;}
    catch(error) { console.error("RunBeat diary save:",error);alert("이 기기에서 기록을 저장할 수 없어요. 브라우저 저장 공간 또는 시크릿 모드를 확인해 주세요.");return false;}
  };
  const monthId = d => dateKey(d).slice(0,7);
  const entriesForDay = day => records.filter(e=>e.date===day).sort((a,b)=>b.created-a.created);
  const scrollTop=()=>window.scrollTo({top:0,behavior:"instant"});
  const countText=(n,unit)=>{const el=node("span","count",n);el.append(node("span","unit",unit));return el;};
  const renderStats=()=>{
    const inMonth=records.filter(e=>e.date.startsWith(monthId(shownMonth)));
    const km=inMonth.reduce((sum,e)=>sum+e.km,0);
    const seconds=inMonth.reduce((sum,e)=>sum+e.seconds,0);
    $("diaryStatDistance").replaceChildren(countText(km.toFixed(2),"km"));
    $("diaryStatRuns").replaceChildren(countText(inMonth.length,"회"));
    $("diaryStatPace").replaceChildren(countText(pace(seconds,km),"/km"));
  };
  const renderCalendar=()=>{
    const y=shownMonth.getFullYear(),m=shownMonth.getMonth();
    $("diaryMonthLabel").textContent=y+"년 "+(m+1)+"월";
    const firstWeekday=new Date(y,m,1).getDay();
    const max=new Date(y,m+1,0).getDate();
    const fragment=document.createDocumentFragment();
    const recordedDays=new Set(records.filter(e=>e.date.startsWith(monthId(shownMonth))).map(e=>e.date));
    for(let i=0;i<firstWeekday;i++)fragment.append(node("div","diary-blank"));
    for(let day=1;day<=max;day++){
      const date=dateKey(new Date(y,m,day));
      const button=node("button","diary-day",day);
      button.type="button";
      button.classList.toggle("selected",date===selected);
      button.classList.toggle("today",date===today);
      button.setAttribute("aria-label",date+(recordedDays.has(date)?", 기록 있음":""));
      button.setAttribute("aria-pressed",date===selected?"true":"false");
      if(recordedDays.has(date))button.append(node("span","diary-dot"));
      button.addEventListener("click",()=>{selected=date;renderCalendar();renderEntries();});
      fragment.append(button);
    }
    $("diaryDays").replaceChildren(fragment);
    renderStats();
  };
  const metric=(label,value)=>{
    const wrap=node("div");
    wrap.append(node("span","tag",label),node("strong","",value));
    return wrap;
  };
  const renderEntries=()=>{
    const [y,m,d]=selected.split("-").map(Number);
    $("diaryDayTitle").textContent=m+"월 "+d+"일 기록";
    const matches=entriesForDay(selected);
    $("diaryDayCount").textContent=matches.length?matches.length+"개 기록":"기록 없음";
    const target=$("diaryEntries");target.replaceChildren();
    if(!matches.length){
      target.append(node("div","diary-empty","아직 이날의 러닝 기록이 없어요.\n아래 버튼으로 첫 기록을 남겨 보세요."));
      return;
    }
    for(const record of matches){
      const card=node("article","diary-entry");
      const head=node("div","diary-entry-head");
      const title=node("span","diary-entry-title","🎧 "+(record.genre||"음악 미입력"));
      const state=node("span","diary-pill",record.mood);
      head.append(title,state);card.append(head);
      const mini=node("div","diary-mini");
      mini.append(metric("거리",record.km.toFixed(2)+" km"),
        metric("운동 시간",formatDuration(record.seconds)),
        metric("평균 페이스",pace(record.seconds,record.km)));
      card.append(mini);
      const extras=[];
      if(record.walk!==null)extras.push("걷기 "+record.walk+"회");
      if(record.effort!==null)extras.push("운동강도 "+record.effort+"/10");
      if(extras.length)card.append(node("p","diary-entry-notes",extras.join(" · ")));
      if(record.note)card.append(node("p","diary-entry-notes",record.note));
      const actions=node("div","diary-entry-actions");
      const edit=node("button","","✏️ 수정"),remove=node("button","diary-delete","삭제");
      edit.type=remove.type="button";
      edit.addEventListener("click",()=>openEditor(record));
      remove.addEventListener("click",()=>{
        if(!window.confirm(selected+" 러닝 기록을 삭제할까요?"))return;
        if(persist(records.filter(e=>e.id!==record.id))){renderCalendar();renderEntries();}
      });
      actions.append(edit,remove);card.append(actions);target.append(card);
    }
  };
  const openCalendar=(date)=>{
    if(date&&validDate(date))selected=date;
    shownMonth=new Date(Number(selected.slice(0,4)),Number(selected.slice(5,7))-1,1);
    home.hidden=true;root.hidden=false;calendarScreen.hidden=false;editorScreen.hidden=true;
    renderCalendar();renderEntries();scrollTop();
  };
  const returnHome=()=>{
    root.hidden=true;home.hidden=false;calendarScreen.hidden=false;editorScreen.hidden=true;scrollTop();
  };
  const updatePreview=()=>{
    const km=Number($("diaryKm").value),seconds=parseDuration($("diaryDuration").value);
    $("diaryPacePreview").textContent=km>0&&km<=999&&seconds!==null?pace(seconds,km)+" /km":"--:-- /km";
  };
  const openEditor=(record=null,fromRun=null)=>{
    editing=record?record.id:null;
    const form=$("diaryForm");form.reset();
    $("diaryEditorTitle").textContent=record?"러닝 일기 수정":"새 러닝 일기 작성";
    $("diarySubmit").textContent=record?"수정한 일기 저장":"일기 저장하기";
    $("diaryDate").value=record?.date || fromRun?.date || selected;
    $("diaryGenre").value=record?.genre || fromRun?.genre || "";
    $("diaryKm").value=record?record.km:(fromRun?.km>0?Number(fromRun.km.toFixed(3)):"");
    $("diaryDuration").value=record?formatDuration(record.seconds):(fromRun?.seconds>0?formatDuration(fromRun.seconds):"");
    $("diaryMood").value=record?.mood || "보통";
    $("diaryWalk").value=record?.walk??"";
    $("diaryEffort").value=record?.effort??"";
    $("diaryNote").value=record?.note||"";
    updatePreview();
    home.hidden=true;root.hidden=false;calendarScreen.hidden=true;editorScreen.hidden=false;
    scrollTop();
  };
  const newId=()=>typeof crypto!=="undefined"&&crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+"-"+String(Math.random());
  $("openDiaryButton").addEventListener("click",()=>{
    if($("startButton").disabled){alert("운동 기록을 먼저 종료한 뒤 다이어리를 열어 주세요.");return;}
    openCalendar(today);
  });
  $("diaryHomeBack").addEventListener("click",returnHome);
  $("diaryEditorBack").addEventListener("click",()=>openCalendar(selected));
  $("diaryCancel").addEventListener("click",()=>openCalendar(selected));
  $("diaryPrevMonth").addEventListener("click",()=>{
    shownMonth=new Date(shownMonth.getFullYear(),shownMonth.getMonth()-1,1);
    selected=dateKey(shownMonth);renderCalendar();renderEntries();
  });
  $("diaryNextMonth").addEventListener("click",()=>{
    shownMonth=new Date(shownMonth.getFullYear(),shownMonth.getMonth()+1,1);
    selected=dateKey(shownMonth);renderCalendar();renderEntries();
  });
  $("diaryAddButton").addEventListener("click",()=>openEditor());
  ["diaryKm","diaryDuration"].forEach(id=>$(id).addEventListener("input",updatePreview));
  $("diaryForm").addEventListener("submit",e=>{
    e.preventDefault();
    const date=$("diaryDate").value;
    const km=Number($("diaryKm").value);
    const seconds=parseDuration($("diaryDuration").value);
    const genre=$("diaryGenre").value.trim();
    const walkRaw=$("diaryWalk").value.trim(),effortRaw=$("diaryEffort").value.trim();
    const walk=walkRaw===""?null:Number(walkRaw),effort=effortRaw===""?null:Number(effortRaw);
    if(!validDate(date)){alert("2020~2100년 사이의 올바른 날짜를 선택해 주세요.");return;}
    if(!$("diaryKm").value.trim()||!Number.isFinite(km)||km<=0||km>999){
      alert("거리는 0보다 크고 999km 이하로 입력해 주세요.");$("diaryKm").focus();return;
    }
    if(seconds===null){alert("시간은 09:22 또는 01:09:22 형태로 입력해 주세요.");$("diaryDuration").focus();return;}
    if(genre.length>60){alert("음악 장르는 60자 이내로 작성해 주세요.");return;}
    if(walk!==null&&(!Number.isInteger(walk)||walk<0||walk>100000)){alert("걷기 횟수는 0~100000 사이의 정수로 입력해 주세요.");return;}
    if(effort!==null&&(!Number.isInteger(effort)||effort<1||effort>10)){alert("운동강도는 1~10 사이로 입력해 주세요.");return;}
    const old=records.find(record=>record.id===editing);
    const item={id:old?.id||newId(),date,km,seconds,genre,mood:$("diaryMood").value,
      walk,effort,note:$("diaryNote").value.slice(0,1200),created:old?.created||Date.now()};
    const next=old?records.map(v=>v.id===old.id?item:v):[...records,item];
    if(!persist(next))return;
    editing=null;openCalendar(date);
  });
  // Shared navigation menu: users can switch between the run tracker and their diary.
  // Prevent losing an unsaved diary entry without confirmation.
  const confirmLeaveEditor=()=>editorScreen.hidden || window.confirm("작성 중인 일기가 저장되지 않았어요. 화면을 이동할까요?");
  const goToRunBeat=()=>{
    if(!confirmLeaveEditor())return false;
    returnHome();
    return true;
  };
  const goToDiary=()=>{
    if(root.hidden && $("startButton").disabled){
      alert("진행 중인 러닝을 먼저 종료한 뒤 기록 작성/모음으로 이동해 주세요.");
      return false;
    }
    if(!confirmLeaveEditor())return false;
    openCalendar(root.hidden?today:selected);
    return true;
  };
  // The menu calls these functions directly, without an event-only navigation bridge.
  window.RunBeatNavigation={toRunBeat:goToRunBeat,toDiary:goToDiary};
  window.addEventListener("runbeat:navigate-home",goToRunBeat);
  window.addEventListener("runbeat:navigate-diary",goToDiary);
  window.addEventListener("runbeat:write-diary",event=>{
    const data=event.detail;
    if(!data)return;
    if(data.date&&validDate(data.date))selected=data.date;
    openEditor(null,data);
  });
})();
