"use strict";
/* ===================== PDF text extraction (zero-dependency) ===================== */
const PDF=(()=>{
  const WS=new Set([0,9,10,12,13,32]),DL=new Set([...'()<>[]{}/%'].map(c=>c.charCodeAt(0)));
  const bin=u=>{let s="";for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return s};
  class Lx{constructor(s){this.s=s;this.i=0}
    next(){const s=this.s,n=s.length;let i=this.i;
      while(i<n){const c=s.charCodeAt(i);if(WS.has(c)){i++;continue}if(c===37){while(i<n&&s.charCodeAt(i)!==10&&s.charCodeAt(i)!==13)i++;continue}break}
      if(i>=n){this.i=i;return null}
      const c=s[i];
      if(c==="("){let dp=1;i++;const o=[];
        while(i<n&&dp>0){const ch=s.charCodeAt(i);
          if(ch===92){i++;const e=s[i];
            if(e==="n")o.push(10);else if(e==="r")o.push(13);else if(e==="t")o.push(9);else if(e==="b")o.push(8);else if(e==="f")o.push(12);
            else if(e==="\r"){if(s[i+1]==="\n")i++}else if(e==="\n"){}
            else if(e>="0"&&e<="7"){let q=e;while(q.length<3&&s[i+1]>="0"&&s[i+1]<="7"){i++;q+=s[i]}o.push(parseInt(q,8)&255)}
            else o.push(s.charCodeAt(i));i++;continue}
          if(ch===40)dp++;else if(ch===41){dp--;if(!dp){i++;break}}o.push(ch);i++}
        this.i=i;return{t:"str",v:o}}
      if(c==="<"){if(s[i+1]==="<"){this.i=i+2;return{t:"<<"}}let j=s.indexOf(">",i);if(j<0)j=n;let h=s.slice(i+1,j).replace(/[^0-9a-fA-F]/g,"");if(h.length%2)h+="0";const o=[];for(let k=0;k<h.length;k+=2)o.push(parseInt(h.substr(k,2),16));this.i=j+1;return{t:"str",v:o}}
      if(c===">"){if(s[i+1]===">"){this.i=i+2;return{t:">>"}}this.i=i+1;return{t:"op",v:">"}}
      if("[]{}".includes(c)){this.i=i+1;return{t:c}}
      if(c==="/"){let j=i+1;while(j<n){const ch=s.charCodeAt(j);if(WS.has(ch)||DL.has(ch))break;j++}this.i=j;return{t:"name",v:s.slice(i+1,j).replace(/#([0-9a-fA-F]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))}}
      let j=i;while(j<n){const ch=s.charCodeAt(j);if(WS.has(ch)||DL.has(ch))break;j++}
      if(j===i){this.i=i+1;return{t:"op",v:c}}
      const w=s.slice(i,j);this.i=j;
      if(/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w))return{t:"num",v:parseFloat(w)};
      return{t:"op",v:w}}}
  function val(lx,t){if(t===undefined)t=lx.next();if(!t)return null;
    switch(t.t){
      case"num":{const sv=lx.i,t2=lx.next();if(t2&&t2.t==="num"&&Number.isInteger(t.v)&&Number.isInteger(t2.v)){const t3=lx.next();if(t3&&t3.t==="op"&&t3.v==="R")return{ref:t.v}}lx.i=sv;return t.v}
      case"name":return{n:t.v};case"str":return{s:t.v};
      case"[":{const a=[];for(;;){const x=lx.next();if(!x||x.t==="]")break;a.push(val(lx,x))}return a}
      case"<<":{const d={};for(;;){const k=lx.next();if(!k||k.t===">>")break;if(k.t==="name")d[k.v]=val(lx)}return d}
      case"op":return t.v==="true"?true:t.v==="false"?false:t.v==="null"?null:{op:t.v}}
    return null}
  function a85(u8){const s=bin(u8).replace(/\s/g,"");const e=s.indexOf("~>");const t=(e<0?s:s.slice(0,e)).replace(/^<~/,"");const o=[];let g=[];
    for(const ch of t){if(ch==="z"&&!g.length){o.push(0,0,0,0);continue}g.push(ch.charCodeAt(0)-33);if(g.length===5){let v=0;for(const x of g)v=v*85+x;o.push(v>>>24&255,v>>>16&255,v>>>8&255,v&255);g=[]}}
    if(g.length){const n=g.length;while(g.length<5)g.push(84);let v=0;for(const x of g)v=v*85+x;o.push(...[v>>>24&255,v>>>16&255,v>>>8&255,v&255].slice(0,n-1))}return new Uint8Array(o)}
  async function inflate(u8){
    for(const fmt of["deflate","deflate-raw"]){
      try{const data=fmt==="deflate-raw"?u8.subarray(2):u8;const ds=new DecompressionStream(fmt);const w=ds.writable.getWriter();w.write(data).catch(()=>{});w.close().catch(()=>{});
        const r=ds.readable.getReader();const ch=[];let tot=0;
        try{for(;;){const{done,value}=await r.read();if(done)break;ch.push(value);tot+=value.length}}catch(e){if(!tot)throw e}
        const o=new Uint8Array(tot);let p=0;ch.forEach(c=>{o.set(c,p);p+=c.length});return o}catch(e){}}
    return null}
  const AGL={space:32,exclam:33,quotedbl:34,numbersign:35,dollar:36,percent:37,ampersand:38,quotesingle:39,parenleft:40,parenright:41,asterisk:42,plus:43,comma:44,hyphen:45,period:46,slash:47,zero:48,one:49,two:50,three:51,four:52,five:53,six:54,seven:55,eight:56,nine:57,colon:58,semicolon:59,less:60,equal:61,greater:62,question:63,at:64,bracketleft:91,backslash:92,bracketright:93,asciicircum:94,underscore:95,grave:96,braceleft:123,bar:124,braceright:125,asciitilde:126,endash:8211,emdash:8212,quoteright:8217,quoteleft:8216,quotedblleft:8220,quotedblright:8221,bullet:8226,Euro:8364,sterling:163,yen:165,section:167,copyright:169,registered:174,degree:176,periodcentered:183,ellipsis:8230,fi:0xfb01,fl:0xfb02,nbspace:160,minus:8722,multiply:215,arrowright:8594,rupee:8377};
  const W1252={128:8364,130:8218,131:402,132:8222,133:8230,134:8224,135:8225,136:710,137:8240,138:352,139:8249,140:338,142:381,145:8216,146:8217,147:8220,148:8221,149:8226,150:8211,151:8212,152:732,153:8482,154:353,155:8250,156:339,158:382,159:376};
  const glyph=n=>{if(AGL[n]!=null)return String.fromCharCode(AGL[n]);if(/^[A-Za-z]$/.test(n))return n;let m=n.match(/^uni([0-9A-Fa-f]{4,})/);if(m)return String.fromCodePoint(parseInt(m[1].slice(0,4),16));m=n.match(/^u([0-9A-Fa-f]{4,6})$/);if(m)return String.fromCodePoint(parseInt(m[1],16));return null};
  const u16=hex=>{let s="";for(let i=0;i+3<hex.length;i+=4)s+=String.fromCharCode(parseInt(hex.substr(i,4),16));return s};
  function parseCMap(txt){
    const map=new Map();let bytes=1;
    const cs=txt.match(/begincodespacerange\s*<([0-9a-fA-F]+)>/);if(cs)bytes=Math.max(1,cs[1].length/2);
    for(const blk of txt.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))for(const m of blk[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)){map.set(parseInt(m[1],16),u16(m[2]));if(!cs)bytes=Math.max(bytes,m[1].length/2)}
    for(const blk of txt.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)){
      const re=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]*)>|\[([^\]]*)\])/g;let m;
      while((m=re.exec(blk[1]))){const lo=parseInt(m[1],16),hi=parseInt(m[2],16);if(!cs)bytes=Math.max(bytes,m[1].length/2);if(hi-lo>65535)continue;
        if(m[3]!==undefined){const base=m[3];const pre=base.slice(0,-4),last=parseInt(base.slice(-4)||"0",16);for(let c=lo;c<=hi;c++)map.set(c,u16(pre)+String.fromCharCode(last+c-lo))}
        else{const arr=[...m[4].matchAll(/<([0-9a-fA-F]*)>/g)].map(x=>u16(x[1]));for(let c=lo;c<=hi&&c-lo<arr.length;c++)map.set(c,arr[c-lo])}}}
    return{map,bytes}}
  async function text(buf){
    const u=new Uint8Array(buf);const s=bin(u);
    if(!/%PDF/.test(s.slice(0,1024)))throw new Error("Not a PDF file");
    const encrypted=/\/Encrypt\s*\d+\s+\d+\s+R|\/Encrypt\s*<</.test(s);
    const O=new Map();const re=/(\d+)\s+(\d+)\s+obj\b/g;let m;
    while((m=re.exec(s))){
      const num=+m[1],st=m.index+m[0].length;let end=s.indexOf("endobj",st);if(end<0)end=s.length;
      const body=s.slice(st,end);const sm=body.match(/>>\s*stream(\r\n|\n|\r)/);let o={txt:body};
      if(sm){const ds=st+sm.index+sm[0].length;o.txt=body.slice(0,sm.index+2);const lm=o.txt.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
        let de=-1;if(lm){const L=+lm[1];if(/^\s*endstream/.test(s.substr(ds+L,24)))de=ds+L}
        if(de<0){de=s.lastIndexOf("endstream",end);if(de<ds)de=end;while(de>ds&&(s[de-1]==="\n"||s[de-1]==="\r"))de--}
        o.raw=[ds,de]}
      O.set(num,o);re.lastIndex=end}
    const dict=o=>{if(!o)return null;if(o.d===undefined){try{o.d=val(new Lx(o.txt))}catch(e){o.d=null}}return o.d};
    const get=n=>O.get(n);
    const R=v=>{let g=0;while(v&&v.ref!=null&&g++<8)v=dict(get(v.ref));return v};
    const nm=v=>(R(v)||{}).n;
    async function streamOf(o){if(!o||!o.raw)return null;if(o.dec)return o.dec;const d=dict(o)||{};const raw=u.subarray(o.raw[0],o.raw[1]);
      let f=R(d.Filter);f=Array.isArray(f)?f.map(x=>R(x)?.n):f?[f.n]:[];let out=raw;
      for(const fl of f){if(fl==="FlateDecode"||fl==="Fl"){out=await inflate(out);if(!out)return null}else if(fl==="ASCII85Decode"||fl==="A85"){out=a85(out)}else if(fl==="ASCIIHexDecode"){const h=bin(out).replace(/[^0-9a-fA-F]/g,"");const b=new Uint8Array(h.length>>1);for(let i=0;i<b.length;i++)b[i]=parseInt(h.substr(i*2,2),16);out=b}else return null}
      o.dec=out;return out}
    // object streams
    for(const [num,o] of [...O]){const d=dict(o);if(d&&d.Type&&d.Type.n==="ObjStm"){const b=await streamOf(o);if(!b)continue;const t=bin(b);const N=d.N,F=d.First;const hdr=t.slice(0,F).trim().split(/\s+/).map(Number);
      for(let i=0;i<N;i++){const on=hdr[i*2],off=hdr[i*2+1],nx=i+1<N?hdr[i*2+3]:t.length-F;if(!O.has(on))O.set(on,{txt:t.slice(F+off,F+nx)})}}}
    const objOf=v=>v&&v.ref!=null?get(v.ref):null;
    const fontCache=new Map();
    async function font(ref){
      const key=ref&&ref.ref!=null?ref.ref:Math.random();if(fontCache.has(key))return fontCache.get(key);
      const fd=R(ref)||{};const sub=nm(fd.Subtype);let cm=null;
      if(fd.ToUnicode){const b=await streamOf(objOf(fd.ToUnicode));if(b)cm=parseCMap(bin(b))}
      const two=cm?cm.bytes===2:sub==="Type0";
      let W=new Map(),dw=1000;
      if(sub==="Type0"){const desc=R((R(fd.DescendantFonts)||[])[0])||{};dw=desc.DW??1000;const w=R(desc.W)||[];
        for(let i=0;i<w.length;){const a=R(w[i]),b=R(w[i+1]);if(Array.isArray(b)){b.forEach((x,k)=>W.set(a+k,R(x)));i+=2}else{const c=R(w[i+2]);for(let k=a;k<=b;k++)W.set(k,c);i+=3}}}
      else{const fc=R(fd.FirstChar)||0;(R(fd.Widths)||[]).forEach((x,k)=>W.set(fc+k,R(x)));dw=0;if(!W.size)dw=500}
      const diff=new Map();const enc=R(fd.Encoding);if(enc&&enc.Differences){let c=0;for(const x of R(enc.Differences)){const v=R(x);if(typeof v==="number")c=v;else if(v&&v.n){const g=glyph(v.n);if(g!=null)diff.set(c,g);c++}}}
      const F={two,decode(bytes){const out=[];const step=two?2:1;for(let i=0;i+step-1<bytes.length;i+=step){const code=two?bytes[i]*256+bytes[i+1]:bytes[i];
          let ch=cm?.map.get(code);if(ch==null){if(two)ch="";else ch=diff.get(code)??String.fromCharCode(W1252[code]||code)}
          out.push({c:ch,w:(W.get(code)??dw)||0,sp:!two&&code===32})}return out}};
      fontCache.set(key,F);return F}
    const mul=(a,b)=>[a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3],a[4]*b[0]+a[5]*b[2]+b[4],a[4]*b[1]+a[5]*b[3]+b[5]];
    async function run(str,res,ctm,runs,depth){
      if(depth>6)return;res=R(res)||{};const fonts=R(res.Font)||{},xo=R(res.XObject)||{};
      const lx=new Lx(str);let ops=[];const stack=[];
      let g={ctm},tm=[1,0,0,1,0,0],lm=tm,f=null,fs=10,Tc=0,Tw=0,Th=1,TL=0,Ts=0;
      const show=bytes=>{if(!f)return;const gl=f.decode(bytes);let tx=0;let txt="";
        for(const x of gl){txt+=x.c;tx+=((x.w/1000)*fs+Tc+(x.sp?Tw:0))*Th}
        const M=mul(mul([fs*Th,0,0,fs,0,Ts],tm),g.ctm);const E=mul(mul([1,0,0,1,tx,0],tm),g.ctm);
        if(txt.trim()||txt===" ")runs.push({x:M[4],y:M[5],ex:E[4],sz:Math.hypot(M[2],M[3])||fs,t:txt});
        tm=mul([1,0,0,1,tx,0],tm)};
      const fn=async name=>{const r=fonts[name];f=r?await font(r):null};
      for(let t=lx.next();t;t=lx.next()){
        if(t.t!=="op"){ops.push(val(lx,t));continue}
        const op=t.v,a=ops;ops=[];
        switch(op){
          case"q":stack.push({...g});break;case"Q":if(stack.length)g=stack.pop();break;
          case"cm":if(a.length>=6)g.ctm=mul(a.slice(-6),g.ctm);break;
          case"BT":tm=lm=[1,0,0,1,0,0];break;
          case"Tf":if(a.length>=2){await fn(a[a.length-2]?.n);fs=a[a.length-1]}break;
          case"Tc":Tc=a[0]||0;break;case"Tw":Tw=a[0]||0;break;case"Tz":Th=(a[0]??100)/100;break;case"TL":TL=a[0]||0;break;case"Ts":Ts=a[0]||0;break;
          case"Td":lm=mul([1,0,0,1,a[0]||0,a[1]||0],lm);tm=lm;break;
          case"TD":TL=-(a[1]||0);lm=mul([1,0,0,1,a[0]||0,a[1]||0],lm);tm=lm;break;
          case"Tm":if(a.length>=6){lm=tm=a.slice(-6)}break;
          case"T*":lm=mul([1,0,0,1,0,-TL],lm);tm=lm;break;
          case"Tj":if(a[0]?.s)show(a[0].s);break;
          case"'":lm=mul([1,0,0,1,0,-TL],lm);tm=lm;if(a[0]?.s)show(a[0].s);break;
          case'"':Tw=a[0]||0;Tc=a[1]||0;lm=mul([1,0,0,1,0,-TL],lm);tm=lm;if(a[2]?.s)show(a[2].s);break;
          case"TJ":for(const e of(a[0]||[])){if(e?.s)show(e.s);else if(typeof e==="number")tm=mul([1,0,0,1,(-e/1000)*fs*Th,0],tm)}break;
          case"Do":{const xr=xo[a[0]?.n];const xobj=objOf(xr);const xd=dict(xobj);if(xd&&nm(xd.Subtype)==="Form"){const b=await streamOf(xobj);if(b){const M=Array.isArray(xd.Matrix)?xd.Matrix.map(R):[1,0,0,1,0,0];await run(bin(b),xd.Resources||res,mul(M,g.ctm),runs,depth+1)}}break}
          case"BI":{const k=str.indexOf("EI",lx.i);lx.i=k<0?str.length:k+2;break}
        }}}
    function phrases(runs){ // merge runs on same baseline with small gaps
      runs.sort((a,b)=>b.y-a.y||a.x-b.x);const L=[];
      for(const r of runs){const tol=Math.max(1.5,r.sz*.45);let l=L.length?L[L.length-1]:null;if(!l||Math.abs(l.y-r.y)>tol){l={y:r.y,r:[]};L.push(l)}l.r.push(r)}
      const P=[];for(const l of L){l.r.sort((a,b)=>a.x-b.x);let cur=null;
        for(const r of l.r){const gap=cur?r.x-cur.ex:0;if(cur&&gap<cur.sz*1.6){if(gap>cur.sz*.16&&!cur.t.endsWith(" ")&&!r.t.startsWith(" "))cur.t+=" ";cur.t+=r.t;cur.ex=Math.max(cur.ex,r.ex)}else{cur={x:r.x,ex:r.ex,y:l.y,sz:r.sz,t:r.t};P.push(cur)}}}
      return{L,P}}
    function layout(runs){
      const{L,P}=phrases(runs.map(r=>({...r})));
      const lines=L.map(l=>{let s="",pe=null,ps=10;for(const r of l.r){if(pe!=null){const gap=r.x-pe;if(gap>ps*2.2)s+="   ";else if(gap>ps*.16&&!s.endsWith(" ")&&!r.t.startsWith(" "))s+=" "}s+=r.t;pe=Math.max(pe??-1e9,r.ex);ps=r.sz}return s.replace(/\s+$/,"")}).filter(x=>x.trim()).join("\n");
      // cell layout: stack narrow phrases that sit directly under each other (table cells), then rebuild rows
      const minX=Math.min(...P.map(p=>p.x)),maxX=Math.max(...P.map(p=>p.ex)),PW=Math.max(1,maxX-minX);
      const cells=[];for(const p of P){const w=p.ex-p.x;const c=cells.find(c=>!c.closed&&Math.abs(c.x-p.x)<p.sz*.9&&c.bot-p.y>0&&c.bot-p.y<p.sz*1.5&&(c.ex-c.x)<PW*.34&&w<PW*.34);
        if(c){c.t+=" "+p.t.trim();c.bot=p.y;c.ex=Math.max(c.ex,p.ex)}else cells.push({x:p.x,ex:p.ex,top:p.y,bot:p.y,sz:p.sz,t:p.t.trim()})}
      cells.sort((a,b)=>b.top-a.top||a.x-b.x);const rows=[];
      for(const c of cells){let r=rows.find(r=>c.top<=r.top+c.sz*.5&&c.top>=r.bot-c.sz*.6);if(!r){r={top:c.top,bot:c.bot,c:[]};rows.push(r)}r.c.push(c);r.bot=Math.min(r.bot,c.bot)}
      const cellsTxt=rows.map(r=>r.c.sort((a,b)=>a.x-b.x).map(c=>c.t).join("   ")).join("\n");
      return{lines,cellsTxt}}
    // page walk
    const pages=[];
    const cat=[...O.values()].find(o=>/\/Type\s*\/Catalog/.test(o.txt));
    const walk=(node,inh,d=0)=>{node=R(node);if(!node||d>30)return;const res=node.Resources||inh;
      if(nm(node.Type)==="Pages"||node.Kids){for(const k of R(node.Kids)||[])walk(k,res,d+1)}else pages.push({p:node,res})};
    if(cat)walk(dict(cat).Pages,null);
    if(!pages.length)for(const o of O.values()){const d=dict(o);if(d&&nm(d.Type)==="Page")pages.push({p:d,res:d.Resources})}
    const outPages=[];
    for(const{p,res}of pages){let c=p.Contents;const arr=Array.isArray(R(c))?R(c):[c];let str="";
      for(const x of arr){const b=await streamOf(objOf(x));if(b)str+=bin(b)+"\n"}
      const runs=[];try{await run(str,res,[1,0,0,1,0,0],runs,0)}catch(e){console.warn("pdf page",e)}outPages.push(runs.length?layout(runs):{lines:"",cellsTxt:""})}
    const norm=t=>t.replace(/[\u00a0\u2007\u202f]/g," ").replace(/\ufb01/g,"fi").replace(/\ufb02/g,"fl").replace(/\u0000/g,"");
    let txt=outPages.map(p=>p.lines).join("\n\n").replace(/[   ]/g," ").replace(/ﬁ/g,"fi").replace(/ﬂ/g,"fl");txt=norm(txt);const alt=norm(outPages.map(p=>p.cellsTxt).join("\n\n"));
    return{text:txt,alt,pages:pages.length,encrypted}}
  return{text}})();

