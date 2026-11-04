/* Encrypted local profile vault. Not a cross-device account or cloud backup.
   Images are never written to storage. PBKDF2 and AES-GCM via WebCrypto. */
(() => {
  "use strict";
  const $=selector=>document.querySelector(selector);
  const STORE="ufs.encrypted.profile.v1";
  const encoder=new TextEncoder(),decoder=new TextDecoder();
  const fields=["chest_cm","waist_cm","hip_cm","inseam_cm"];
  const serialize=bytes=>btoa(String.fromCharCode(...bytes));
  const deserialize=base64=>Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  let unlockedKey=null;
  let lastSource="user_reviewed";
  let vaultData=null;
  function status(message,error=false){
    const el=$("#vault-status");el.textContent=message;el.classList.toggle("photo-error",error);
  }
  function stored(){
    try{return JSON.parse(localStorage.getItem(STORE)||"null");}catch{return null;}
  }
  function updateUI(){
    const exists=Boolean(stored());
    $("#vault-open").hidden=!exists||Boolean(unlockedKey);
    $("#vault-create").hidden=exists;
    $("#vault-save").hidden=!unlockedKey;
    $("#vault-export").hidden=!exists;
    $("#vault-lock").hidden=!unlockedKey;
    $("#vault-delete").hidden=!exists;
    $("#vault-summary").textContent=exists?(unlockedKey?"Encrypted profile unlocked on this device.":"Encrypted profile found on this device. Unlock it with your passphrase."):"No saved profile on this device. Create an encrypted profile after reviewing your measurements.";
  }
  async function derive(passphrase,salt){
    const material=await crypto.subtle.importKey("raw",encoder.encode(passphrase),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  }
  function validateData(data){
    if(!data||data.version!==1||typeof data.name!=="string"||data.name.length<1||data.name.length>60||!data.measurements||typeof data.measurements!=="object")throw Error("Invalid profile format.");
    for(const [key,val] of Object.entries(data.measurements)){
      if(!fields.includes(key) || !Number.isFinite(val) || val<30 || val>240)throw Error("Invalid measurement in stored profile.");
    }
    return data;
  }
  function currentValues(){
    const form=$("#fit-form"),measurements={};
    const inCm=document.querySelector('.unit-switch [data-unit="cm"]').classList.contains("active");
    for(const name of fields){
      const raw=form.elements[name].value.trim();
      if(!raw)continue;
      const value=Number(raw)*(inCm?1:2.54);
      if(!Number.isFinite(value)||value<30||value>240)throw Error("Please correct out-of-range measurements before saving.");
      measurements[name]=Math.round(value*10)/10;
    }
    if(!Object.keys(measurements).length)throw Error("Add at least one measurement before saving.");
    const name=$("#profile-name").value.trim();
    if(!name||name.length>60)throw Error("Enter a profile label of 1–60 characters.");
    const height=Number($("#photo-height").value);
    return validateData({
      version:1, name, measurements,
      height_cm:height>=120&&height<=220?height:null,
      source:lastSource,
      updated_at:new Date().toISOString()
    });
  }
  function restore(data){
    $("#profile-name").value=data.name;
    if(data.height_cm)$("#photo-height").value=String(data.height_cm);
    const button=document.querySelector('.unit-switch [data-unit="cm"]');
    if(!button.classList.contains("active"))button.click();
    const form=$("#fit-form");
    for(const metric of fields)form.elements[metric].value=data.measurements[metric]??"";
    form.dispatchEvent(new Event("input",{bubbles:true}));
    lastSource=data.source||"user_reviewed";
  }
  async function encrypt(key,data,salt){
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(JSON.stringify(data))));
    return {format:"ufs-local-profile",version:1,kdf:"PBKDF2-SHA256",iterations:310000,salt:serialize(salt),iv:serialize(iv),ciphertext:serialize(ciphertext)};
  }
  function validateContainer(item){
    if(!item||item.format!=="ufs-local-profile"||item.version!==1||item.iterations!==310000||typeof item.salt!=="string"||typeof item.iv!=="string"||typeof item.ciphertext!=="string"||item.ciphertext.length>12000)throw Error("Not a compatible encrypted profile file.");
    if(deserialize(item.salt).length!==16||deserialize(item.iv).length!==12)throw Error("Invalid encryption metadata.");
    return item;
  }
  async function unlock(passphrase,record){
    const item=validateContainer(record);
    const salt=deserialize(item.salt);
    const key=await derive(passphrase,salt);
    const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:deserialize(item.iv)},key,deserialize(item.ciphertext));
    return {key,data:validateData(JSON.parse(decoder.decode(clear)))};
  }
  $("#vault-create").addEventListener("click",async()=>{
    try{
      if(stored())throw Error("A profile already exists. Unlock it instead.");
      if(!$("#profile-consent").checked)throw Error("Consent to encrypted local storage is required.");
      const pass=$("#profile-passphrase").value;
      if(pass.length<12)throw Error("Use a passphrase of at least 12 characters.");
      const data=currentValues();
      const salt=crypto.getRandomValues(new Uint8Array(16));
      const key=await derive(pass,salt);
      localStorage.setItem(STORE,JSON.stringify(await encrypt(key,data,salt)));
      unlockedKey=key;vaultData=data;$("#profile-passphrase").value="";
      status("Profile encrypted and saved on this device. It will be available next visit after unlocking.");updateUI();
    }catch(err){status(err.message,true);}
  });
  $("#vault-open").addEventListener("click",async()=>{
    try{
      const pass=$("#profile-passphrase").value;
      if(!pass)throw Error("Enter your passphrase.");
      const found=await unlock(pass,stored());
      unlockedKey=found.key;vaultData=found.data;restore(found.data);
      $("#profile-passphrase").value="";
      status("Profile unlocked. Measurements have been restored into the fitting studio.");updateUI();
    }catch{status("Unlock failed. Verify your passphrase or encrypted profile file.",true);}
  });
  $("#vault-save").addEventListener("click",async()=>{
    try{
      if(!unlockedKey)throw Error("Unlock your profile first.");
      const original=validateContainer(stored());
      const next=currentValues();
      localStorage.setItem(STORE,JSON.stringify(await encrypt(unlockedKey,next,deserialize(original.salt))));
      vaultData=next;
      status("Your profile changes have been encrypted and saved.");updateUI();
    }catch(err){status(err.message,true);}
  });
  $("#vault-lock").addEventListener("click",()=>{
    unlockedKey=null;vaultData=null;
    status("Encrypted profile locked. Enter your passphrase to unlock it again.");
    updateUI();
  });
  $("#vault-export").addEventListener("click",()=>{
    const value=localStorage.getItem(STORE);
    if(!value)return;
    const blob=new Blob([value],{type:"application/json"});
    const link=document.createElement("a");
    const url=URL.createObjectURL(blob);
    link.href=url;link.download="universal-fit-encrypted-profile.json";link.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    status("Encrypted backup downloaded. You can import it into another device with your passphrase.");
  });
  $("#vault-import").addEventListener("change",async event=>{
    try{
      const file=event.target.files?.[0];
      if(!file)return;
      if(file.size>15000)throw Error("The encrypted backup is unexpectedly large.");
      if(stored()&&!confirm("Replace the saved encrypted profile on this device?"))return;
      const record=validateContainer(JSON.parse(await file.text()));
      localStorage.setItem(STORE,JSON.stringify(record));
      unlockedKey=null;vaultData=null;
      status("Encrypted backup imported. Unlock with its original passphrase.");updateUI();
    }catch(err){status(err.message,true);}
    finally{event.target.value="";}
  });
  $("#vault-delete").addEventListener("click",()=>{
    if(!confirm("Delete the encrypted profile saved on this device? This cannot be undone without a backup."))return;
    localStorage.removeItem(STORE);unlockedKey=null;vaultData=null;
    status("Encrypted profile deleted from this device.");updateUI();
  });
  window.addEventListener("ufs:photo-reviewed",()=>{lastSource="photo_estimate_reviewed";});
  window.addEventListener("ufs:prompt-measurements",()=>{lastSource="user_stated";});
  $("#try-example").addEventListener("click",()=>{lastSource="example_not_verified";});
  $("#fit-form").addEventListener("input",e=>{
    if(e.isTrusted && e.target.matches("input[name]"))lastSource="user_reviewed";
  });
  if(!globalThis.crypto?.subtle){
    $("#vault-controls").hidden=true;
    status("Encrypted profiles require HTTPS and a browser supporting WebCrypto.",true);
  }else updateUI();
})();
