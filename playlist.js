"use strict";
/* PlayList: client-only library. User-provided titles and links are rendered safely. */
(() => {
  const $=id=>document.getElementById(id);
  const key="runbeat-playlists-v1", root=$("playlistRoot"), listScreen=$("plListScreen"), editor=$("plEditorScreen");
  const home=document.querySelector("#app > .inner"),diaryRoot=$("diaryRoot");
  if(!root||!listScreen||!editor||!home||!diaryRoot)return;
  const text=(tag,className,value)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(value!==undefined)el.textContent=String(value);
    return el;
  };
  const youtubeUrl=value=>{
    if(typeof value!=="string"||!value.trim())return "";
    try {
      const url=new URL(value.trim());
      if(url.protocol!=="https:"&&url.protocol!=="http:")return null;
      const host=url.hostname.toLowerCase();
      if(!["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtu.be","www.youtu.be"].includes(host))return null;
      const parts=url.pathname.split("/").filter(Boolean);
      if(host.endsWith("youtu.be")) {
        if(!parts[0])return null;
      } else if(url.pathname==="/watch"){
        if(!url.searchParams.get("v"))return null;
      } else if(!["shorts","live","embed"].includes(parts[0])||!parts[1]){
        return null;
      }
      url.protocol="https:";
      url.username="";url.password="";
      return url.toString();
    } catch(_) {return null;}
  };
  const normalize=source=>{
    if(!Array.isArray(source))return [];
    return source.filter(p=>p&&typeof p==="object"&&typeof p.id==="string"&&typeof p.title==="string"&&p.title.trim())
      .slice(0,100).map(p=>({
        id:p.id.slice(0,100),title:p.title.trim().slice(0,80),
        genre:typeof p.genre==="string"?p.genre.trim().slice(0,60):"",
        songs:Array.isArray(p.songs)?p.songs.slice(0,60).filter(s=>s&&typeof s==="object").map(s=>{
          const link=typeof s.url==="string"?youtubeUrl(s.url):"";
          return {title:typeof s.title==="string"?s.title.trim().slice(0,120):"",url:link||""};
        }).filter(s=>s.title||s.url):[],
        created:Number.isFinite(p.created)?p.created:0
      }));
  };
  const load=()=>{try{return normalize(JSON.parse(localStorage.getItem(key)||"[]"));}catch(e){console.warn("Playlist load:",e);return [];}};
  let playlists=load(),selected=playlists[0]?.id??null,editingId=null;
  const save=next=>{
    try {localStorage.setItem(key,JSON.stringify(next));playlists=next;return true;}
    catch(e){console.error("Playlist save:",e);alert("플레이리스트를 저장할 수 없어요. 브라우저 저장 공간과 시크릿 모드를 확인해 주세요.");return false;}
  };
  const current=()=>playlists.find(item=>item.id===selected)||null;
  const newId=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);
  const scrollTop=()=>window.scrollTo({top:0,behavior:"instant"});
  const renderList=()=>{
    const target=$("plList");target.replaceChildren();
    const trackCount=playlists.reduce((sum,p)=>sum+p.songs.length,0);
    $("plCount").textContent=playlists.length+"개 플레이리스트";
    $("plTracksCount").textContent=trackCount+"곡 등록";
    $("plEditButton").disabled=!current();
    $("plDeleteButton").disabled=!current();
    if(!playlists.length){
      const empty=text("div","pl-empty");
      empty.append(text("strong","","아직 플레이리스트가 없어요."),text("span","","아래 '새로 만들기'를 눌러 첫 목록을 만들어 보세요."));
      target.append(empty);return;
    }
    for(let i=0;i<playlists.length;i++){
      const p=playlists[i],active=p.id===selected;
      const card=text("article","pl-card");card.setAttribute("aria-pressed",String(active));
      const top=text("button","pl-card-top");top.type="button";top.setAttribute("aria-label",p.title+" 선택");top.setAttribute("aria-pressed",String(active));
      top.style.cssText="border:0;background:transparent;color:inherit;width:100%;text-align:left;padding:0;";
      top.append(text("span","pl-cover","🎵"));
      const head=text("span","");head.style.flex="1";head.style.minWidth="0";
      head.append(text("span","pl-card-name",p.title),text("span","pl-card-genre","장르: "+(p.genre||"미입력")));
      top.append(head,text("span","pl-card-count",p.songs.length+"곡"));
      top.addEventListener("click",()=>{selected=p.id;renderList();});
      card.append(top);
      if(active){
        const preview=text("div","pl-track-preview");
        if(!p.songs.length)preview.append(text("p","pl-track-preview-empty","등록된 곡이 없어요. 아래 '수정'에서 곡을 추가할 수 있어요."));
        for(const [j,song] of p.songs.entries()){
          const line=text("div","pl-track-preview-item");
          line.append(text("span","",(j+1)+". "+(song.title||"YouTube 동영상")));
          if(song.url){
            const anchor=text("a","pl-track-link","YouTube ↗");
            anchor.href=song.url;anchor.target="_blank";anchor.rel="noopener noreferrer";
            line.append(anchor);
          }
          preview.append(line);
        }
        card.append(preview);
      }
      target.append(card);
    }
  };
  const switchList=()=>{
    listScreen.hidden=false;editor.hidden=true;editingId=null;renderList();scrollTop();
  };
  const canLeave=()=>editor.hidden||window.confirm("작성 중인 플레이리스트 변경사항이 저장되지 않았어요. 이동할까요?");
  const hide=()=>{root.hidden=true;listScreen.hidden=false;editor.hidden=true;editingId=null;};
  const open=()=>{
    if(root.hidden&&$("startButton").disabled){
      alert("진행 중인 러닝을 먼저 종료한 뒤 PlayList로 이동해 주세요.");
      return false;
    }
    if(!diaryRoot.hidden&&window.RunBeatNavigation?.canLeaveDiary&&!window.RunBeatNavigation.canLeaveDiary())return false;
    if(!canLeave())return false;
    home.hidden=true;diaryRoot.hidden=true;root.hidden=false;
    switchList();
    return true;
  };
  const addSongRow=(song={title:"",url:""})=>{
    const target=$("plSongFields");
    if(target.children.length>=60){alert("한 플레이리스트에는 최대 60곡까지 저장할 수 있어요.");return;}
    const row=text("div","pl-song-row");
    const index=text("span","pl-song-number",target.children.length+1);
    const group=text("div","pl-song-inputs");
    const title=document.createElement("input");title.type="text";title.maxLength=120;title.placeholder="곡 이름 또는 아티스트";title.value=song.title||"";title.setAttribute("aria-label","곡 이름");
    const url=document.createElement("input");url.type="url";url.inputMode="url";url.maxLength=500;url.placeholder="유튜브 링크 (선택)";url.value=song.url||"";url.setAttribute("aria-label","유튜브 동영상 링크");
    group.append(title,url);
    const remove=text("button","pl-remove-song","×");remove.type="button";remove.setAttribute("aria-label","이 곡 입력칸 삭제");
    remove.addEventListener("click",()=>{
      row.remove();
      Array.from(target.children).forEach((r,i)=>r.querySelector(".pl-song-number").textContent=i+1);
    });
    row.append(index,group,remove);
    target.append(row);
  };
  const openEditor=(record)=>{
    editingId=record?.id||null;
    $("plEditorTitle").textContent=record?"플레이리스트 수정":"새 플레이리스트 만들기";
    $("plSaveButton").textContent=record?"수정 내용 저장":"플레이리스트 저장";
    const nextNumber=()=>{let n=1;while(playlists.some(p=>p.title==="플레이리스트 "+n))n++;return n;};
    $("plTitle").value=record?.title||"플레이리스트 "+nextNumber();
    $("plGenre").value=record?.genre||"";
    $("plSongFields").replaceChildren();
    if(record?.songs?.length)record.songs.forEach(song=>addSongRow(song));
    else addSongRow();
    listScreen.hidden=true;editor.hidden=false;scrollTop();
  };
  $("plNewButton").addEventListener("click",()=>{
    if(playlists.length>=100){alert("플레이리스트는 최대 100개까지 만들 수 있어요.");return;}
    openEditor(null);
  });
  $("plEditButton").addEventListener("click",()=>{const p=current();if(p)openEditor(p);});
  $("plDeleteButton").addEventListener("click",()=>{
    const p=current();if(!p)return;
    if(!window.confirm("'"+p.title+"' 플레이리스트와 등록된 곡 "+p.songs.length+"개를 삭제할까요?"))return;
    const next=playlists.filter(item=>item.id!==p.id);
    if(save(next)){selected=next[0]?.id??null;renderList();}
  });
  $("plAddSong").addEventListener("click",()=>addSongRow());
  $("plBackToList").addEventListener("click",()=>{if(canLeave())switchList();});
  $("plCancel").addEventListener("click",()=>{if(canLeave())switchList();});
  $("plBackToRun").addEventListener("click",()=>{
    const handler=window.RunBeatNavigation?.toRunBeat;
    if(typeof handler==="function")handler();
  });
  $("plForm").addEventListener("submit",event=>{
    event.preventDefault();
    const title=$("plTitle").value.trim(), genre=$("plGenre").value.trim();
    if(!title||title.length>80){alert("제목을 1~80자 사이로 입력해 주세요.");$("plTitle").focus();return;}
    if(!genre||genre.length>60){alert("장르를 1~60자 사이로 입력해 주세요.");$("plGenre").focus();return;}
    const songs=[];
    for(const row of $("plSongFields").children){
      const inputs=row.querySelectorAll("input");
      let songTitle=inputs[0].value.trim(),url=inputs[1].value.trim();
      // Pasting a YouTube URL into the song-name field also works.
      if(!url&&/^https?:\/\//i.test(songTitle)){url=songTitle;songTitle="";}
      if(!songTitle&&!url)continue;
      if(songTitle.length>120){alert("곡 이름은 120자 이내로 입력해 주세요.");return;}
      if(url){
        const safe=youtubeUrl(url);
        if(safe===null){alert("유효한 유튜브 동영상 링크를 넣어 주세요. (youtu.be 또는 youtube.com)");inputs[1].focus();return;}
        url=safe;
      }
      songs.push({title:songTitle,url});
    }
    const old=playlists.find(p=>p.id===editingId);
    const item={id:old?.id||newId(),title,genre,songs,created:old?.created||Date.now()};
    const next=old?playlists.map(p=>p.id===old.id?item:p):[...playlists,item];
    if(!save(next))return;
    selected=item.id;switchList();
  });
  window.RunBeatPlaylist={open,hide,canLeave};
  // A playlist should survive page reloads; it is never sent to a server.
  renderList();
})();