/* ===================== Other file types ===================== */
function htmlToText(h){const d=new DOMParser().parseFromString(h,"text/html");d.querySelectorAll("script,style,head").forEach(e=>e.remove());
  d.querySelectorAll("br,p,div,tr,li,h1,h2,h3,h4,h5,table,section,header,footer").forEach(e=>e.append("\n"));d.querySelectorAll("td,th").forEach(e=>e.append("  "));
  return(d.body?.textContent||"").replace(/[ \t ]+/g," ").replace(/ *\n */g,"\n").replace(/\n{2,}/g,"\n").trim()}
const utf8=b=>new TextDecoder("utf-8").decode(b);
function qpDecode(s){s=s.replace(/=\r?\n/g,"");const b=[];for(let i=0;i<s.length;i++){if(s[i]==="="&&/^[0-9A-F]{2}$/i.test(s.substr(i+1,2))){b.push(parseInt(s.substr(i+1,2),16));i+=2}else b.push(s.charCodeAt(i)&255)}return utf8(new Uint8Array(b))}
function b64Decode(s){try{const r=atob(s.replace(/\s+/g,""));const b=new Uint8Array(r.length);for(let i=0;i<r.length;i++)b[i]=r.charCodeAt(i);return utf8(b)}catch(e){return""}}
function emlToText(raw){
  const parts=[];const walk=(chunk,depth)=>{const sp=chunk.search(/\r?\n\r?\n/);const head=sp<0?chunk:chunk.slice(0,sp),body=sp<0?"":chunk.slice(sp).replace(/^\r?\n\r?\n/,"");
    const ct=(head.match(/content-type:\s*([^;\s]+)/i)||[,"text/plain"])[1].toLowerCase();const bd=head.match(/boundary="?([^";\r\n]+)"?/i);
    if(ct.startsWith("multipart")&&bd&&depth<5){body.split("--"+bd[1]).forEach(p=>{if(p.trim()&&!p.startsWith("--"))walk(p.replace(/^\r?\n/,""),depth+1)})}
    else if(ct.startsWith("text/")){const te=(head.match(/content-transfer-encoding:\s*(\S+)/i)||[,""])[1].toLowerCase();let t=te==="quoted-printable"?qpDecode(body):te==="base64"?b64Decode(body):body;parts.push({ct,t})}};
  walk(raw,0);const subj=(raw.match(/^subject:\s*(.+)$/im)||[,""])[1];
  const pl=parts.find(p=>p.ct==="text/plain"),ht=parts.find(p=>p.ct==="text/html");
  return(subj?"Subject: "+subj+"\n":"")+(ht?htmlToText(ht.t):pl?pl.t:raw)}
