/* Photo Fit — on-device pose segmentation + stateless Python assessment.
   No source pixels or uploaded photos are sent to the API. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const fields = ["chest_cm", "waist_cm", "hip_cm", "inseam_cm"];
  let landmarkerPromise = null;
  const selected = {front: null, side: null};
  const previewURLs = {front: null, side: null};
  let lastAssessment = null;
  const modelVersion = "0.10.32";
  const IMAGE_TYPES = new Set(["image/jpeg","image/png","image/webp"]);
  const metadata = {
    front: {
      title: "Front photograph",
      instructions: "Stand straight, feet slightly apart, arms away from your torso. Keep your head and feet visible."
    },
    side: {
      title: "Side photograph",
      instructions: "Turn 90 degrees, arms slightly forward, camera level with your waist. Keep your whole body visible."
    }
  };
  function announce(text, error=false) {
    const el = $("#photo-status");
    el.textContent = text;
    el.classList.toggle("photo-error", error);
  }
  function selectedFile(view, file) {
    lastAssessment = null;
    $("#photo-output").hidden = true;
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      announce("Choose a JPEG, PNG or WebP photograph.", true);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      announce("The photo exceeds 10 MB. Choose a smaller file.", true);
      return;
    }
    if (previewURLs[view]) URL.revokeObjectURL(previewURLs[view]);
    selected[view] = file;
    const src = URL.createObjectURL(file);
    previewURLs[view] = src;
    const img = $("#" + view + "-preview");
    img.src = src;
    img.hidden = false;
    $("#" + view + "-empty").hidden = true;
    $("#" + view + "-file-name").textContent = "Image selected · " + (file.size/1048576).toFixed(1) + " MB";
    announce(metadata[view].title + " loaded locally. Select the other photo, then analyze.");
  }
  for (const view of ["front","side"]) {
    const input = $("#" + view + "-file");
    input.addEventListener("change", () => selectedFile(view,input.files?.[0]));
    $("#" + view + "-clear").addEventListener("click", () => {
      input.value = "";
      selected[view] = null;
      if (previewURLs[view]) URL.revokeObjectURL(previewURLs[view]);
      previewURLs[view] = null;
      $("#" + view + "-preview").hidden = true;
      $("#" + view + "-preview").removeAttribute("src");
      $("#" + view + "-empty").hidden = false;
      $("#" + view + "-file-name").textContent = "";
      lastAssessment = null;
      $("#photo-output").hidden = true;
      announce(metadata[view].title + " removed. No photo has been saved.");
    });
  }
  async function createLandmarker() {
    if (!landmarkerPromise) {
      landmarkerPromise = (async () => {
        const {PoseLandmarker, FilesetResolver} = await import(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + modelVersion + "/+esm"
        );
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + modelVersion + "/wasm"
        );
        return PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
            delegate: "CPU"
          },
          runningMode: "IMAGE",
          numPoses: 1,
          minPoseDetectionConfidence: .6,
          minPosePresenceConfidence: .6,
          outputSegmentationMasks: true
        });
      })().catch(error => {
        landmarkerPromise = null;
        throw error;
      });
    }
    return landmarkerPromise;
  }
  async function loadPhoto(file) {
    const objectURL = URL.createObjectURL(file);
    try {
      const photo = new Image();
      photo.decoding = "async";
      photo.src = objectURL;
      await photo.decode();
      if (photo.naturalWidth < 500 || photo.naturalHeight < 650) {
        throw new Error("Photo resolution is too low. Use at least 500 × 650 pixels.");
      }
      const factor = Math.min(1, 1200 / Math.max(photo.naturalWidth,photo.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(photo.naturalWidth*factor);
      canvas.height = Math.round(photo.naturalHeight*factor);
      const context = canvas.getContext("2d",{willReadFrequently:true});
      context.drawImage(photo,0,0,canvas.width,canvas.height);
      return canvas;
    } finally { URL.revokeObjectURL(objectURL); }
  }
  function spanAt(y, centerX, mask, width, height) {
    const ys = [-2,-1,0,1,2];
    const sample = [];
    for (const offset of ys) {
      const iy = Math.max(0,Math.min(height-1,Math.round(y+offset)));
      let cx = Math.max(0,Math.min(width-1,Math.round(centerX)));
      if (mask[iy*width+cx] < .56) {
        let found=false;
        for(let delta=1;delta<Math.floor(width*.10);delta++) {
          if(cx+delta<width && mask[iy*width+cx+delta]>=.56) {cx+=delta;found=true;break;}
          if(cx-delta>=0 && mask[iy*width+cx-delta]>=.56) {cx-=delta;found=true;break;}
        }
        if(!found) continue;
      }
      let left=cx,right=cx;
      while(left>0 && mask[iy*width+left-1]>=.56) left--;
      while(right<width-1 && mask[iy*width+right+1]>=.56) right++;
      const widthPx=right-left+1;
      if(widthPx>width*.04 && widthPx<width*.88) sample.push(widthPx);
    }
    if(sample.length<3) throw new Error("Could not isolate the torso. Keep arms slightly away from the body and retake this photo.");
    sample.sort((a,b)=>a-b);
    return sample[Math.floor(sample.length/2)];
  }
  function silhouetteFromDetection(result, canvas, view) {
    if (!result.landmarks || result.landmarks.length!==1 || !result.segmentationMasks?.length) {
      throw new Error("A clear full-body pose was not detected. Retake the " + view + " photo.");
    }
    const p=result.landmarks[0];
    const required=[0,11,12,23,24,27,28];
    const vis=required.map(i=>p[i]?.visibility ?? 0);
    const quality=vis.reduce((sum,v)=>sum+v,0)/vis.length;
    if(vis.some(v=>v<.55) || quality<.65) throw new Error("Head, shoulders, hips and feet must all be clearly visible in the " + view + " photo.");
    const maskObj=result.segmentationMasks[0];
    const mask=maskObj.getAsFloat32Array();
    const width=maskObj.width, height=maskObj.height;
    let top=height,bottom=0,left=width,right=0;
    for(let y=0;y<height;y++) {
      for(let x=0;x<width;x++) {
        if(mask[y*width+x]>.56) {
          if(y<top) top=y;
          if(y>bottom) bottom=y;
          if(x<left) left=x;
          if(x>right) right=x;
        }
      }
    }
    if(top<height*.015 || bottom>height*.985 || left<width*.015 || right>width*.985) {
      throw new Error("The " + view + " photo clips the body. Leave space around your head, feet and sides.");
    }
    const pixelHeight=bottom-top;
    if(pixelHeight<height*.48 || pixelHeight<150) {
      throw new Error("Move the camera closer while keeping the full body in the " + view + " frame.");
    }
    const shoulderY=(p[11].y+p[12].y)*.5*height;
    const hipY=(p[23].y+p[24].y)*.5*height;
    const midX=(p[23].x+p[24].x+p[11].x+p[12].x)*.25*width;
    if(hipY-shoulderY<height*.12) throw new Error("Unable to identify torso proportions. Retake the " + view + " photo.");
    const widths={
      chest:spanAt(shoulderY+(hipY-shoulderY)*.25,midX,mask,width,height),
      waist:spanAt(shoulderY+(hipY-shoulderY)*.67,midX,mask,width,height),
      hip:spanAt(hipY,midX,mask,width,height)
    };
    return {view,body_height_px:pixelHeight,widths_px:widths,pose_quality:Number(quality.toFixed(3))};
  }
  function renderEstimate(result) {
    $("#photo-output").hidden = false;
    const list=$("#photo-estimates");
    list.replaceChildren();
    for(const [metric,value] of Object.entries(result.measurements)) {
      const card=document.createElement("div");
      card.className="estimate-row";
      const title=document.createElement("strong");
      title.textContent=metric.replace("_cm","").replace(/^./,letter=>letter.toUpperCase());
      const number=document.createElement("span");
      number.textContent=value.estimate.toFixed(1)+" cm";
      const range=document.createElement("small");
      range.textContent="Approximate range "+value.rough_range[0]+"–"+value.rough_range[1]+" cm";
      card.append(title,number,range);
      list.append(card);
    }
    $("#photo-explanation").textContent=result.advisory;
    $("#photo-output").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest"});
  }
  $("#analyze-photos").addEventListener("click", async event => {
    const button=event.currentTarget;
    lastAssessment=null;
    $("#photo-output").hidden=true;
    const heightCm=Number($("#photo-height").value);
    if(!Number.isFinite(heightCm)||heightCm<120||heightCm>220){
      announce("Enter your measured height between 120 and 220 cm.",true);return;
    }
    if(!selected.front||!selected.side){
      announce("Select both front and side full-body photos before analyzing.",true);return;
    }
    if(!$("#photo-consent").checked){
      announce("Please read and accept local photo processing and the external model download notice.",true);return;
    }
    button.disabled=true;
    try{
      announce("Loading the real on-device pose model. First-time use downloads the model and WebAssembly runtime.");
      const pose=await createLandmarker();
      const frontImg=await loadPhoto(selected.front);
      const sideImg=await loadPhoto(selected.side);
      announce("Detecting body silhouettes locally. Photographs do not leave this browser.");
      const front=silhouetteFromDetection(pose.detect(frontImg),frontImg,"front");
      const side=silhouetteFromDetection(pose.detect(sideImg),sideImg,"side");
      announce("Estimating rough circumference ranges with the Python API. Only derived geometry is sent.");
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
      let response;
      try{
        response=await fetch("/api/photo/assess",{
          method:"POST",
          signal:controller.signal,
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({height_cm:heightCm,front,side})
        });
      } finally {clearTimeout(timeout);}
      const payload=await response.json();
      if(!response.ok){
        const detail=typeof payload.detail==="string"?payload.detail:"The two views could not be reliably compared.";
        throw new Error(detail);
      }
      lastAssessment=payload;
      renderEstimate(payload);
      announce("Rough photo estimates calculated. Review them; they are not verified measurements.");
    }catch(error){
      announce(error.name==="AbortError"?"The analysis timed out. Please retry.":("Analysis could not complete: "+(error.message||"unknown error")),true);
    }finally{button.disabled=false;}
  });
  $("#photo-apply").addEventListener("click",()=>{
    if(!lastAssessment)return;
    // Original profile values are never overwritten without this explicit action.
    const cmButton=document.querySelector('.unit-switch [data-unit="cm"]');
    if(cmButton && !cmButton.classList.contains("active"))cmButton.click();
    const form=$("#fit-form");
    for(const [metric,value] of Object.entries(lastAssessment.measurements)){
      if(form.elements[metric])form.elements[metric].value=value.estimate.toFixed(1);
    }
    if(form.elements.height_cm)form.elements.height_cm.value=$("#photo-height").value;
    form.dispatchEvent(new Event("input",{bubbles:true}));
    window.dispatchEvent(new CustomEvent("ufs:photo-reviewed", {detail:{
      measurements:Object.fromEntries(Object.entries(lastAssessment.measurements).map(([k,v])=>[k,v.estimate])),
      height_cm:Number($("#photo-height").value),
      source:"photo_estimate_reviewed",
      assessed_at:new Date().toISOString()
    }}));
    announce("Rough estimates placed into the fitting form for review. Confirm using a tape before relying on them.");
    $("#fit-studio").scrollIntoView({behavior:"smooth"});
  });
  function parsePrompt(){
    const text=$("#measurement-prompt").value.trim().toLowerCase();
    if(!text){announce("Enter a sentence with labelled measurements and explicit units.",true);return;}
    // Intentionally do not infer numbers without measurement names and units.
    const mapped=[["height","height_cm"],["chest","chest_cm"],["bust","chest_cm"],["waist","waist_cm"],["hips","hip_cm"],["hip","hip_cm"],["inseam","inseam_cm"]];
    const extracted={};
    for(const [label,key] of mapped){
      const re=new RegExp("\\b"+label+"\\s*(?:is|:|=|about|around)?\\s*(\\d{2,3}(?:\\.\\d+)?)\\s*(cm|centimeters?|in|inches?)\\b","i");
      const match=text.match(re);
      if(match){
        const number=Number(match[1]);
        const cm=/^(in|inch)/.test(match[2])?number*2.54:number;
        if(Number.isFinite(cm)&&cm>0)extracted[key]=Math.round(cm*10)/10;
      }
    }
    if(!Object.keys(extracted).length){
      announce("No labelled values found. Try: Height 175cm, chest 96cm, waist 81cm, hips 100cm.",true);return;
    }
    const cmButton=document.querySelector('.unit-switch [data-unit="cm"]');
    if(cmButton && !cmButton.classList.contains("active"))cmButton.click();
    const form=$("#fit-form");
    for(const [key,value] of Object.entries(extracted)){
      if(key==="height_cm")$("#photo-height").value=String(value);
      else if(form.elements[key])form.elements[key].value=String(value);
    }
    form.dispatchEvent(new Event("input",{bubbles:true}));
    window.dispatchEvent(new CustomEvent("ufs:prompt-measurements", {detail:{measurements:extracted,source:"user_stated"}}));
    announce("Applied "+Object.keys(extracted).length+" explicitly labelled values. Please review before sizing.");
  }
  $("#apply-prompt").addEventListener("click",parsePrompt);
  window.addEventListener("pagehide",()=>{
    for(const view of ["front","side"]){if(previewURLs[view])URL.revokeObjectURL(previewURLs[view]);}
  });
})();
