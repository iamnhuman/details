import * as T from './vendor/three.module.min.js';
import {chapters,totalDuration,narrationAudio} from './hero-story.mjs';
import {parts} from './parts.mjs';
import {sampleStory,chapterAt,clamp} from './hero-timeline.mjs';
import {createHeroSound} from './hero-sound.mjs';

export async function initNarratedHero(sourceModel){
 const $=s=>document.querySelector(s),stage=$('#hero-stage'),canvas=$('#hero-canvas');
 if(!stage||!canvas)return null;
 const audio=$('#hero-audio'),play=$('#hero-play'),mute=$('#hero-sound'),previewPause=$('#hero-preview-pause');
 const progress=$('#hero-progress'),readout=$('#hero-time'),restart=$('#hero-restart'),loader=$('#hero-loader'),fallback=$('#hero-fallback'),watch=$('#hero-watch');
 const buttons=[...document.querySelectorAll('[data-story-chapter]')],reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const state={ready:false,running:!reduced.matches,started:false,muted:true,visible:true,fallback:false,buffering:false,time:reduced.matches?0:chapters[1].start,index:-1,renderCount:0,audioError:false};
 const sound=createHeroSound(audio);
 let renderer,scene,camera,car,frame,disposed=false,last=performance.now(),dirty=true,lastUI=-1,userSeek=false;
 let resizeObserver,visibilityObserver;
 const assemblies={},restBoxes={},restCenters={},materials=new Map(),fadeMaterials=new Map(),meshGroups=new Map();
 const timeText=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
 const sync=()=>{
  play.textContent=!state.started?'▶ Смотреть с голосом':state.running?'Ⅱ Пауза':state.time>=totalDuration-.05?'↻ Смотреть ещё раз':'▶ Продолжить';
  play.setAttribute('aria-label',!state.started?'Смотреть историю Supra с голосом':state.running?'Пауза истории Supra':'Продолжить историю Supra');
  play.setAttribute('aria-pressed',String(state.started&&state.running));
  mute.textContent=state.muted?'Звук выкл.':'Звук вкл.';mute.setAttribute('aria-pressed',String(!state.muted));mute.setAttribute('aria-label',state.muted?'Включить голос и звуки деталей':'Выключить голос и звуки деталей');
  sound.setEnabled(state.started&&!state.muted&&state.running);
  previewPause.hidden=state.started;previewPause.textContent=state.running?'Ⅱ':'▶';previewPause.setAttribute('aria-label',state.running?'Приостановить анимацию':'Продолжить анимацию');
  stage.dataset.playing=String(state.running);stage.dataset.narrated=String(state.started&&!state.muted);
 };
 function pause(paused=true){
  if(paused&&state.started)state.time=Math.min(totalDuration,audio.currentTime);
  state.running=!paused;last=performance.now();dirty=true;
  if(paused)audio.pause();else if(state.started){sound.arm();audio.play().catch(audioFailure);}
  sync();
 }
 function audioFailure(error){state.running=false;state.audioError=true;$('#hero-audio-error').hidden=false;sync();console.warn('Supra narration could not start:',error);}
 async function playStory(){
  const wasStarted=state.started;
  if(wasStarted&&state.running){pause(true);return;}
  if(!wasStarted){state.started=true;state.muted=false;if(!userSeek)seek(0);}
  if(state.time>=totalDuration-.05)seek(0);
  audio.muted=state.muted;audio.currentTime=state.time;state.running=true;state.audioError=false;$('#hero-audio-error').hidden=true;dirty=true;sync();
  sound.arm();
  stage.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
  try{await audio.play();}catch(error){audioFailure(error);}
 }
 function seek(time){sound.reset();state.time=clamp(Number(time)||0,0,totalDuration);if(state.started)audio.currentTime=Math.min(state.time,Number.isFinite(audio.duration)?audio.duration:totalDuration);userSeek=true;dirty=true;last=performance.now();updateUI(true);}
 function setChapter(value){const index=typeof value==='number'?value:chapters.findIndex(c=>c.id===value);if(chapters[index]){seek(chapters[index].start+.01);sound.click();stage.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});}}
 function setMuted(value){
  state.muted=!!value;audio.muted=state.muted;
  if(!state.muted)sound.arm();
  if(!state.muted&&!state.started){state.started=true;audio.currentTime=state.time;if(state.running)audio.play().catch(audioFailure);}
  dirty=true;sync();
 }
 audio.src=narrationAudio;audio.muted=false;audio.volume=.92;progress.max=String(totalDuration);
 play.addEventListener('click',playStory);watch.addEventListener('click',playStory);mute.addEventListener('click',()=>setMuted(!state.muted));
 previewPause.addEventListener('click',()=>pause(state.running));restart.addEventListener('click',()=>seek(0));
 progress.addEventListener('input',event=>seek(event.target.value));
 buttons.forEach(button=>button.addEventListener('click',()=>setChapter(button.dataset.storyChapter)));
 audio.addEventListener('waiting',()=>{state.buffering=true;stage.dataset.buffering='true';});
 audio.addEventListener('playing',()=>{state.buffering=false;stage.dataset.buffering='false';});
 audio.addEventListener('ended',()=>{state.time=totalDuration;state.running=false;dirty=true;sync();updateUI(true);});
 audio.addEventListener('error',()=>audioFailure(audio.error));
 $('#hero-silent').addEventListener('click',()=>{audio.pause();state.started=false;state.muted=true;state.audioError=false;state.running=true;$('#hero-audio-error').hidden=true;dirty=true;sync();});
 const handle={state,pause,play:playStory,seek,setChapter,setMuted,get renderer(){return renderer;},get scene(){return scene;},get camera(){return camera;},get car(){return car;},assemblies,restBoxes,audio,sound,chapters,totalDuration,dispose(){disposed=true;audio.pause();sound.dispose();cancelAnimationFrame(frame);resizeObserver?.disconnect();visibilityObserver?.disconnect();renderer?.dispose();for(const material of [...materials.values(),...fadeMaterials.values()])material.dispose();}};
 window.__supraHero=handle;
 const labelNodes=[...document.querySelectorAll('.hero-part-label')];
 function updateUI(force=false){
  const index=chapterAt(state.time),chapter=chapters[index];
  if(index!==state.index){
   state.index=index;stage.dataset.chapter=chapter.id;
   $('#hero-chapter-number').textContent=`${String(index+1).padStart(2,'0')} / 07`;
   $('#hero-chapter-kicker').textContent=chapter.kicker;$('#hero-chapter-title').textContent=chapter.title;
   $('#hero-subtitle').textContent=chapter.subtitle;$('#hero-narration-text').textContent=chapter.narration;
   buttons.forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===index));if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
   $('#hero-phase-announce').textContent=state.started?`Глава ${index+1}: ${chapter.title}`:'';
  }
  if(force||Math.abs(state.time-lastUI)>.2){
   progress.value=String(state.time);progress.style.setProperty('--value',`${state.time/totalDuration*100}%`);
   progress.setAttribute('aria-valuetext',`${timeText(state.time)} из ${timeText(totalDuration)}. ${chapter.title}`);
   readout.textContent=`${timeText(state.time)} / ${timeText(totalDuration)}`;lastUI=state.time;
  }
 }
 const markReady=()=>{state.ready=true;stage.dataset.ready='true';stage.dataset.mode=state.fallback?'fallback':'live';stage.setAttribute('aria-busy','false');loader.hidden=true;[play,watch,mute,restart,previewPause,progress,...buttons].forEach(el=>el.disabled=false);sync();};
 function fail(error){state.fallback=true;state.running=false;audio.pause();canvas.hidden=true;fallback.hidden=false;labelNodes.forEach(n=>n.hidden=true);markReady();if(error)console.warn('Supra story uses a static illustration:',error);}

 try{
  if(!sourceModel){fail();}else{
   renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.07;
   scene=new T.Scene();camera=new T.OrthographicCamera(-4,4,3,-3,.1,100);
   scene.add(new T.HemisphereLight('#fffdf8','#626b60',2.15));
   const key=new T.DirectionalLight('#fffaf1',3.1);key.position.set(-3,7,-5);scene.add(key);
   const rim=new T.DirectionalLight('#e6edf1',1.5);rim.position.set(4,3,5);scene.add(rim);
   car=sourceModel.root.clone(true);car.name='Supra narrated anatomy';scene.add(car);
   const roles=new Map(Object.entries(sourceModel.materials).map(([role,material])=>[material,role]));
   const colors={paint:'#eeeFE9',glass:'#71817e',rubber:'#343e39',dark:'#515d55',black:'#38443e',alloy:'#bac5bd',steel:'#a2ada3',red:'#d54f32',amber:'#d7a169',light:'#f9fff0',interior:'#7b8a7b',engine:'#a9b7a9',cover:'#5b6d5b',bolt:'#647160'};
   for(const part of parts){
    const group=car.getObjectByName(part.id),home=sourceModel.assemblies[part.id].userData.home;
    assemblies[part.id]=group;group.position.copy(home);group.rotation.set(0,0,0);group.scale.set(1,1,1);group.visible=true;const meshes=[];
    group.traverse(object=>{
     if(object.isLineSegments){object.visible=false;return;}
     if(!object.isMesh)return;object.visible=true;object.castShadow=false;object.receiveShadow=false;
     const original=object.material,key=part.id+original.uuid;
     if(!materials.has(key)){
      const material=original.clone(),role=roles.get(original);if(material.color&&colors[role])material.color.set(colors[role]);
      if(role==='paint'){material.roughness=.36;material.metalness=.15;}
      if(role==='rubber'){material.roughness=.96;material.metalness=0;}
      if(role==='glass'){material.transparent=false;material.opacity=1;material.roughness=.42;}
      materials.set(key,material);const fade=material.clone();fade.transparent=true;fade.depthWrite=false;fadeMaterials.set(key,fade);
     }
     object.material=materials.get(key);meshes.push({object,material:materials.get(key),fade:fadeMaterials.get(key)});
    });meshGroups.set(part.id,meshes);
   }
   car.updateMatrixWorld(true);
   for(const part of parts){
    const box=new T.Box3();for(const {object}of meshGroups.get(part.id)){object.geometry.computeBoundingBox();box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));}
    restBoxes[part.id]=box;restCenters[part.id]=box.getCenter(new T.Vector3()).toArray();
   }
   const grid=new T.GridHelper(24,32,'#a4b39f','#d4dece');grid.position.y=-.035;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
   const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
   const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(60,76,51,.28)');gradient.addColorStop(1,'rgba(60,76,51,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
   const shadow=new T.Mesh(new T.PlaneGeometry(7,5),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.7}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.025;scene.add(shadow);
   const crank=assemblies.pistons.children.find(o=>o.isGroup&&o.children.some(child=>child.name==='Crank pin 1'));
   const pistons=Array.from({length:6},(_,i)=>({p:assemblies.pistons.getObjectByName('Piston '+(i+1)),rod:assemblies.pistons.getObjectByName('Connecting rod '+(i+1)),x:-1.5+i*.147,phase:[0,2*Math.PI/3,4*Math.PI/3,4*Math.PI/3,2*Math.PI/3,0][i]}));
   const shaft=assemblies.propshaft.children.find(o=>o.isGroup),yAxis=new T.Vector3(0,1,0),lower=new T.Vector3(),upper=new T.Vector3();
   function animateMechanism(time){
    const angle=time*1.7;if(crank)crank.rotation.x=angle;
    for(const {p,rod,x,phase}of pistons){const a=angle+phase,cy=.34+Math.cos(a)*.035,cz=Math.sin(a)*.035,py=cy+Math.sqrt(.145**2-cz**2);p.position.set(x,py+.024,0);lower.set(x,cy,cz);upper.set(x,py,0);rod.position.copy(lower).add(upper).multiplyScalar(.5);rod.quaternion.setFromUnitVectors(yAxis,upper.sub(lower).normalize());}
    if(shaft)shaft.rotation.x=angle;
    for(const id of ['wheel-fl','wheel-fr','wheel-rl','wheel-rr'])assemblies[id].rotation.z=time*.6;
   }
   const direction=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(),center=new T.Vector3(),point=new T.Vector3(),delta=new T.Vector3(),home=new T.Vector3();
   function projectedBounds(layout){
    const result={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
    for(const part of parts){const pose=layout.poses[part.id];if(pose.opacity<.01)continue;const box=restBoxes[part.id];
     for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      point.set(x+pose.offset[0],y+pose.offset[1],z+pose.offset[2]);const px=point.dot(right),py=point.dot(up),pz=point.dot(direction);
      result.minX=Math.min(result.minX,px);result.maxX=Math.max(result.maxX,px);result.minY=Math.min(result.minY,py);result.maxY=Math.max(result.maxY,py);result.minZ=Math.min(result.minZ,pz);result.maxZ=Math.max(result.maxZ,pz);
     }
    }return result;
   }
   function draw(time){
    const sample=sampleStory(time,restCenters,stage.clientWidth<760);handle.sample=sample;
    for(const part of parts){
     const group=assemblies[part.id],pose=sample.poses[part.id];home.copy(sourceModel.assemblies[part.id].userData.home);group.position.copy(home).add(delta.fromArray(pose.offset));group.visible=pose.opacity>.002;
     if(group.visible)for(const item of meshGroups.get(part.id)){
      const material=pose.opacity>.995?item.material:item.fade;item.object.material=material;if(material===item.fade)material.opacity=pose.opacity;
     }
    }
    animateMechanism(time);car.updateMatrixWorld(true);
    direction.fromArray(sample.direction).normalize();right.crossVectors(yAxis,direction).normalize();up.crossVectors(direction,right).normalize();
    const a=projectedBounds(sample.frameFrom),b=projectedBounds(sample.frameTo),box={};for(const key of Object.keys(a))box[key]=T.MathUtils.lerp(a[key],b[key],sample.blend);
    const width=stage.clientWidth,height=stage.clientHeight,aspect=width/height;
    camera.left=-4;camera.right=4;camera.top=4/aspect;camera.bottom=-4/aspect;
    const viewHeight=camera.top-camera.bottom;
    const portrait=width<760,frameHeight=portrait?.44:.52,lift=portrait?-.005:.055;
    camera.zoom=Math.min(8*.86/Math.max(.2,box.maxX-box.minX),viewHeight*frameHeight/Math.max(.2,box.maxY-box.minY));
    center.copy(right).multiplyScalar((box.minX+box.maxX)/2).addScaledVector(up,(box.minY+box.maxY)/2-viewHeight/camera.zoom*lift).addScaledVector(direction,(box.minZ+box.maxZ)/2);
    camera.position.copy(center).addScaledVector(direction,16);camera.up.copy(up);camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    for(let i=0;i<labelNodes.length;i++){
     const node=labelNodes[i],label=sample.labels[i];node.hidden=!label||sample.blend<.55;
     if(node.hidden)continue;const [id,text]=label;const pose=sample.poses[id],bounds=restBoxes[id];
     point.copy(bounds.getCenter(new T.Vector3())).add(delta.fromArray(pose.offset));point.y+=bounds.getSize(new T.Vector3()).y*.57+.04;point.project(camera);
     const heading=$('.hero-scene-heading'),minLabelTop=portrait?Math.max(145,heading.offsetTop+heading.offsetHeight+12):128;
     node.textContent=text;node.style.left=`${clamp((point.x*.5+.5)*width,75,width-75)}px`;node.style.top=`${clamp((-point.y*.5+.5)*height,minLabelTop,height-195)}px`;
    }
    renderer.render(scene,camera);state.renderCount++;
   }
   handle.draw=draw;
   const resize=()=>{renderer.setSize(Math.max(1,stage.clientWidth),Math.max(1,stage.clientHeight),false);dirty=true;};
   resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();draw(state.time);fallback.hidden=true;markReady();
  }
 }catch(error){fail(error);}
 visibilityObserver=new IntersectionObserver(entries=>{
  state.visible=entries.at(-1).isIntersecting;last=performance.now();dirty=true;
  if(!state.visible&&state.started&&state.running)pause(true);
 });visibilityObserver.observe(stage);
 document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden&&state.started&&state.running)pause(true);dirty=true;});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail();});
 reduced.addEventListener('change',event=>{if(event.matches)pause(true);});
 function loop(now){
  if(disposed)return;frame=requestAnimationFrame(loop);const dt=Math.min(.25,Math.max(0,(now-last)/1000));last=now;
  if(!state.visible||document.hidden)return;
  if(state.running){if(state.started)state.time=Math.min(totalDuration,audio.currentTime);else state.time=(state.time+dt)%totalDuration;dirty=true;}
  if(!dirty)return;updateUI();
  if(!state.fallback){try{handle.draw(state.time);}catch(error){fail(error);}}
  dirty=false;
 }
 updateUI(true);sync();frame=requestAnimationFrame(loop);return handle;
}