async function fileToText(file){
  const n=file.name.toLowerCase(),t=file.type;const buf=await file.arrayBuffer();
  if(t==="application/pdf"||n.endsWith(".pdf")){const r=await PDF.text(buf);return{text:r.text,alt:r.alt,method:`PDF · ${r.pages} page${r.pages===1?"":"s"}`,encrypted:r.encrypted,buf}}
  if(n.endsWith(".eml")||t==="message/rfc822")return{text:emlToText(utf8(new Uint8Array(buf))),method:"Email (.eml)",buf};
  if(n.endsWith(".html")||n.endsWith(".htm")||t==="text/html")return{text:htmlToText(utf8(new Uint8Array(buf))),method:"HTML",buf};
  if(t.startsWith("text/")||/\.(txt|csv|md)$/.test(n))return{text:utf8(new Uint8Array(buf)),method:"Text",buf};
  if(t.startsWith("image/"))return{text:"",method:"Image",image:true,buf};
  return{text:"",method:"Unsupported",buf}}

/* ===================== Booking parsers ===================== */
const MONS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
const MRX="(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)(?![a-z])";
function inferYear(m,d,ref){const r=dObj(ref);let y=r.getUTCFullYear();let c=Date.UTC(y,m-1,d);if(c<r-45*864e5)y++;return y}
function findDates(text,ref=todayIn("Asia/Kolkata")){
  const out=[];
  const P=[[new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-/.,']*${MRX}\\.?[\\s\\-/.,']*((?:19|20)\\d{2}(?!\\d)|\\d{2}(?![\\d:]))?`,"gi"),m=>({d:+m[1],m:MONS[m[2].toLowerCase().slice(0,3)],y:m[3]})],
    [new RegExp(`\\b${MRX}\\.?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:])(?:,?\\s*((?:19|20)\\d{2})(?!\\d))?`,"gi"),m=>({d:+m[2],m:MONS[m[1].toLowerCase().slice(0,3)],y:m[3]})],
    [/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g,m=>({y:m[1],m:+m[2],d:+m[3]})],
    [/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2}|\d{2})(?![\d.])/g,m=>{let a=+m[1],b=+m[2];if(b>12&&a<=12)[a,b]=[b,a];return{d:a,m:b,y:m[3]}}]];
  for(const[rx,f]of P){let m;rx.lastIndex=0;while((m=rx.exec(text))){const o=f(m);if(!o.m||o.d<1||o.d>31||o.m>12)continue;
    let y=o.y?+o.y:null;if(y&&y<100)y+=2000;if(!y)y=inferYear(o.m,o.d,ref);
    out.push({i:m.index,e:m.index+m[0].length,v:`${y}-${pad(o.m)}-${pad(o.d)}`,hasY:!!o.y})}}
  out.sort((a,b)=>a.i-b.i||(b.e-b.i)-(a.e-a.i));const r=[];let last=-1;for(const x of out){if(x.i>=last){r.push(x);last=x.e}}return r}
function findTimes(text){
  const out=[];const rx=/\b([01]?\d|2[0-3])(?::|\.(?=[0-5]\d\s*(?:am|pm|a\.m|p\.m|hrs?\b)))([0-5]\d)(?::[0-5]\d)?\s*(am|pm|a\.m\.?|p\.m\.?|hrs?\b|h\b)?(?![\d])/gi;let m;
  while((m=rx.exec(text))){const pre=text.slice(Math.max(0,m.index-22),m.index).toLowerCase();if(/(duration|layover|journey time|travel time|total time|stop ?over|connection)\W*$/.test(pre))continue;
    let h=+m[1];const ap=(m[3]||"").toLowerCase();if(ap.startsWith("p")&&h<12)h+=12;if(ap.startsWith("a")&&h===12)h=0;out.push({i:m.index,e:m.index+m[0].length,v:`${pad(h)}:${m[2]}`})}
  const rx2=/\b([01]\d|2[0-3])([0-5]\d)\s*(?:hrs?|h)\b/gi;while((m=rx2.exec(text)))out.push({i:m.index,e:m.index+m[0].length,v:`${m[1]}:${m[2]}`});
  const rx3=/\b(1[0-2]|0?[1-9])\s*(am|pm|a\.m\.|p\.m\.)/gi;while((m=rx3.exec(text))){let h=+m[1];const ap=m[2].toLowerCase();if(ap.startsWith("p")&&h<12)h+=12;if(ap.startsWith("a")&&h===12)h=0;if(!out.some(o=>m.index>=o.i&&m.index<o.e))out.push({i:m.index,e:m.index+m[0].length,v:`${pad(h)}:00`})}
  return out.sort((a,b)=>a.i-b.i)}
const AMBIG=new Set("PER MAN ADD CAN LOS NAN DUB HAM BER SIN GAN SAG PAT GAY SEA MAD BUD DEN SAW PEN MEL LAS TIR DED AGR MIA BOS DIU CEB HAN SAI LIM OKA FUK ICN ORD IAD ATL GOP IXA AMS JED BAH RAJ DAD ADL".split(" "));
const CITY_IDX=(()=>{const L=[];for(const a of Object.values(AP))for(const n of a.names)if(n.length>=4&&!/^(male|nice|gaya)$/i.test(n))L.push([n.toLowerCase(),a.code]);L.push(["goa","GOI"]);return L.sort((a,b)=>b[0].length-a[0].length)})();
function findAirports(text){
  const out=[];const rx=/\b[A-Z]{3}\b/g;let m;
  while((m=rx.exec(text))){const c=m[0];if(!AP[c])continue;const i=m.index,e=i+3;
    const before=text.slice(Math.max(0,i-8),i),after=text.slice(e,e+14);
    const strong=/\(\s*$/.test(before)||/^\s*\)/.test(after)||/[A-Z]{3}\s*(?:→|->|–|—|-|>|to|›|»|✈)\s*$/.test(before)||/^\s*(?:→|->|–|—|-|>|to|›|»|✈)\s*[A-Z]{3}\b/.test(after)||/\b[A-Z]{3}\s+$/.test(before)&&!!AP[before.trim().slice(-3)]||/^\s+[A-Z]{3}\b/.test(after)&&!!AP[after.trim().slice(0,3)]||/^\s*(?:[01]?\d|2[0-3]):?[0-5]\d/.test(after)||/(?:[01]?\d|2[0-3]):[0-5]\d\s*$/.test(before);
    if(AMBIG.has(c)&&!strong)continue;out.push({i,e,v:c,strong})}
  const low=text.toLowerCase();
  for(const[n,c]of CITY_IDX){let k=0;while((k=low.indexOf(n,k))>=0){const e=k+n.length;const okB=k===0||!/[a-z]/.test(low[k-1]),okE=e>=low.length||!/[a-z]/.test(low[e]);
      if(okB&&okE&&!out.some(o=>k<o.e+2&&e>o.i-2))out.push({i:k,e,v:c,city:1});k=e}}
  return out.sort((a,b)=>a.i-b.i)}
const ALC=Object.keys(AIRLINES).sort((a,b)=>b.length-a.length).join("|");
function findFlights(text){
  const rx=new RegExp(`(?<![A-Za-z0-9])(${ALC})\\s?-?\\s?(\\d{1,4})(?![\\d/.:])(?!\\s?(?:kg|kgs|pcs|piece|adult|pax|nights?|rooms?)\\b)`,"g");const out=[];let m;
  while((m=rx.exec(text))){const pre=text.slice(Math.max(0,m.index-18),m.index).toLowerCase();if(/(booking|order|trip|user|customer|transaction|reference|ref|invoice|gst|id|no)\W*$/.test(pre)&&m[1]==="ID")continue;
    if(/(terminal|gate|seat|row|class|tier)\W*$/.test(pre))continue;out.push({i:m.index,e:m.index+m[0].length,code:m[1],num:m[2],v:m[1]+" "+m[2]})}
  return out}
const NAME_STOP=new Set("seat adult adults child infant economy business premium flight ticket male female passenger passengers name age status confirmed baggage check meal pnr booking reference guest guests room rooms total date from to departure arrival terminal gate class fare dear hello hi thank thanks your you sir madam mr mrs ms the and for of with booked web extra cabin hand nationality passport frequent flyer type sl cnf wl rac berth coach quota sex no vegetarian veg nonveg".split(" "));
const tcase=s=>s.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
function cleanName(raw){const w=raw.trim().split(/\s+/);const r=[];for(const x of w){const k=x.toLowerCase().replace(/[^a-z]/g,"");if(!k||NAME_STOP.has(k)||/\d/.test(x))break;r.push(x)}return r.length>=1&&r.join(" ").length>=3?tcase(r.join(" ")):null}
function findNames(text){
  const out=[];const add=n=>{if(n&&!out.some(o=>o.toLowerCase()===n.toLowerCase())&&n.split(" ").length<=5)out.push(n)};
  for(const m of text.matchAll(/\b([A-Z]{2,})\s*\/\s*([A-Z]{2,}(?:\s[A-Z]{2,})?)\s*(MRS|MR|MS|MSTR|MISS|DR)\b/g)){if(!NAME_STOP.has(m[1].toLowerCase()))add(cleanName(m[2]+" "+m[1]))}
  for(const m of text.matchAll(/(?<![A-Za-z])(MRS|MR|MS|MISS|MSTR|DR|Mrs|Mr|Ms|Miss|Mstr|Dr)\.?\s+([A-Z][A-Za-z'\-]+(?:[ \t]+[A-Z][A-Za-z'\-]+){0,3})/g))add(cleanName(m[2]));
  for(const m of text.matchAll(/(?:passenger|traveller|traveler|guest|lead guest|booked by|guest name|passenger name)s?(?:\s*name)?\s*(?:\(s\))?\s*[:\-]\s*([A-Za-z][A-Za-z .'\-]{2,40})/gi)){const n=cleanName(m[1].replace(/^(mrs|mr|ms|miss|dr)\.?\s+/i,""));add(n)}
  for(const m of text.matchAll(/^\s*\d\s*[.)]?\s+([A-Z][A-Z .]{2,40}?)\s+(\d{1,2})\s+(M|F|MALE|FEMALE|Male|Female)\b/gm))add(cleanName(m[1]));
  return out.slice(0,9)}
const CURMAP={"₹":"INR","rs":"INR","rs.":"INR","inr":"INR","$":"USD","us$":"USD","usd":"USD","rm":"MYR","myr":"MYR","€":"EUR","eur":"EUR","£":"GBP","gbp":"GBP","aed":"AED","sgd":"SGD","s$":"SGD","thb":"THB","฿":"THB","idr":"IDR","rp":"IDR","lkr":"LKR","jpy":"JPY","¥":"JPY","aud":"AUD","a$":"AUD","vnd":"VND","₫":"VND","npr":"NPR","qar":"QAR","sar":"SAR","chf":"CHF","hkd":"HKD"};
function findAmount(text){
  const rx=/(grand\s+total|total\s+(?:amount|fare|price|paid|cost|charges|payable)|amount\s+(?:paid|payable|charged)|you(?:'ve)?\s+paid|net\s+payable|total|price|amount)\s*(?:\([^)]{0,30}\))?\s*[:\-]?\s*(₹|rs\.?|inr|usd|us\$|\$|myr|rm|eur|€|gbp|£|aed|sgd|s\$|thb|฿|idr|rp|lkr|jpy|¥|aud|a\$|vnd|₫|npr|qar|sar|chf|hkd)?\s*([\d][\d,]*(?:\.\d{1,2})?)\s*(inr|usd|myr|eur|gbp|aed|sgd|thb|idr|lkr|jpy|aud|vnd|npr|qar|sar|chf|hkd)?/gi;
  let best=null;for(const m of text.matchAll(rx)){const lab=m[1].toLowerCase();const pr=/grand|payable|paid|charged/.test(lab)?3:/total/.test(lab)?2:1;const v=parseFloat(m[3].replace(/,/g,""));if(!v||v<1)continue;
    const cu=CURMAP[(m[2]||m[4]||"").toLowerCase()]||null;if(!best||pr>best.pr||(pr===best.pr&&v>best.v))best={pr,v,cur:cu}}
  if(!best){const m=text.match(/(₹|rs\.?|inr|rm|myr|usd|\$)\s*([\d][\d,]*(?:\.\d{1,2})?)/i);if(m)best={v:parseFloat(m[2].replace(/,/g,"")),cur:CURMAP[m[1].toLowerCase()]}}
  return best}
function payStatus(text){const t=text.toLowerCase();
  if(/pay (?:at|when you stay|at the property|at hotel|later)|you'll pay|payment (?:is )?due|to be paid|balance (?:due|payable)|unpaid|payment pending/.test(t))return"pending";
  if(/payment (?:status\s*:?\s*)?(?:successful|success|completed|received|confirmed|paid)|amount paid|you(?:'ve)? paid|fully paid|prepaid|paid online|payment made|transaction successful/.test(t))return"paid";return null}
const LBL_STOP=/^(booking|confirmation|reference|number|details|status|date|code|summary|id|pnr|ticket|itinerary|confirmed)$/i;
function labelVal(text,labels,valRx,ok=v=>true){for(const l of labels){const r=new RegExp(`(?:${l})\\.?\\s*(?:no\\.?|number|#|code)?\\s*[:\\-#]?\\s*${valRx}`,"gi");for(const m of text.matchAll(r)){const v=m[1];if(v&&!LBL_STOP.test(v)&&ok(v))return v}}return null}
const META_DATE=/(booking|booked|issue|issued|transaction|invoice|generated|printed|birth|dob|payment|order)\s*(date|on)?\s*[:\-]?\s*(\w{3},?\s*)?$/i;
const notMeta=(text,arr)=>arr.filter(d=>!META_DATE.test(text.slice(Math.max(0,d.i-28),d.i)));
function detectKind(text){const t=text.toLowerCase();const c=(rx)=>(t.match(rx)||[]).length;
  const fl=c(/\bflights?\b|\bboarding\b|\bterminal\b|\bbaggage\b|\bcabin\b|\be-?ticket\b|\bairlines?\b|\bweb check-?in\b|\bcheck-?in baggage\b/g)+findFlights(text).length*2;
  const ho=c(/\bcheck-?in\b|\bcheck-?out\b|\bhotel\b|\broom\b|\bnights?\b|\bproperty\b|\bresort\b|\bstay\b|\bguests?\b/g)-c(/check-?in baggage|web check-?in/g)*2;
  const tr=c(/\birctc\b|\btrain\b|\bcoach\b|\bberth\b|\bsleeper\b|\brailways?\b|\bboarding (?:station|at)\b|\bquota\b|\bchart\b/g)+(/pnr\s*(?:no\.?|number)?\s*[:\-]?\s*\d{10}\b/i.test(text)?5:0);
  const m=Math.max(fl,ho,tr);if(m<1)return"activity";return m===tr?"train":m===fl?"flight":"hotel"}
function nearest(arr,i,after=true,max=1e9){let b=null;for(const x of arr){const d=after?x.i-i:i-x.i;if(d>=0&&d<=max&&(!b||d<b.d))b={...x,d}}return b}
function parseFlights(text,ref){
  const fl=findFlights(text),aps=findAirports(text),dates=notMeta(text,findDates(text,ref)),times=findTimes(text);
  const segs=[];
  const occ=fl.length?fl:[{i:0,e:0,v:"",code:"",num:""}];
  occ.forEach((f,k)=>{
    const pst=f.i,pen=k<occ.length-1?occ[k+1].i:Math.min(text.length,f.e+420); // primary: after flight no
    const lst=k===0?Math.max(0,f.i-220):Math.max(occ[k-1].e,f.i-160),len=f.i;        // lookback: before flight no
    const pick=(arr,a,b)=>arr.filter(x=>x.i>=a&&x.i<b);
    const seqOf=A=>{const codes=A.filter(a=>!a.city);const use=codes.length>=2?codes:A;const q=[];for(const a of use){if(!q.length||q[q.length-1].v!==a.v)q.push(a)}return q};
    let seq=seqOf(pick(aps,pst,pen));if(seq.length<2){const lb=seqOf(pick(aps,lst,len));if(lb.length>=2||!seq.length)seq=lb.concat(seq.filter(x=>!lb.some(y=>y.v===x.v)))}
    const from=seq[0]?.v||"",to=seq.find(a=>a.v!==from)?.v||"";
    let D=pick(dates,pst,pen),T=pick(times,pst,pen);const st=D.length||T.length?pst:lst;
    if(!D.length)D=pick(dates,lst,len);if(!T.length)T=pick(times,lst,len);
    const W=text.slice(st,pen);
    // GDS-style "23DEC 2345 0640+1"
    if(!T.length&&D.length){const tail=text.slice(D[0].e,D[0].e+30);const g=[...tail.matchAll(/(?<![\d,.])([01]\d|2[0-3])([0-5]\d)(?![\d,.])/g)].slice(0,2);T=g.map(m=>({i:D[0].e+m.index,e:D[0].e+m.index+4,v:`${m[1]}:${m[2]}`}))}
    const lab=(rx)=>{const m=W.match(rx);if(!m)return null;return nearest(T,st+m.index+m[0].length,true,60)};
    let dT=lab(/\bdep(?:arture|arts|\.)?(?:\s*time)?\b(?!\s*(?:terminal|airport|city))/i),aT=lab(/\barr(?:ival|ives|\.)?(?:\s*time)?\b(?!\s*(?:terminal|airport|city))/i);
    if(dT&&aT&&aT.i<=dT.i)aT=null;
    if(!dT)dT=T[0]||null;if(!aT)aT=T.find(t=>dT&&t.i>dT.i&&t.v!==dT.v)||null;
    let dD=dT?(nearest(D,dT.i,false,40)||nearest(D,dT.i,true,40)||nearest(D,dT.i,false,140)):null;if(!dD)dD=D[0]||null;
    if(!dD){const pr=dates.filter(d=>d.i<f.i).pop();dD=pr||dates.find(d=>d.i>f.i)||null}
    let aD=null;if(aT){const c=nearest(D,aT.i,false,40);const c2=nearest(D,aT.i,true,25);const cand=[c,c2].filter(x=>x&&dD&&x.i!==dD.i&&x.i>dD.i&&x.v>=dD.v&&dayDiff(dD.v,x.v)<=2);aD=cand[0]||null;
      if(!aD&&c&&dD&&c.i===dD.i&&c.i>dT.i)aD=c}
    const depDate=dD?.v||"",dep=depDate&&dT?`${depDate}T${dT.v}`:depDate?`${depDate}T00:00`:"";
    let arr="";
    if(aT&&depDate){let ad=aD?.v||depDate;const plus=/^\s*(?:\+\s?1\b|\(\+1\)|next day)/i.test(text.slice(aT.e,aT.e+14));if(plus&&!aD)ad=addDays(depDate,1);
      arr=`${ad}T${aT.v}`;const dtz=apTz(from)||"Asia/Kolkata",atz=apTz(to)||dtz;if(!aD&&!plus&&toUTC(arr,atz)<=toUTC(dep,dtz))arr=`${addDays(ad,1)}T${aT.v}`}
    const term=(W.match(/terminal\s*[:\-]?\s*([0-9A-Z]{1,2})\b/i)||W.match(/\b(?:BLR|DEL|BOM|MAA|CCU|HYD|[A-Z]{3})\)?\s+T([1-4])\b/)||[])[1]||"";
    const seg={flightNo:f.v,airline:AIRLINES[f.code]||"",from,to,dep,arr,depTz:apTz(from)||"",arrTz:apTz(to)||"",terminal:term,_f:{flightNo:!!f.v,from:!!from,to:!!to,dep:!!(dD&&dT),arr:!!aT}};
    seg._score=Object.values(seg._f).filter(Boolean).length;segs.push(seg)});
  const merged=[];for(const s of segs){const m=merged.find(x=>x.flightNo&&x.flightNo===s.flightNo&&(!x._f.dep||!s._f.dep||x.dep.slice(0,10)===s.dep.slice(0,10)));
    if(m){if(s._score>m._score)Object.assign(m,s)}else merged.push(s)}
  return merged.filter(s=>s._score>=3||merged.length===1)}
