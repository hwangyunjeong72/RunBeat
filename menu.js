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
  const navigate=(eventType)=>{
    closeMenu();
    window.dispatchEvent(new Event(eventType));
  };
  homeLink.addEventListener("click",()=>navigate("runbeat:navigate-home"));
  diaryLink.addEventListener("click",()=>navigate("runbeat:navigate-diary"));
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
