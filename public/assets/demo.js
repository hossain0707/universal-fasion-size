/* Universal Fashion Size — truthful interactive example walkthrough.
   Stock/editorial photography is representative, NOT an input to inference.
   All sample body dimensions are explicitly fictional and editable.
   Final stage calls the real Python /api/recommend endpoint. */
(() => {
  "use strict";

  const cases = Object.freeze({
    everyday: {
      label:"Everyday essentials", caseId:"01",
      category:"tops", productId:"foundation-tee", productName:"Foundation Tee",
      fit:"regular", outfit:"Everyday cotton tee",
      photo:"https://images.unsplash.com/photo-1771072426459-1ab467cd80f0?auto=format&fit=crop&w=900&h=1200&q=85",
      alt:"Editorial fashion photograph of an adult wearing a tailored outfit; visual reference only, not the source of any sample measurements",
      measurements:{height_cm:175,chest_cm:96,waist_cm:81,hip_cm:100,inseam_cm:78}
    },
    denim: {
      label:"Everyday denim", caseId:"02",
      category:"bottoms", productId:"essential-denim", productName:"Essential Denim",
      fit:"regular", outfit:"Straight-leg denim",
      photo:"https://images.unsplash.com/photo-1704642406929-ea6d2099f063?auto=format&fit=crop&w=900&h=1200&q=85",
      alt:"Editorial portrait of an adult in dark tailored clothing; illustrative photo, not an actual scanning subject",
      measurements:{height_cm:183,chest_cm:106,waist_cm:90,hip_cm:110,inseam_cm:81}
    },
    dress: {
      label:"Day dress", caseId:"03",
      category:"dresses", productId:"everyday-dress", productName:"Everyday Dress",
      fit:"regular", outfit:"Easy day dress",
      photo:"https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&h=1200&q=85",
      alt:"Photographic fashion portrait used to illustrate a dress-fitting journey, not measured from the photograph",
      measurements:{height_cm:168,chest_cm:87,waist_cm:71,hip_cm:94,inseam_cm:74}
    }
  });

  const labels = {
    height_cm:"Height", chest_cm:"Chest / bust", waist_cm:"Waist",
    hip_cm:"Hips", inseam_cm:"Inseam"
  };
  const limits = {
    height_cm:[120,220],chest_cm:[45,200],waist_cm:[40,200],
    hip_cm:[45,220],inseam_cm:[35,110]
  };
  const editable = ["height_cm","chest_cm","waist_cm","hip_cm","inseam_cm"];
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const state = {
    key:"everyday",stage:0,measurements:{...cases.everyday.measurements},
    auto:null,requestNumber:0,latestResult:null
  };

  function error(message) {
    const alert=$("#walkthrough-error");
    alert.textContent=message || "";
    alert.hidden=!message;
  }
  function text(selector,value){$(selector).textContent=String(value);}
  function stopAuto() {
    if(state.auto!==null){clearInterval(state.auto);state.auto=null;}
    $("#walkthrough-play").textContent="Play walkthrough";
    $("#walkthrough-play").setAttribute("aria-pressed","false");
  }
  function displayInputs() {
    for(const metric of editable) {
      const input=$('[data-demo-input="'+metric+'"]');
      if(input)input.value=String(state.measurements[metric]);
    }
    const entries=$("#walkthrough-measure-list");
    entries.replaceChildren();
    for(const metric of editable) {
      const item=document.createElement("div");
      item.className="walkthrough-metric";
      const name=document.createElement("span");name.textContent=labels[metric];
      const value=document.createElement("strong");
      value.textContent=state.measurements[metric].toFixed(1)+" cm";
      item.append(name,value);entries.append(item);
    }
    text("#walkthrough-profile-name","Example "+cases[state.key].caseId+" · "+cases[state.key].label);
    text("#walkthrough-product-name",cases[state.key].productName);
  }

  function setCase(key) {
    if(!Object.hasOwn(cases,key))return;
    stopAuto();
    state.key=key;
    state.requestNumber+=1;
    state.latestResult=null;
    state.measurements={...cases[key].measurements};
    $$("#walkthrough-cases button").forEach(button=>{
      const isCurrent=button.dataset.case===key;
      button.classList.toggle("is-active",isCurrent);
      button.setAttribute("aria-pressed",String(isCurrent));
    });
    const image=$("#walkthrough-photo");
    image.src=cases[key].photo;image.alt=cases[key].alt;
    text("#walkthrough-current-outfit",cases[key].outfit);
    text("#walkthrough-portrait-counter","CASE "+cases[key].caseId+" / 03");
    displayInputs();
    error("");
    renderStep(0);
  }

  function readInputs(){
    for(const metric of editable){
      const input=$('[data-demo-input="'+metric+'"]');
      if(!input || !input.value.trim())throw Error("Enter "+labels[metric].toLowerCase()+" for the sample.");
      const value=Number(input.value);
      const [lower,upper]=limits[metric];
      if(!Number.isFinite(value)||value<lower||value>upper) {
        throw Error(labels[metric]+" must be between "+lower+" and "+upper+" cm.");
      }
      state.measurements[metric]=Math.round(value*10)/10;
    }
    displayInputs();
  }

  function renderStep(index){
    const stage=Math.max(0,Math.min(3,index));
    state.stage=stage;
    $$("#walkthrough-steps [data-demo-step]").forEach((button,i)=>{
      const selected=i===stage;
      button.classList.toggle("is-selected",selected);
      button.setAttribute("aria-selected",String(selected));
      button.tabIndex=selected?0:-1;
    });
    $$("#walkthrough-panels [data-demo-panel]").forEach(el=>{
      el.hidden=Number(el.dataset.demoPanel)!==stage;
    });
    $("#walkthrough-progress-bar").style.width=((stage+1)*25)+"%";
    $("#walkthrough-back").disabled=stage===0;
    $("#walkthrough-next").textContent=stage===3?"Start again":stage===2?"Calculate with Python API":"Next step";
    text("#walkthrough-stage-count",("0"+(stage+1)).slice(-2)+" / 04");
    if(stage===3)void calculateRealResult();
    else state.requestNumber+=1;
  }

  function makeAlternative(alt){
    const li=document.createElement("li");
    const name=document.createElement("strong");name.textContent=alt.size;
    const score=document.createElement("span");score.textContent=alt.fit_score.toFixed(1)+" / 100";
    li.append(name,score);
    return li;
  }
  async function calculateRealResult(){
    const requestId=++state.requestNumber;
    const output=$("#walkthrough-live-result"),loading=$("#walkthrough-live-loading");
    output.hidden=true;loading.hidden=false;
    loading.textContent="Contacting the live Python API and comparing this sample against its fictional garment chart…";
    error("");
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),14000);
    try {
      const sample=cases[state.key];
      const {height_cm,...body}=state.measurements;
      const response=await fetch("/api/recommend", {
        method:"POST",signal:controller.signal,
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({
          category:sample.category,product_id:sample.productId,fit:sample.fit,
          measurements:{...body,height_cm}
        })
      });
      let result;
      try{result=await response.json();}catch{throw Error("The API returned an unreadable response.");}
      if(!response.ok) {
        const detail=typeof result.detail==="string"?result.detail:"The sizing API rejected the example.";
        throw Error(detail);
      }
      if(requestId!==state.requestNumber)return;
      state.latestResult=result;
      text("#walkthrough-recommended-size",result.recommended_size);
      text("#walkthrough-fit-score",result.fit_score.toFixed(1)+" / 100");
      text("#walkthrough-input-coverage",result.coverage_percent+"% supplied input coverage");
      $("#walkthrough-score-fill").style.width=Math.max(0,Math.min(100,result.fit_score))+"%";
      const reasons=$("#walkthrough-result-explanations");
      reasons.replaceChildren();
      for(const sentence of result.explanation){
        const item=document.createElement("li");item.textContent=sentence;reasons.append(item);
      }
      const alts=$("#walkthrough-result-alternatives");alts.replaceChildren();
      for(const alt of result.alternatives.slice(0,3))alts.append(makeAlternative(alt));
      loading.hidden=true;output.hidden=false;
    } catch (err){
      if(requestId!==state.requestNumber)return;
      loading.textContent=err.name==="AbortError"
        ?"The live API timed out. Please retry."
        :("The live API did not complete: "+(err.message||"Unknown error."));
      error("The example cannot show a size until the real Python service responds.");
    } finally {clearTimeout(timeout);}
  }

  function moveTo(stage){
    if(state.stage===1 && stage!==1){
      try{readInputs();}catch(e){error(e.message);return;}
    }
    error("");
    renderStep(stage);
  }

  function startAuto(){
    if(state.auto!==null){stopAuto();return;}
    if(state.stage===3)renderStep(0);
    $("#walkthrough-play").textContent="Pause walkthrough";
    $("#walkthrough-play").setAttribute("aria-pressed","true");
    state.auto=setInterval(()=>{
      if(state.stage>=3){stopAuto();return;}
      const previous=state.stage;
      moveTo(previous+1);
      if(state.stage===previous){stopAuto();return;}
      if(state.stage===3)stopAuto();
    },3600);
  }
  function copyToStudio(){
    stopAuto();
    try{readInputs();}catch(e){error(e.message);return;}
    const form=$("#fit-form");
    if(!form){error("The fitting studio was not found.");return;}
    const cmButton=$('.unit-switch button[data-unit="cm"]');
    if(cmButton)cmButton.click();
    const chosen=cases[state.key];
    const categoryButton=$('#category-tabs button[data-category="'+chosen.category+'"]');
    if(categoryButton)categoryButton.click();
    const regular=$('#fit-tabs button[data-fit="'+chosen.fit+'"]');
    if(regular)regular.click();
    for(const metric of editable){
      if(form.elements[metric])form.elements[metric].value=state.measurements[metric].toFixed(1);
    }
    const select=$("#product-select");
    const selectModel=()=>{
      if(Array.from(select.options).some(option=>option.value===chosen.productId)){
        select.value=chosen.productId;
        select.dispatchEvent(new Event("change",{bubbles:true}));
      }
    };
    selectModel();
    if(select.value!==chosen.productId){
      window.addEventListener("ufs:catalog-loaded",selectModel,{once:true});
    }
    form.dispatchEvent(new Event("input",{bubbles:true}));
    error("");
    $("#fit-studio").scrollIntoView({
      behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",
      block:"start"
    });
  }

  $$("#walkthrough-cases [data-case]").forEach(button=>{
    button.addEventListener("click",()=>setCase(button.dataset.case));
  });
  $$("#walkthrough-steps [data-demo-step]").forEach(button=>{
    button.addEventListener("click",()=>{
      stopAuto();moveTo(Number(button.dataset.demoStep));
    });
  });
  $$("#walkthrough-panels [data-demo-input]").forEach(input=>{
    input.addEventListener("input",()=>{error("");});
  });
  $("#walkthrough-back").addEventListener("click",()=>{stopAuto();moveTo(state.stage-1);});
  $("#walkthrough-next").addEventListener("click",()=>{
    stopAuto();
    if(state.stage===3){setCase(state.key);return;}
    moveTo(state.stage+1);
  });
  $("#walkthrough-play").addEventListener("click",startAuto);
  $("#walkthrough-to-studio").addEventListener("click",copyToStudio);
  $("#walkthrough-retry").addEventListener("click",()=>{void calculateRealResult();});
  setCase("everyday");
})();
