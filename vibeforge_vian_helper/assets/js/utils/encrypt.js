// encrypt.js — AES-256-GCM
async function encryptData(data, password) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw",enc.encode(password),{name:"PBKDF2"},false,["deriveKey"]);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:100000,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(JSON.stringify(data)));
  return JSON.stringify({salt:Array.from(salt),iv:Array.from(iv),ct:Array.from(new Uint8Array(ct)),encrypted:true});
}
async function decryptData(encStr, password) {
  const {salt,iv,ct} = JSON.parse(encStr);
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw",enc.encode(password),{name:"PBKDF2"},false,["deriveKey"]);
  const key = await crypto.subtle.deriveKey({name:"PBKDF2",salt:new Uint8Array(salt),iterations:100000,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["decrypt"]);
  const pt = await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(iv)},key,new Uint8Array(ct));
  return JSON.parse(new TextDecoder().decode(pt));
}