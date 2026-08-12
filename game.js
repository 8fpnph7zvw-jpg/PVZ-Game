/* ===================== 植物大战僵尸 - 乡村完整版 ===================== */
(() => {
  "use strict";

  // ---------- 基础配置 ----------
  const COLS = 8, ROWS = 5;
  const CELL_W = 106.25, CELL_H = 112;
  const TOTAL_W = COLS * CELL_W, TOTAL_H = ROWS * CELL_H;

  /* 关卡配置 */
  const LEVELS = [
    { id: 1, name: "第 1 关 · 花园清晨", emoji: "🌅", sun: 200, type: "day",
      pools: { wave: 1, zones: [0,1] }, desc: "暖阳初升，僵尸来袭" },
    { id: 2, name: "第 2 关 · 菜园午后", emoji: "🌞", sun: 250, type: "day",
      pools: { wave: 2, zones: [0,1,2,3] }, desc: "更多的僵尸加入进攻" },
    { id: 3, name: "第 3 关 · 黄昏麦田", emoji: "🌇", sun: 300, type: "dusk",
      pools: { wave: 3, zones: [0,1,2,3,4] }, desc: "傍晚光线渐暗，僵尸变强" },
    { id: 4, name: "第 4 关 · 池塘月色", emoji: "🌙", sun: 325, type: "night",
      pools: { wave: 4, zones: [0,1,2,3,4] }, desc: "月光下的池塘凶险" },
    { id: 5, name: "第 5 关 · 屋顶决战", emoji: "🏰", sun: 350, type: "roof",
      pools: { wave: 5, zones: [0,1,2,3,4], boss: true }, desc: "BOSS 现身！" },
  ];
  let currentLevelIndex = 0;
  let maxUnlocked = 0; // 已解锁的最高关卡(0基)

  /* 植物配置 */
  const PLANTS = {
    sunflower:   { name: "向日葵",   cost: 50,  hp: 100, img: "assets/plants/sunflower.svg",  kind: "spot",  cd: 6,  sunCd: 5.5 },
    peashooter:  { name: "豌豆射手", cost: 100, hp: 130, img: "assets/plants/peashooter.svg", kind: "shooter", cd: 4, dmg: 20, rate: 1.2 },
    snowpea:     { name: "寒冰射手", cost: 175, hp: 130, img: "assets/plants/snowpea.svg",    kind: "shooter", cd: 5, dmg: 20, rate: 1.3, frozenPea: true },
    repeater:    { name: "双发射手", cost: 200, hp: 130, img: "assets/plants/repeater.svg",   kind: "shooter", cd: 6, dmg: 20, rate: 1.1, double: true },
    wallnut:     { name: "坚果墙",   cost: 50,  hp: 500, img: "assets/plants/wallnut.svg",    kind: "wall",  cd: 3 },
    cherry:      { name: "樱桃炸弹", cost: 150, hp: 60,  img: "assets/plants/cherry.svg",     kind: "bomb",  cd: 8, radius: 2.2, dmg: 1800 },
    potatomine:  { name: "土豆雷",   cost: 25,  hp: 60,  img: "assets/plants/potatomine.svg", kind: "mine",  cd: 5, dmg: 1200 },
    torchwood:   { name: "火炬树桩", cost: 175, hp: 320, img: "assets/plants/torchwood.svg",  kind: "wall",  cd: 5, fire: true },
  };

  /* 僵尸配置：speed 像素/秒 */
  const ZOMBIES = {
    normal: { name: "普通僵尸", kind: "normal", img: "assets/zombies/normal.svg", hp: 120, speed: 18, dmg: 22, score: 10 },
    cone:   { name: "路障僵尸", kind: "cone",   img: "assets/zombies/cone.svg",   hp: 260, speed: 15, dmg: 24, score: 20 },
    bucket: { name: "铁桶僵尸", kind: "bucket", img: "assets/zombies/bucket.svg", hp: 480, speed: 12, dmg: 25, score: 35 },
    runner: { name: "奔袭僵尸", kind: "runner", img: "assets/zombies/runner.svg", hp: 90,  speed: 32, dmg: 20, score: 15 },
    flag:   { name: "旗帜僵尸", kind: "flag",   img: "assets/zombies/flag.svg",   hp: 130, speed: 21, dmg: 22, score: 15 },
    boss:   { name: "BOSS·巨僵尸王", kind: "boss", img: "assets/zombies/boss.svg", hp: 2600, speed: 8, dmg: 60, score: 500 },
  };

  // 状态
  let sun, score, wave, running, paused, gameOver, won;
  let selected = null;
  let zombies = [], suns = [], peas = [], grid = [];
  let plantCd = {};
  let waveTotal = 0, waveSpawned = 0, spawnTimer = 0;
  let skyTimer = null, lastT = 0;
  let bossActive = false, boss = null, bossQueued = false;
  let mowerUsed = false;

  // DOM
  const board = document.getElementById("board");
  const sunCountEl = document.getElementById("sunCount");
  const waveEl = document.getElementById("waveNum");
  const scoreEl = document.getElementById("score");
  const cardMsg = document.getElementById("cardMsg");
  const overEl = document.getElementById("gameOver");
  const overTitle = document.getElementById("overTitle");
  const overScore = document.getElementById("overScore");
  const startScreen = document.getElementById("startScreen");
  const startSub = document.getElementById("startSub");
  const levelScreen = document.getElementById("levelScreen");
  const levelList = document.getElementById("levelList");
  const victoryScreen = document.getElementById("victoryScreen");
  const victoryInfo = document.getElementById("victoryInfo");
  const warningBanner = document.getElementById("warningBanner");
  const bossBar = document.getElementById("bossBar");
  const bossFill = document.getElementById("bossFill");
  const stageName = document.getElementById("stageName");
  const mowerEl = document.getElementById("mower");
  const cards = Array.from(document.querySelectorAll(".card[data-plant]"));
  const shovelCard = document.getElementById("shovelCard");
  const startBtn = document.getElementById("btnStart");
  const pauseBtn = document.getElementById("btnPause");
  const restartBtn = document.getElementById("btnRestart");
  const playBtn = document.getElementById("btnPlay");
  const nextBtn = document.getElementById("btnNext");

  // ---------- 工具 ----------
  const nowSec = () => performance.now() / 1000;

  function buildGrid() { for (let r=0;r<ROWS;r++){ grid[r]=[]; for(let c=0;c<COLS;c++) grid[r][c]=null; } }

  // ---------- 特效 ----------
  function floatText(x,y,txt,cls){
    const el=document.createElement("div"); el.className="float-text "+(cls||"");
    el.textContent=txt; el.style.left=x+"px"; el.style.top=y+"px";
    board.appendChild(el); setTimeout(()=>el.remove(),1000);
  }
  function burst(x,y,count,emoji){
    for(let i=0;i<count;i++){
      const p=document.createElement("div"); p.className="particle"; p.textContent=emoji;
      const w = emoji==="💥"; const sz = p.style;
      p.style.left=(x+Math.random()*30-15)+"px"; p.style.top=(y+Math.random()*20-10)+"px";
      const ang=Math.random()*Math.PI*2; const dist=30+Math.random()*(w?80:50);
      p.style.setProperty("--dx",Math.cos(ang)*dist+"px");
      p.style.setProperty("--dy",Math.sin(ang)*dist+"px");
      if(w) p.style.fontSize=(30+Math.random()*20)+"px";
      board.appendChild(p); setTimeout(()=>p.remove(),700);
    }
  }

  // ---------- 阳光 ----------
  function addSun(x,y,targetY,value){
    const el=document.createElement("div"); el.className="sun"; el.textContent="☀️";
    el.style.left=x+"px"; el.style.top=y+"px"; board.appendChild(el);
    const s={x,y,targetY,value,el,vy:0,landed:false};
    el.addEventListener("click",(e)=>{e.stopPropagation();collectSun(s);});
    suns.push(s);
  }
  function collectSun(s){
    sun+=s.value; s.el.remove(); suns=suns.filter(x=>x!==s);
    floatText(s.x,s.y,"+"+s.value,"gold"); updateHUD();
  }
  function spawnSkySun(){
    const x=40+Math.random()*(TOTAL_W-120);
    addSun(x,-20,30+Math.random()*(TOTAL_H-150),25);
  }

  // ---------- 卡槽选择界面 ----------
  function buildLevelList(){
    levelList.innerHTML="";
    LEVELS.forEach((lv,i)=>{
      const b=document.createElement("div");
      b.className="level-btn"+(i>maxUnlocked?" locked":"");
      b.innerHTML=`<span class="lvl-emoji">${lv.emoji}</span>
        <span>${lv.name}<div class="lvl-desc">${lv.desc}</div></span>
        <span>${i>maxUnlocked?"🔒":"▶"}</span>`;
      if(i<=maxUnlocked) b.addEventListener("click",()=>{ currentLevelIndex=i; startGame(); });
      levelList.appendChild(b);
    });
  }

  // ---------- 植物 ----------
  function placePlant(r,c,type){
    const def=PLANTS[type];
    const el=document.createElement("div"); el.className="plant"; el.dataset.type=type;
    el.style.left=(c*CELL_W)+"px"; el.style.top=(r*CELL_H)+"px";
    const main=document.createElement("img"); main.className="p-main"; main.src=def.img; main.alt=def.name; main.draggable=false;
    el.appendChild(main);
    if(def.kind==="wall"){ const bar=document.createElement("div"); bar.className="plant-hp"; const f=document.createElement("div"); bar.appendChild(f); el.appendChild(bar); }
    board.appendChild(el);
    grid[r][c]={ type,hp:def.hp,maxHp:def.hp,el,r,c,cd:0,dead:false };
  }
  function destroyPlant(p){
    if(!p||p.dead)return; p.dead=true;
    const el=p.el; el.classList.add("die"); grid[p.r][p.c]=null;
    setTimeout(()=>el.remove(),380);
  }
  function damagePlant(p,dmg){
    if(!p||p.dead)return;
    if(p.type==="cherry"||p.type==="potatomine"){ // 引爆
      p.type==="cherry"?triggerBomb(p):triggerMine(p); return;
    }
    p.hp-=dmg;
    const f=p.el.querySelector(".plant-hp>div");
    if(f) f.style.width=Math.max(0,(p.hp/p.maxHp)*100)+"%";
    p.el.classList.remove("hit"); void p.el.offsetWidth; p.el.classList.add("hit");
    if(p.hp<=0) destroyPlant(p);
  }
  // 樱桃炸弹引爆（半径跨行）
  function triggerBomb(p){
    const ex=p.c*CELL_W+CELL_W/2, ey=p.r*CELL_H+CELL_H/2;
    burst(ex,ey,26,"💥"); burst(ex,ey,10,"🔥");
    floatText(ex,ey-20,"BOOM!","boom");
    const rad=PLANTS.cherry.radius;
    zombies.forEach(z=>{ if(z.dying)return;
      const zx=z.x+27,zy=z.row*CELL_H+40;
      if(Math.hypot(zx-ex,zy-ey)/CELL_W<=rad) damageZombie(z,PLANTS.cherry.dmg,false);
    });
    destroyPlant(p);
  }
  // 土豆雷引爆
  function triggerMine(p){
    const ex=p.c*CELL_W+CELL_W/2, ey=p.r*CELL_H+CELL_H/2;
    burst(ex,ey,16,"💥"); floatText(ex,ey-20,"BOOM!","boom");
    zombies.forEach(z=>{ if(z.dying)return;
      const zx=z.x+27,zy=z.row*CELL_H+40;
      if(Math.hypot(zx-ex,zy-ey)<CELL_W*1.2) damageZombie(z,PLANTS.potatomine.dmg,false);
    });
    destroyPlant(p);
  }

  // ---------- 豌豆 ----------
  function shoot(plant){
    const def=PLANTS[plant.type];
    const shots=def.double?2:1;
    const frozen=!!def.frozenPea;
    plant.el.classList.add("anim-shoot");
    setTimeout(()=>plant.el.classList.remove("anim-shoot"),120);
    for(let i=0;i<shots;i++){
      const el=document.createElement("div");
      el.className="pea"+(frozen?" snow":"");
      const y=plant.r*CELL_H+46+i*8;
      el.style.left=(plant.c*CELL_W+58)+"px"; el.style.top=y+"px";
      board.appendChild(el);
      peas.push({x:plant.c*CELL_W+58,y,row:plant.r,dmg:def.dmg,frozen,el,spd:16});
    }
  }
  // 火豆：穿过火炬树桩时升级
  function fireifyPea(p){
    if(p.fire)return; p.fire=true; p.dmg=Math.round(p.dmg*1.6);
    p.el.classList.remove("snow"); p.el.classList.add("fire");
  }

  // ---------- 僵尸（拟人化）----------
  function spawnZombie(forceKind){
    const r=Math.floor(Math.random()*ROWS);
    let pool=["normal"];
    if(wave>=2)pool.push("runner");
    if(wave>=3)pool.push("cone");
    if(wave>=4)pool.push("flag");
    if(wave>=5)pool.push("bucket");
    if(wave>=6)pool.push("bucket");
    const kind=forceKind||pool[Math.floor(Math.random()*pool.length)];
    const def=ZOMBIES[kind];
    const hpBonus=1+(wave-1)*0.06;
    const maxHp=Math.round(def.hp*hpBonus);
    const isBoss=def.kind==="boss";

    const el=document.createElement("div");
    el.className="zombie "+(isBoss?"boss ":"")+"skin-"+def.kind;
    el.style.top=(r*CELL_H)+"px";
    if(isBoss){ el.style.top=(r*CELL_H-40)+"px"; }

    // 身体容器（对应种类 SVG 作为僵尸主体，自带帽子/道具/配色）
    const imgEl=document.createElement("img"); imgEl.className="z-body";
    imgEl.src=def.img; imgEl.alt=def.name; imgEl.draggable=false;
    el.appendChild(imgEl);

    // 血条
    const bar=document.createElement("div"); bar.className="hp-bar"; const fill=document.createElement("div");
    bar.appendChild(fill); el.appendChild(bar);
    board.appendChild(el);

    const z={ row:r,x:TOTAL_W+20,maxHp,hp:maxHp,speed:def.speed*(0.92+Math.random()*0.18),
      dmg:def.dmg,score:def.score,kind:def.kind,el,fill,attacking:false,slowT:0,dying:false,atkTimer:null };
    zombies.push(z);
    if(isBoss){ bossActive=true; boss=z; bossBar.classList.remove("hidden"); bossFill.style.width="100%"; showStageName("⚠️ BOSS 来袭！ ⚠️"); }
    return z;
  }

  function damageZombie(z,dmg,frozen){
    if(z.dying)return;
    z.hp-=dmg;
    if(frozen)z.slowT=nowSec()+2.2;
    if(z.hp<=0)killZombie(z);
    else{
      const fl=z.el.querySelector(".hp-bar>div"); if(fl)fl.style.width=Math.max(0,(z.hp/z.maxHp)*100)+"%";
      if(boss&&z===boss)bossFill.style.width=Math.max(0,(z.hp/z.maxHp)*100)+"%";
      const sp=document.createElement("div"); sp.className="hit-spark";
      sp.style.left=(z.x+20)+"px"; sp.style.top=(z.row*CELL_H+25)+"px";
      board.appendChild(sp); setTimeout(()=>sp.remove(),300);
    }
  }
  function killZombie(z){
    z.dying=true; z.el.classList.add("dying");
    if(z.atkTimer){clearInterval(z.atkTimer);z.atkTimer=null;}
    score+=z.score; floatText(z.x+20,z.row*CELL_H+10,"+"+z.score,"score");
    burst(z.x+20,z.row*CELL_H+30,8,"✨"); updateHUD();
    if(boss&&z===boss){ bossActive=false; boss=null; bossBar.classList.add("hidden");
      if(won===false) checkWin(); }
    setTimeout(()=>{ z.el.remove(); zombies=zombies.filter(x=>x!==z); },750);
  }

  // ---------- 波次 / BOSS ----------
  function startWave(){
    const LV=LEVELS[currentLevelIndex];
    const base=5+wave*2;
    waveTotal = LV.pools.boss && wave>=3 ? 3 : base; // BOSS 关 3 波后有 BOSS
    waveSpawned=0; spawnTimer=30; waveEl.textContent=wave;
  }
  function updateWave(){
    if(waveSpawned>=waveTotal && zombies.length===0){
      const LV=LEVELS[currentLevelIndex];
      if(LV.pools.boss && !bossActive && wave>=3 && !bossQueued){ // BOSS 登场
        bossQueued=true;
        wave++; startWave();
        setTimeout(()=>{ showStageName("BOSS 出现了！"); spawnZombie("boss"); },600);
        return;
      }
      // 过关
      if(LV.pools.boss && wave>=3 && !bossActive){ checkWin(); return; }
      wave++; addSun(TOTAL_W/2-20,-20,40,100);
      warningBanner.classList.remove("hidden");
      setTimeout(()=>warningBanner.classList.add("hidden"),1400);
      startWave();
    } else if(spawnTimer>0){
      spawnTimer--;
      if(spawnTimer<=0 && waveSpawned<waveTotal){
        spawnZombie(); waveSpawned++;
        spawnTimer=Math.max(30,70-wave*7-Math.floor(Math.random()*18));
      }
    }
  }
  function checkWin(){
    if(won||gameOver)return;
    won=true; running=false; paused=false;
    pauseBtn.style.display="none";
    if(maxUnlocked<currentLevelIndex+1) maxUnlocked=currentLevelIndex+1;
    victoryInfo.textContent="得分 "+score+"  · 共 "+wave+" 波";
    victoryScreen.classList.remove("hidden");
  }

  // ---------- HUD / 卡牌 ----------
  function cdMax(type){return (PLANTS[type]||{}).cd||3;}
  function updateHUD(){
    sunCountEl.textContent=sun; scoreEl.textContent=score;
    cards.forEach(c=>{
      const type=c.dataset.plant;
      if(!type){ c.classList.toggle("selected",selected&&selected.tool==="shovel"); return; }
      const cost=parseInt(c.dataset.cost);
      const disabled=sun<cost||plantCd[type]>0;
      c.classList.toggle("disabled",disabled);
      const cdEl=c.querySelector(".card-cd");
      if(cdEl){ cdEl.style.height=((plantCd[type]||0)/cdMax(type)*100)+"%"; }
      c.classList.toggle("selected",selected&&selected.type===type);
    });
    if(shovelCard)shovelCard.classList.toggle("selected",selected&&selected.tool==="shovel");
  }
  let msgTimer=null;
  function flashCardMsg(m){ cardMsg.textContent=m; clearTimeout(msgTimer); msgTimer=setTimeout(()=>cardMsg.textContent="",1100); }
  function showStageName(t){ stageName.textContent=t; stageName.classList.remove("hidden"); setTimeout(()=>stageName.classList.add("hidden"),2600); }

  // 卡牌
  cards.forEach(card=>{
    card.addEventListener("click",()=>{
      if(!running)return;
      const type=card.dataset.plant,cost=parseInt(card.dataset.cost);
      if(selected&&selected.type===type){selected=null;}
      else{
        if(sun<cost){flashCardMsg("阳光不足 ☀️");return;}
        if(plantCd[type]>0){flashCardMsg("还在冷却中…");return;}
        selected={type};
      }
      board.classList.toggle("planting",!!selected);
      if(selected)flashCardMsg(PLANTS[type].name+"已选择，点击草地放置");
      updateHUD();
    });
  });
  if(shovelCard)shovelCard.addEventListener("click",()=>{
    if(!running)return;
    if(selected&&selected.tool==="shovel")selected=null; else selected={tool:"shovel"};
    board.classList.toggle("planting",!!selected);
    if(selected)flashCardMsg("点击植物可铲除");
    updateHUD();
  });

  // ---------- 悬停 / 放置 ----------
  const highlight=document.createElement("div");
  highlight.className="cell hover"; highlight.style.pointerEvents="none";
  board.appendChild(highlight); highlight.style.display="none";

  board.addEventListener("mousemove",(e)=>{
    if(!selected){highlight.style.display="none";return;}
    const rect=board.getBoundingClientRect();
    const c=Math.floor((e.clientX-rect.left)/CELL_W);
    const r=Math.floor((e.clientY-rect.top)/CELL_H);
    const inB=r>=0&&r<ROWS&&c>=0&&c<COLS;
    if(!inB){highlight.style.display="none";return;}
    const cellFree=!grid[r][c];
    const valid=selected.tool==="shovel"?!!grid[r][c]:cellFree;
    if(!valid){highlight.style.display="none";return;}
    highlight.style.display="block";
    highlight.style.left=(c*CELL_W)+"px"; highlight.style.top=(r*CELL_H)+"px";
    highlight.classList.toggle("danger",selected.tool==="shovel");
  });
  board.addEventListener("mouseleave",()=>highlight.style.display="none");

  board.addEventListener("click",(e)=>{
    if(!selected||!running)return;
    const rect=board.getBoundingClientRect();
    const c=Math.floor((e.clientX-rect.left)/CELL_W);
    const r=Math.floor((e.clientY-rect.top)/CELL_H);
    if(r<0||r>=ROWS||c<0||c>=COLS)return;
    if(selected.tool==="shovel"){
      if(grid[r][c])destroyPlant(grid[r][c]);
      selected=null; board.classList.remove("planting"); highlight.style.display="none"; updateHUD(); return;
    }
    if(grid[r][c]){flashCardMsg("这里已有植物");return;}
    const type=selected.type,cost=PLANTS[type].cost;
    if(sun<cost){flashCardMsg("阳光不足");return;}
    sun-=cost; plantCd[type]=cdMax(type);
    placePlant(r,c,type); selected=null;
    board.classList.remove("planting"); highlight.style.display="none"; updateHUD();
  });

  // ---------- 割草机（全图仅一次救援机会）----------
  function activateMower(){
    if(mowerUsed)return; mowerUsed=true;
    mowerEl.classList.add("active");
    // 割草机一冲到底，清掉所有僵尸
    zombies.forEach(z=>{ if(!z.dying)damageZombie(z,9999,false); });
    floatText(TOTAL_W/2,80,"🚜 割草机救援！","score");
    setTimeout(()=>mowerEl.classList.remove("active"),2100);
  }

  // ---------- 主循环 ----------
  function loop(t){
    requestAnimationFrame(loop);
    if(!running||paused||gameOver||won)return;
    if(!lastT)lastT=t;
    let dt=(t-lastT)/1000; lastT=t; if(dt>0.05)dt=0.05;
    const nowS=nowSec();

    // 植物逻辑
    for(const k in plantCd)if(plantCd[k]>0)plantCd[k]-=dt;
    grid.forEach(row=>row.forEach(p=>{
      if(!p||p.dead)return;
      p.cd-=dt; const def=PLANTS[p.type];
      if(def.kind==="spot"){
        if(p.cd<=0){p.cd=def.sunCd;addSun(p.c*CELL_W+CELL_W/2-12,p.r*CELL_H+10,p.r*CELL_H+CELL_H-30,25);}
      } else if(def.kind==="shooter"){
        const has=zombies.some(z=>z.row===p.r&&!z.dying&&z.x>p.c*CELL_W-30);
        if(has&&p.cd<=0){shoot(p);p.cd=def.rate;}
      } else if(def.kind==="mine"){
        const near=zombies.some(z=>!z.dying&&z.row===p.r&&z.x+27>p.c*CELL_W-20&&z.x<p.c*CELL_W+CELL_W+10);
        if(near)triggerMine(p);
      } else if(def.kind==="bomb"){
        const near=zombies.some(z=>!z.dying&&z.row===p.r&&Math.abs((z.x+27)-(p.c*CELL_W+CELL_W/2))<CELL_W*2.2);
        if(near){p.dead=true;triggerBomb(p);}
      }
    }));
    updateHUD();

    // 僵尸移动
    zombies.forEach(z=>{
      if(z.dying)return;
      if(z.reachedHome){ return; } // 已走到家的僵尸不再移动/判定（避免重复触发）
      let spd=z.speed; if(nowS<z.slowT)spd*=0.35;
      // 火焰伤害：BOSS 免疫，其他僵尸路过火炬树桩不受伤(简化)
      z.x-=spd*dt;
      const c=Math.floor(z.x/CELL_W);
      const plant=(c>=0&&c<COLS)?grid[z.row][c]:null;
      if(plant){
        // 豌豆射手的豌豆经过火炬升级：简化，只在发射时检查（在豌豆移动段判断邻居）
        z.x=Math.max(z.x,(c+1)*CELL_W-30);
        if(!z.attacking){
          z.attacking=true; z.el.classList.add("attacking");
          z.el.style.left=((c+1)*CELL_W-30)+"px";
          if(z.atkTimer)clearInterval(z.atkTimer);
          z.atkTimer=setInterval(()=>{
            if(z.dying||!z.el.parentNode){clearInterval(z.atkTimer);z.atkTimer=null;return;}
            const cc=Math.max(0,Math.min(COLS-1,Math.floor(z.x/CELL_W)));
            const cur=grid[z.row][cc];
            if(cur)damagePlant(cur,z.dmg);
          },850);
        }
      } else if(z.attacking){
        z.attacking=false; z.el.classList.remove("attacking");
        if(z.atkTimer){clearInterval(z.atkTimer);z.atkTimer=null;}
      }
      z.el.style.left=z.x+"px";
      if(z.x<-40){
        if(!mowerUsed){ activateMower(); z.reachedHome=true; }
        else { gameOverNow(); }
      }
    });

    // 阳光下落
    suns.forEach(s=>{
      if(s.landed)return;
      s.vy+=0.25; s.y+=s.vy; s.el.style.top=s.y+"px";
      if(s.y>=s.targetY){s.y=s.targetY;s.landed=true;s.el.style.top=s.y+"px";}
    });

    // 豌豆移动（含火炬升级）
    for(let i=peas.length-1;i>=0;i--){
      const p=peas[i];
      p.x+=p.spd*dt*60; p.el.style.left=p.x+"px";
      if(p.x>TOTAL_W+20){p.el.remove();peas.splice(i,1);continue;}
      // 经过火炬树桩升级
      const cc=Math.floor(p.x/CELL_W);
      if(cc>=0&&cc<COLS){ const tp=grid[p.row][cc];
        if(tp&&tp.type==="torchwood"&&p.x>cc*CELL_W+20&&p.x<cc*CELL_W+70){fireifyPea(p);} }
      let hit=null;
      for(const z of zombies){
        if(z.row===p.row&&!z.dying&&z.x<p.x+20&&z.x+40>p.x-6){hit=z;break;}
      }
      if(hit){damageZombie(hit,p.dmg,p.frozen);p.el.remove();peas.splice(i,1);}
    }

    updateWave();
  }

  function gameOverNow(){
    if(gameOver||won)return;
    gameOver=true; running=false; paused=false;
    pauseBtn.style.display="none";
    overTitle.textContent="僵尸吃掉了你的脑子！🧠";
    overScore.textContent="🏆 得分 "+score+"  · 坚持到第 "+wave+" 波";
    overEl.classList.remove("hidden");
  }

  // ---------- 开始 / 重置 ----------
  function reset(){
    const LV=LEVELS[currentLevelIndex];
    sun=LV.sun; score=0; wave=1; running=false; paused=false; gameOver=false; won=false;
    zombies=[]; suns=[]; peas=[]; selected=null; plantCd={}; lastT=0;
    bossActive=false; boss=null; mowerUsed=false; bossQueued=false;
    if(skyTimer)clearInterval(skyTimer); skyTimer=null;
    board.querySelectorAll(".zombie,.pea,.sun,.plant,.particle,.float-text,.hit-spark").forEach(e=>e.remove());
    highlight.style.display="none";
    board.classList.remove("planting","paused");
    cards.forEach(c=>c.classList.remove("selected","disabled"));
    if(shovelCard)shovelCard.classList.remove("selected");
    warningBanner.classList.add("hidden"); bossBar.classList.add("hidden"); stageName.classList.add("hidden");
    mowerEl.classList.remove("active");
    buildGrid(); startWave(); updateHUD();
    flashCardMsg("先种向日葵 🌻 攒阳光");
  }

  function startGame(){
    reset();
    running=true;
    levelScreen.classList.add("hidden");
    startScreen.classList.add("hidden");
    overEl.classList.add("hidden");
    victoryScreen.classList.add("hidden");
    pauseBtn.style.display="block"; pauseBtn.textContent="⏸ 暂停";
    startBtn.style.display="none";
    const LV=LEVELS[currentLevelIndex];
    // 场景氛围：夜晚关显示墓碑+变暗，屋顶关橙色黄昏
    const gv=document.getElementById("gravestone");
    if(gv) gv.classList.toggle("hidden", LV.type!=="night");
    document.body.setAttribute("data-scene", LV.type);
    showStageName(LV.name);
    skyTimer=setInterval(spawnSkySun,7000);
    spawnSkySun();
    requestAnimationFrame(loop);
  }

  // ---------- 按钮 ----------
  function togglePause(){
    if(!running||gameOver||won)return;
    if(paused){paused=false;lastT=0;}else paused=true;
    pauseBtn.textContent=paused?"▶ 继续":"⏸ 暂停";
    board.classList.toggle("paused",paused);
  }
  startBtn.addEventListener("click",()=>{ levelScreen.classList.remove("hidden"); startScreen.classList.add("hidden"); });
  playBtn.addEventListener("click",()=>{ levelScreen.classList.remove("hidden"); startScreen.classList.add("hidden"); });
  pauseBtn.addEventListener("click",togglePause);
  document.addEventListener("keydown",(e)=>{ if(e.code==="Space"){e.preventDefault();togglePause();} });
  restartBtn.addEventListener("click",()=>startGame());
  nextBtn.addEventListener("click",()=>{
    if(currentLevelIndex<LEVELS.length-1){currentLevelIndex++;startGame();}
    else{ levelScreen.classList.remove("hidden"); victoryScreen.classList.add("hidden"); }
  });

  // ---------- 初始化 ----------
  buildGrid();
  maxUnlocked=0;
  buildLevelList();
  levelScreen.classList.remove("hidden");
  updateHUD();
  pauseBtn.style.display="none";
})();
