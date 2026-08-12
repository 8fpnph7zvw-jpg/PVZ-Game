const http=require('http');const {spawn}=require('child_process');
const CHROME='C:/Users/qq247/AppData/Local/Google/Chrome/Application/chrome.exe';
const PORT=9342;const W=globalThis.WebSocket;
const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port='+PORT,'about:blank'],{stdio:'ignore'});
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
  await send('Page.navigate',{url:'http://127.0.0.1:8124/_preview2.html'});
  await sleep(1800);
  const expr=`(()=>{
    const analyze=(im)=>{const c=document.createElement('canvas');c.width=im.naturalWidth||100;c.height=im.naturalHeight||100;
      const ctx=c.getContext('2d');ctx.drawImage(im,0,0,c.width,c.height);
      const d=ctx.getImageData(0,0,c.width,c.height).data;
      let op=0,total=0;for(let i=0;i<d.length;i+=4){total++;if(d[i+3]>10)op++;}
      const hues=new Set();for(let i=0;i<d.length;i+=8*7){const r=d[i],g=d[i+1],b=d[i+2];if(d[i+3]>40){const m=Math.max(r,g,b),mn=Math.min(r,g,b);const del=m-mn;let h=0;if(del){if(m===r)h=((g-b)/del)%6;else if(m===g)h=(b-r)/del+2;else h=(r-g)/del+4;h=((h*60)%360+360)%360;}hues.add(Math.round(h/6));}}
      return {opaquePct:Math.round(op/total*100),hueBands:hues.size};
    };
    const sun=document.querySelector('img[src$="sunflower.svg"]');
    const zom=document.querySelector('img[src$="normal.svg"]');
    return JSON.stringify({sun:sun?analyze(sun):'none',zombie:zom?analyze(zom):'none'});
  })()`;
  const ev=await send('Runtime.evaluate',{expression:expr,returnByValue:true});
  console.log('ANALYSIS:',ev.result.result.value);
  ws.close();chrome.kill();process.exit(0);
})().catch(e=>{console.error(e);chrome.kill();process.exit(1);});
