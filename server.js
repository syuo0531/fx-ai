const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.WEBHOOK_TOKEN || "";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

function json(res, status, body) {
  res.writeHead(status, {"content-type":"application/json; charset=utf-8"});
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve,reject)=>{
    let body="";
    req.on("data", c => { body += c; if (body.length > 100000) req.destroy(); });
    req.on("end", ()=>resolve(body));
    req.on("error", reject);
  });
}
function num(v){ const n=Number(v); return Number.isFinite(n)?n:null; }

function classify(d) {
  const close=num(d.close), e20=num(d.ema20), e50=num(d.ema50), e200=num(d.ema200);
  const e20h=num(d.ema20_1h), e50h=num(d.ema50_1h), e200h=num(d.ema200_1h);
  const e20x=num(d.ema20_4h), e50x=num(d.ema50_4h), e200x=num(d.ema200_4h);
  const rsi=num(d.rsi8), atr=num(d.atr14), z=num(d.bb_z), vwap=num(d.vwap);

  const bull1h=e20h!==null&&e50h!==null&&e200h!==null&&e20h>e50h&&e50h>e200h;
  const bear1h=e20h!==null&&e50h!==null&&e200h!==null&&e20h<e50h&&e50h<e200h;
  const bull4h=e20x!==null&&e50x!==null&&e200x!==null&&e20x>e50x&&e50x>e200x;
  const bear4h=e20x!==null&&e50x!==null&&e200x!==null&&e20x<e50x&&e50x<e200x;

  let regime="RANGE", signal="NO_TRADE", score=0, reasons=[];
  if (bull1h && bull4h) { regime="UPTREND"; score+=2; reasons.push("1H/4H trend up"); }
  else if (bear1h && bear4h) { regime="DOWNTREND"; score-=2; reasons.push("1H/4H trend down"); }
  else reasons.push("higher timeframes disagree");

  if(close!==null && vwap!==null){ if(close>vwap) score+=1; else score-=1; }
  if(e20!==null&&e50!==null){ if(e20>e50) score+=1; else score-=1; }
  if(rsi!==null){ if(rsi>=52&&rsi<=70) score+=1; if(rsi<=48&&rsi>=30) score-=1; }
  if(z!==null && Math.abs(z)>=3) reasons.push("extreme Bollinger deviation");

  if(regime==="UPTREND" && score>=4) signal="LONG_WATCH";
  if(regime==="DOWNTREND" && score<=-4) signal="SHORT_WATCH";

  return {regime,signal,score,reasons,risk_note:"Research signal only; validate by backtest before live trading.",atr};
}

const server=http.createServer(async(req,res)=>{
  if(req.method==="GET" && req.url==="/health") return json(res,200,{ok:true,service:"fx-ai"});
  if(req.method==="POST" && req.url.startsWith("/webhook/tradingview")){
    if(TOKEN){
      const u=new URL(req.url,"http://localhost");
      if(u.searchParams.get("token")!==TOKEN) return json(res,401,{ok:false,error:"unauthorized"});
    }
    try{
      const raw=await readBody(req);
      const data=JSON.parse(raw);
      if(!data.symbol || data.close===undefined) return json(res,400,{ok:false,error:"symbol and close required"});
      const analysis=classify(data);
      const row={received_at:new Date().toISOString(),...data,analysis};
      fs.appendFileSync(path.join(DATA_DIR,"tradingview.ndjson"),JSON.stringify(row)+"\n");
      return json(res,200,{ok:true,analysis});
    }catch(e){ return json(res,400,{ok:false,error:"invalid JSON"}); }
  }
  json(res,404,{ok:false,error:"not found"});
});
server.listen(PORT,()=>console.log("FX AI listening on",PORT));
