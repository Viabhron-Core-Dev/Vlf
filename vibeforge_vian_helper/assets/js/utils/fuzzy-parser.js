// fuzzy-parser.js
const MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,january:1,february:2,march:3,april:4,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
function parseOCRText(text) {
  const lines = text.split(/\n/).map(l=>l.trim()).filter(l=>l.length>2);
  const events = []; const yearNow = new Date().getFullYear();
  lines.forEach(line=>{
    let date=null, title=null;
    let m = line.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (m) {
      const y=m[3].length===2?2000+parseInt(m[3]):parseInt(m[3]);
      date=y+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[1]).padStart(2,"0");
      title=line.replace(m[0],"").replace(/^[-:\s]+/,"").trim();
    }
    if (!date) {
      m = line.match(/(\d{1,2})\s+([a-zA-Z]{3,})(\s+\d{4})?/) || line.match(/([a-zA-Z]{3,})\s+(\d{1,2})(\s+\d{4})?/);
      if (m) {
        const mo = MONTHS[(m[2]||m[1]).toLowerCase()];
        if (mo) {
          const day=parseInt(m[1].match(/\d/)?m[1]:m[2]);
          const year=parseInt((m[3]||"").trim())||yearNow;
          date=year+"-"+String(mo).padStart(2,"0")+"-"+String(day).padStart(2,"0");
          title=line.replace(/\d{1,2}\s+[a-zA-Z]+|[a-zA-Z]+\s+\d{1,2}/,"").replace(/^[-:\s]+|\s+\d{4}/g,"").trim();
        }
      }
    }
    if (date&&title&&title.length>1) events.push({date,title,type:"imported",imported:true,createdAt:Date.now()});
  });
  return events;
}