function parseHotel(text,ref){
  const dates=notMeta(text,findDates(text,ref)),times=findTimes(text);
  let name=(text.match(/(?:hotel|property|accommodation)\s*(?:name)?\s*[:\-]\s*([^\n]{3,80})/i)||[])[1]
    ||(text.match(/(?:booking|reservation|stay)\s+(?:is\s+)?confirmed\s+(?:at|for)\s+([^\n.!]{3,80})/i)||[])[1]
    ||(text.match(/your\s+(?:stay|booking|reservation)\s+at\s+([^\n.!,]{3,80})/i)||[])[1];
  if(!name){const ln=text.split("\n").find(l=>/\b(hotel|resort|inn|suites?|residency|villa|hostel|homestay|lodge|palace|retreat|apartments?|marriott|hilton|hyatt|taj|oberoi|ibis|novotel|holiday inn|radisson|sheraton|westin|lemon tree|treebo|oyo|fabhotel)\b/i.test(l)&&l.length<80&&!/booking\.com|agoda|confirm|policy|cancel|check/i.test(l));if(ln)name=ln}
  name=(name||"").replace(/\s{2,}.*$/,"").trim();
  const ref2=labelVal(text,["confirmation","booking\\s*(?:id|ref(?:erence)?)","reservation","itinerary","booking"],"([A-Z0-9][A-Z0-9.\\-]{4,22})",v=>/\d/.test(v));
  const pin=labelVal(text,["pin\\s*code","pin"],"(\\d{4,6})");
  const addr=(text.match(/address\s*[:\-]\s*([^\n]{6,180})/i)||[])[1]||"";
  const near=(lab,defT)=>{const m=text.match(lab);if(!m)return null;const p=m.index+m[0].length;let d=nearest(dates,p,true,90)||nearest(dates,m.index,false,50);
    let t=null;if(d){t=nearest(times,d.e,true,45)}if(!t)t=nearest(times,p,true,70);const seg=text.slice(p,p+90);if(t&&/hrs?\s*(?:before|prior)/i.test(text.slice(t.i,t.e+20)))t=null;return d?{d:d.v,t:t?.v||defT,tf:!!t}:null};
  let ci=near(/check[\s-]?in(?!\s*baggage)/i,"14:00"),co=near(/check[\s-]?out/i,"12:00");
  if(!ci&&dates.length)ci={d:dates[0].v,t:"14:00"};if(!co&&dates.length>1)co={d:dates.find(x=>ci&&x.v>ci.d)?.v||dates[1].v,t:"12:00"};
  const nights=+(text.match(/(\d{1,2})\s*nights?/i)||[])[1]||0;if(ci&&!co&&nights)co={d:addDays(ci.d,nights),t:"12:00"};
  const guests=(text.match(/(\d+)\s*(?:adults?|guests?)/i)||[])[1]||"",rooms=(text.match(/(\d+)\s*rooms?\b/i)||[])[1]||"";
  const roomType=(text.match(/room\s*type\s*[:\-]\s*([^\n]{3,60})/i)||[])[1]||"";
  const phone=(text.match(/(?:phone|tel|telephone|contact)\s*(?:no\.?|number)?\s*[:\-]?\s*(\+?[\d][\d\s\-()]{7,18}\d)/i)||[])[1]||"";
  // tz guess from city names in name/address/full text
  const aps=findAirports(name+" "+addr);const ap=aps.find(a=>a.city)||findAirports(text).find(a=>a.city);
  return{name,ref:ref2||"",pin:pin||"",address:addr.trim(),checkIn:ci?`${ci.d}T${ci.t}`:"",checkOut:co?`${co.d}T${co.t}`:"",guests,rooms,roomType:roomType.trim(),phone:phone.trim(),tz:ap?AP[ap.v].tz:"",nights,
    _f:{name:!!name,ref:!!ref2,checkIn:!!ci,checkOut:!!co,address:!!addr}}}
