"use strict";
/* RunBeat: switch safely between tracker, Diary and PlayList. */
(() => {
  const $=id=>document.getElementById(id);
  const panel=$("appMenuPanel");
  const triggers=["menuButton","diaryMenuButton","diaryEditorMenuButton","playlistMenuButton","playlistEditorMenuButton"].map($);
  const links={run:$("menuRunBeat"),diary:$("menuDiary"),playlist:$("menuPlaylist")};
  const roots={diary:$("diaryRoot"),playlist:$("playlistRoot")};
  if(!panel||triggers.some(b=>!b)||Object.values(links).some(b=>!b)||Object.values(roots).some(r=>!r))return;
  let lastTrigger=null;
  const close=()=>{
    panel.hidden=true;
    triggers.forEach(b=>b.setAttribute("aria-expanded","false"));
  };
  const updateCurrent=()=>{
    const current=!roots.playlist.hidden?"playlist":!roots.diary.hidden?"diary":"run";
    Object.entries(links).forEach(([key,el])=>{
      if(key===current)el.setAttribute("aria-current","page");
      else el.removeAttribute("aria-current");
    });
  };
  triggers.forEach(btn=>btn.addEventListener("click",()=>{
    if(!panel.hidden){close();return;}
    close();updateCurrent();panel.hidden=false;lastTrigger=btn;
    btn.setAttribute("aria-expanded","true");
  }));
  const changeScreen=name=>{
    const handler=name==="playlist" ? window.RunBeatPlaylist?.open :
      name==="diary" ? window.RunBeatNavigation?.toDiary : window.RunBeatNavigation?.toRunBeat;
    if(typeof handler!=="function"){
      console.error("RunBeat navigation unavailable:",name);
      alert("화면 이동 기능을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.");
      return;
    }
    try {
      const allowed=handler();
      if(allowed===false)return; // unfinished run or an unsaved form
      close();
      updateCurrent();
    }catch(e){
      console.error("RunBeat menu navigation failed:",e);
      alert("화면을 여는 중 문제가 생겼어요. 다시 시도해 주세요.");
    }
  };
  links.run.addEventListener("click",()=>changeScreen("run"));
  links.diary.addEventListener("click",()=>changeScreen("diary"));
  links.playlist.addEventListener("click",()=>changeScreen("playlist"));
  document.addEventListener("pointerdown",e=>{
    if(panel.hidden||panel.contains(e.target)||triggers.some(btn=>btn.contains(e.target)))return;
    close();
  });
  document.addEventListener("keydown",e=>{
    if(e.key!=="Escape"||panel.hidden)return;
    close();lastTrigger?.focus();
  });
})();
