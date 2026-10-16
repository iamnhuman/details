import {sounds} from './assets/sfx/manifest.mjs';
import {soundCues} from './hero-timeline.mjs';

// All future cues are scheduled on the audio device, independent of WebGL FPS.
// Any change to the narration's clock cancels and rebuilds that schedule.
export function createHeroSound(audio){
 let context,loading,enabled=false,disposed=false,buffering=false,error=null,anchor=null;
 const buffers=new Map(),sources=new Map(),listeners=[];
 const raw=new Map(Object.entries(sounds).map(([key,sound])=>[key,
  fetch(new URL(`./assets/sfx/${sound.file}`,import.meta.url),{signal:AbortSignal.timeout(15000)})
   .then(response=>{if(!response.ok)throw Error(`Sound ${key}: HTTP ${response.status}`);return response.arrayBuffer();})
   .catch(failure=>{error=failure;return null;})]));
 const canPlay=()=>enabled&&!disposed&&!buffering&&audio.readyState>=3&&!audio.paused&&!audio.ended&&!audio.seeking&&context?.state==='running'&&buffers.size===Object.keys(sounds).length;
 function cancel(timelineOnly=false){
  for(const [source,item] of sources){
   if(timelineOnly&&item.kind!=='timeline')continue;
   source.onended=null;try{source.stop();}catch{}source.disconnect();item.gain.disconnect();item.pan.disconnect();sources.delete(source);
  }
  anchor=null;
 }
 function start(sound,when,offset,rate,gain,pan,kind,id){
  const buffer=buffers.get(sound);if(!buffer||offset>=buffer.duration)return;
  const source=context.createBufferSource(),level=context.createGain(),panner=context.createStereoPanner();
  source.buffer=buffer;source.playbackRate.value=rate;level.gain.value=gain;panner.pan.value=pan;
  source.connect(level).connect(panner).connect(context.destination);
  const item={id,kind,when,offset,gain:level,pan:panner};sources.set(source,item);
  source.onended=()=>{sources.delete(source);source.disconnect();level.disconnect();panner.disconnect();};
  source.start(when,offset);
 }
 function schedule(){
  cancel(true);if(!canPlay())return;
  const time=audio.currentTime,now=context.currentTime,rate=audio.playbackRate||1;
  anchor={time,now,rate};
  for(const cue of soundCues){
   const startTime=cue.t-sounds[cue.sound].peak_offset_s;
   if(startTime+buffers.get(cue.sound).duration<=time)continue;
   start(cue.sound,now+Math.max(0,(startTime-time)/rate),Math.max(0,time-startTime),rate,cue.gain,cue.pan,'timeline',cue.id);
  }
 }
 async function arm(){
  if(disposed)return false;
  try{
   if(!context){const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioContext)return false;context=new AudioContext();}
   const resumed=context.resume(); // Called directly from the user's gesture.
   if(!loading)loading=Promise.all([...raw].map(async([key,promise])=>{
    const data=await promise;if(!data)throw error;buffers.set(key,await context.decodeAudioData(data));
   }));
   await Promise.all([resumed,loading]);if(disposed)return false;schedule();return true;
  }catch(failure){if(!error)error=failure;console.warn('Supra effects unavailable; narration remains available:',failure);return false;}
 }
 function setEnabled(value){
  if(enabled===!!value)return;enabled=!!value;
  if(enabled)schedule();else cancel();
 }
 function click(){
  if(enabled&&!disposed&&!buffering&&!audio.paused&&!audio.ended&&context?.state==='running'&&buffers.has('click'))start('click',context.currentTime,0,1,.10,0,'ui','chapter-click');
 }
 const on=(type,fn)=>{audio.addEventListener(type,fn);listeners.push([type,fn]);};
 on('playing',()=>{buffering=false;schedule();});on('seeked',schedule);on('ratechange',schedule);
 on('seeking',()=>cancel(true));on('waiting',()=>{buffering=true;cancel();});
 for(const type of ['pause','ended','error','emptied'])on(type,()=>cancel());
 on('timeupdate',()=>{
  if(anchor&&canPlay()&&Math.abs(audio.currentTime-(anchor.time+(context.currentTime-anchor.now)*anchor.rate))>.12)schedule();
 });
 return{
  arm,setEnabled,click,reset:()=>cancel(true),
  get ready(){return buffers.size===Object.keys(sounds).length;},
  get error(){return error?String(error):null;},
  get context(){return context;},
  get scheduled(){return [...sources.values()].map(({id,kind,when,offset,gain})=>({id,kind,when,offset,gain:gain.gain.value}));},
  dispose(){disposed=true;cancel();for(const[type,fn]of listeners)audio.removeEventListener(type,fn);context?.close();buffers.clear();}
 };
}