function parseTrain(text,ref){
  const dates=notMeta(text,findDates(text,ref)),times=findTimes(text);
  const pnr=(text.match(/PNR\s*(?:No\.?|Number)?\s*[:\-]?\s*(\d{10})\b/i)||[])[1]||"";
  const tm=text.match(/Train\s*(?:No\.?|Number)?\s*(?:[\/&]\s*Name)?\s*[:\-]?\s*(\d{5})\s*[\/\-\s]*\s*([A-Z][A-Z0-9 .\-]{2,40})?/i);
  const st=(lab)=>{const m=text.match(new RegExp(`(?:${lab})\\s*[:\\-]?\\s*([A-Z][A-Za-z .]{1,40}?)\\s*\\(\\s*([A-Z]{2,5})\\s*\\)`,"i"));return m?{name:tcase(m[1].trim()),code:m[2]}:null};
  const fr=st("booked\\s+from|boarding\\s+(?:at|station|point)|from"),to=st("reservation\\s+up\\s*to|to|destination|upto");
  const tAt=(lab)=>{const m=text.match(new RegExp(`(?:${lab})\\*?\\s*[:\\-]?`,"i"));if(!m)return null;const p=m.index+m[0].length;const t=nearest(times,p,true,40);const d=t?(nearest(dates,t.e,true,30)||nearest(dates,p,true,60)):nearest(dates,p,true,60);return{t:t?.v||"",d:d?.v||""}};
  let dp=tAt("departure|start\\s*date|dep"),ar=tAt("arrival|arr");
  if(!dp?.d&&dates[0])dp={d:dates[0].v,t:dp?.t||times[0]?.v||""};
  const cl=text.match(/\b(1A|2A|3A|3E|SL|CC|EC|2S|FC|EA|EV)\b/);const quota=(text.match(/quota\s*[:\-]?\s*([A-Za-z ]{3,20}?)\s*\(([A-Z]{2,3})\)/i)||[])[2]||"";
  const stat=(text.match(/\b(CNF|RAC|WL|RLWL|GNWL|PQWL|TQWL)\s*\/?\s*([A-Z]{1,2}\d{1,2})?\s*\/?\s*(\d{1,3})?(?:\s*\/?\s*(LOWER|MIDDLE|UPPER|SIDE LOWER|SIDE UPPER|WINDOW|AISLE))?/i)||[]);
  return{ref:pnr,trainNo:tm?.[1]||"",trainName:tm?.[2]?tcase(tm[2].split(/\s{2,}|\s+class\b/i)[0].trim()):"",from:fr?.code||"",fromName:fr?.name||"",to:to?.code||"",toName:to?.name||"",
    dep:dp?.d?`${dp.d}T${dp.t||"00:00"}`:"",arr:ar?.d&&ar?.t?`${ar.d}T${ar.t}`:"",cls:cl?.[1]||"",quota,seat:stat[0]?stat.slice(1).filter(Boolean).join("/"):"",tz:"Asia/Kolkata",
    _f:{ref:!!pnr,trainNo:!!tm,from:!!fr,to:!!to,dep:!!(dp?.d&&dp?.t),arr:!!(ar?.t)}}}
