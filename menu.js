"use strict";
/* Shared navigation for RunBeat tracker + date-based diary.
   The playlist page intentionally remains out of scope. */
(() => {
  const panel=document.getElementById("appMenuPanel");
  const openButtons=[
    document.getElementById("menuButton"),
    document.getElementById("diaryMenuButton"),
    document.getElementById("diaryEditorMenuButton")
  ];
  const homeLink=document.getElementById("menuRunBeat");
  const diaryLink=document.getElementById("menuDiary");
  const diaryRoot=document.getElementById("diaryRoot");
  if(!panel || !homeLink || !diaryLink || !diaryRoot || openButtons.some(button=>!button))return;
  let lastTrigger=null;
  const closeMenu=()=>{
    panel.hidden=true;
    openButtons.forEach(button=>button.setAttribute("aria-expanded","false"));
  };
  const setCurrentLocation=()=>{
    const isDiary=!diaryRoot.hidden;
    if(isDiary){
      diaryLink.setAttribute("aria-current","page");
      homeLink.removeAttribute("aria-current");
    }else{
      homeLink.setAttribute("aria-current","page");
      diaryLink.removeAttribute("aria-current");
    }
  };
  openButtons.forEach(button=>{
    button.addEventListener("click",()=>{
      if(!panel.hidden){
        closeMenu();
        return;
      }
      closeMenu();
      setCurrentLocation();
      panel.hidden=false;
      lastTrigger=button;
      button.setAttribute("aria-expanded","true");
    });
  });
  const navigate=(destination)=>{
    const handler=window.RunBeatNavigation && window.RunBeatNavigation[destination];
    if(typeof handler!=="function"){
      console.error("RunBeat Diary navigation is unavailable. Check diary.js loading.");
      alert("화면을 열 수 없어요. 사이트를 새로고침한 뒤 다시 시도해 주세요.");
      return;
    }
    try{
      const success=handler();
      if(success===false)return; // The user cancelled the navigation.
      closeMenu();
      setCurrentLocation();
    }catch(error){
      console.error("RunBeat menu navigation failed:",error);
      alert("화면 이동 중 오류가 발생했어요. 새로고침 후 다시 시도해 주세요.");
    }
  };
  homeLink.addEventListener("click",()=>navigate("toRunBeat"));
  diaryLink.addEventListener("click",()=>navigate("toDiary"));
  document.addEventListener("pointerdown",event=>{
    if(panel.hidden || panel.contains(event.target) || openButtons.some(button=>button.contains(event.target)))return;
    closeMenu();
  });
  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape" || panel.hidden)return;
    closeMenu();
    lastTrigger?.focus();
  });
})();
