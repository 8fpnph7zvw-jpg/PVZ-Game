// CDP rich-scene screenshot: plant several plants, let mixed zombies + spread for a showcase shot.
const http=require('http');const fs=require('fs');const {spawn}=require('child_process');
const CHROME='C:/Users/qq247/AppData/Local/Google/Chrome/Application/chrome.exe';
const PORT=9339;const W=globalThis.WebSocket;
const SHOT=process.argv[2]||'D:/PVZ-Game/_showcase.png';
const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--window-size=1280,880','--remote-debugging-port='+PORT,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const getJson=u=>new Promise((res,rej)=>http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));
(async()=>{
  let t;for(let i=0;i<40;i++){try{t=await getJson('http://127.0.0.1:'+PORT+'/json');if(t.length)break;}catch(e){}await sleep(300);}
  const pg=t.find(x=>x.type==='page');const ws=new W(pg.webSocketDebuggerUrl);
  let id=0;const pend=new Map();
  const send=(m,p={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){pend.get(d.id)(d);pend.delete(d.id);}});
  await new Promise(r=>ws.addEventListener('open',r));
  await send('Page.enable');await send('Runtime.enable');
  await send('Page.navigate',{url:'http://127.0.0.1:8124/index.html'});
  await sleep(1500);
  const evalJs=async ex=>(await send('Runtime.evaluate',{expression:ex,returnByValue:true,awaitPromise:true})).result.result.value;
  // Enter level 1 (always unlocked)
  await evalJs(`(()=>{const lv=document.querySelector('.level-btn'); if(lv) lv.click();})()`);
  await sleep(500);
  // Plant a spread over time
  await evalJs(`(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const board=document.getElementById('board');
    const clickCard=sel=>{const c=document.querySelector(sel);if(c)c.click();};
    const clickCell=(r,c)=>{const b=board.getBoundingClientRect();const x=b.left+c*106.25+53;const y=b.top+r*112+56;
      board.dispatchEvent(new MouseEvent('mousemove',{clientX:x,clientY:y,bubbles:true}));
      board.dispatchEvent(new MouseEvent('click',{clientX:x,clientY:y,bubbles:true}));};
    // collect any sun first
    [...document.querySelectorAll('.sun')].forEach(s=>s.click());
    const tryPlant=(card,r,c)=>{clickCard(card);
      return new Promise(res2=>setTimeout(()=>{clickCell(r,c);res2();},150));};
    await tryPlant('.card[data-plant="sunflower"]',2,1); // 50
    await tryPlant('.card[data-plant="sunflower"]',3,1); // 50
    await tryPlant('.card[data-plant="peashooter"]',2,2); // 100
    await sleep(3000);
    [...document.querySelectorAll('.sun')].forEach(s=>s.click());
    await tryPlant('.card[data-plant="repeater"]',3,2); // 200
    await tryPlant('.card[data-plant="wallnut"]',2,3); // 50
    await sleep(3500);
    [...document.querySelectorAll('.sun')].forEach(s=>s.click());
    await tryPlant('.card[data-plant="snowpea"]',1,2); // 175
    await tryPlant('.card[data-plant="torchwood"]',1,3); // 175
    return 'planted';
  })()`);
  await sleep(14000); // let waves + boss develop
  const st=await evalJs(`(()=>({zombies:document.querySelectorAll('.zombie').length,plants:document.querySelectorAll('.plant').length,wave:document.getElementById('waveNum').textContent,sun:document.getElementById('sunCount').textContent,boss:!!document.querySelector('.zombie.boss'),score:document.getElementById('score').textContent}))()`);
  console.log('STATE:',st);
  await sleep(800);
  const cap=await send('Page.captureScreenshot',{format:'png'});
  if(cap.result&&cap.result.data){fs.writeFileSync(SHOT,Buffer.from(cap.result.data,'base64'));console.log('SHOT:',fs.statSync(SHOT).size);}
  ws.close();chrome.kill();process.exit(0);
})().catch(e=>{console.error(e);chrome.kill();process.exit(1);});
