// Static server with correct SVG MIME (image/svg+xml) on port 8124
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='D:/PVZ-Game';
const MIME={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/')u='/index.html';
  const fp=path.join(ROOT,u);
  fs.readFile(fp,(e,d)=>{
    if(e){res.writeHead(404);res.end('nf');return;}
    const ext=path.extname(fp).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'});
    res.end(d);
  });
}).listen(8124,'127.0.0.1',()=>console.log('svr on 8124 with correct MIME'));