function scoreParse(p){const f=o=>Object.values(o?._f||{}).filter(Boolean).length;let s=(p.ref?2:0)+(p.names?.length?1:0)+(p.cost?1:0);
  if(p.kind==="flight")s+=(p.segments||[]).reduce((a,x)=>a+x._score,0);else s+=f(p);return s}
function parseBest(texts,kind,ref){let best=null;for(const t of texts.filter(Boolean)){const p=parseBooking(t,kind,ref);p._score=scoreParse(p);if(!best||p._score>best._score)best=p}return best||parseBooking("",kind,ref)}
function parseBooking(text,kind,ref){
  text=(text||"").replace(/\r/g,"");kind=kind||detectKind(text);
  const names=findNames(text),amt=findAmount(text),pay=payStatus(text);
  const base={kind,names,cost:amt?.v||"",cur:amt?.cur||"",pay,raw:text};
  if(kind==="flight"){const pnr=labelVal(text,["pnr\\s*/\\s*booking\\s*ref(?:erence)?","airline\\s*pnr","pnr","booking\\s*ref(?:erence)?","record\\s*locator","confirmation\\s*code"],"([A-Z0-9]{5,8})\\b",v=>v===v.toUpperCase()&&/[A-Z]/.test(v));
    const bid=labelVal(text,["booking\\s*id","trip\\s*id","itinerary\\s*(?:id|no)","order\\s*id"],"([A-Z0-9\\-]{6,20})");
    return{...base,ref:pnr&&/[A-Z]/.test(pnr)?pnr:(pnr||""),bookingId:bid||"",segments:parseFlights(text,ref)}}
  if(kind==="hotel")return{...base,...parseHotel(text,ref)};
  if(kind==="train")return{...base,...parseTrain(text,ref)};
  const d=findDates(text,ref)[0],t=findTimes(text)[0];
  return{...base,title:text.split("\n").find(l=>l.trim().length>3)?.trim().slice(0,60)||"",start:d?`${d.v}T${t?.v||"10:00"}`:""}}
