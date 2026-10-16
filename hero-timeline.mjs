import {chapters,totalDuration} from './hero-story.mjs';
import {parts} from './parts.mjs';

export const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
export const ease=v=>{v=clamp(v);return v*v*v*(v*(v*6-15)+10);};
const lerp=(a,b,t)=>a+(b-a)*t;
export const motionTiming=Object.freeze({separationLead:.65,separationDuration:7.4,cabinDelay:.55,mechanicalDelay:1.1,transition:2.8,reunionLead:3.5,reunionTail:3.5});
// Smootherstep reaches maximum speed halfway through its interval. Audio peaks
// use these same intervals rather than an independently maintained cue sheet.
export const soundCues=[
 {id:'body-panels',t:chapters[1].start+motionTiming.separationLead+motionTiming.separationDuration/2,sound:'air',gain:.22,pan:-.28,visual:'move'},
 {id:'body-mechanicals',t:chapters[1].start+motionTiming.separationLead+motionTiming.mechanicalDelay+motionTiming.separationDuration/2,sound:'swish',gain:.16,pan:.28,visual:'move'},
 ...chapters.slice(2,6).map((chapter,i)=>({id:`focus-${chapter.id}`,t:chapter.start+motionTiming.transition/2,sound:i%2?'swish':'air',gain:.16,pan:0,visual:'move'})),
 {id:'reunion-move',t:chapters[6].start+motionTiming.reunionLead+(chapters[6].duration-motionTiming.reunionLead-motionTiming.reunionTail)/2,sound:'return',gain:.24,pan:0,visual:'move'},
 {id:'reunion-lock',t:chapters[6].end-motionTiming.reunionTail,sound:'latch',gain:.13,pan:0,visual:'land'}
];
const directions=[[-1,.42,-1.3],[-1,.72,-1.25],[-.23,.38,-1],[-.35,.42,1],[-.25,.47,-1],[-.3,.38,-1],[-1,.48,-1.25]];
const focus=[[],[],['engine','engine-cover','pistons'],['turbo','intake'],['gearbox','propshaft','differential','wheel-rl','wheel-rr','brake-rl','brake-rr'],['suspension-front','brake-fl','wheel-fl'],[]];
export const labels=[
  [],[['hood','Капот'],['engine','B58'],['wheel-fl','Ходовая']],
  [['engine','Блок и головка'],['pistons','6 поршней'],['engine-cover','Крышка B58']],
  [['turbo','Турбокомпрессор'],['intake','Впуск']],
  [['gearbox','Коробка'],['propshaft','Кардан'],['differential','Дифференциал']],
  [['suspension-front','Подвеска'],['brake-fl','Brembo · 348 мм'],['wheel-fl','Колесо']],[]
];
export function chapterAt(time){const index=chapters.findIndex(c=>time<c.end);return index<0?chapters.length-1:index;}

function rawPose(index,seconds,rest,portrait){
  const chapter=chapters[index],p=clamp(seconds/chapter.duration),poses={};
  const apart=index===1?ease((seconds-motionTiming.separationLead)/(motionTiming.separationDuration+motionTiming.mechanicalDelay))*1.08:index===6?(1-ease((seconds-motionTiming.reunionLead)/(chapter.duration-motionTiming.reunionLead-motionTiming.reunionTail)))*1.08:0;
  for(const part of parts){
    let opacity=focus[index].length?(focus[index].includes(part.id)?1:0):1;
    if(part.id==='pistons'&&!focus[index].length)opacity=clamp(apart*3);
    let offset=part.offset.map(v=>v*apart);
    if(index===1){
      const delay=part.category==='body'?0:part.category==='cabin'?motionTiming.cabinDelay:motionTiming.mechanicalDelay;
      const amount=ease((seconds-motionTiming.separationLead-delay)/motionTiming.separationDuration)*1.08;
      offset=part.offset.map(v=>v*amount);
    }
    poses[part.id]={offset,opacity};
  }
  const center=(id,value)=>{const c=rest[id];if(c)poses[id].offset=value.map((v,i)=>v-c[i]);};
  if(index===2){center('engine',[-.8,.74,.18]);center('pistons',[.78,.84,-.05]);center('engine-cover',[-.8,1.40,.18]);}
  if(index===3){center('turbo',[-.95,.78,0]);center('intake',[.55,.78,0]);}
  if(index===4){
    center('gearbox',[-1.4,.75,0]);center('propshaft',[0,.75,0]);center('differential',[1.35,.75,0]);
    for(const side of ['l','r']){const s=side==='l'?-1:1;center('wheel-r'+side,[1.35,.75,s*1.16]);center('brake-r'+side,[1.35,.75,s*.88]);}
  }
  if(index===5){center('suspension-front',[-1.35,.75,.2]);center('brake-fl',[.05,.75,0]);center('wheel-fl',[1.05,.75,0]);}
  if(portrait){
    if(index===2){center('engine',[0,.53,.15]);center('pistons',[0,1.56,-.1]);center('engine-cover',[0,2.13,.15]);}
    if(index===3){center('turbo',[0,1.52,0]);center('intake',[0,.55,0]);}
    if(index===4){center('gearbox',[0,2.35,0]);center('propshaft',[0,1.68,0]);center('differential',[0,1.02,0]);for(const side of ['l','r']){const s=side==='l'?-1:1;center('wheel-r'+side,[s*.52,.48,0]);center('brake-r'+side,[s*.52,.48,.23]);}}
    if(index===5){center('suspension-front',[0,1.65,.2]);center('brake-fl',[-.45,.52,0]);center('wheel-fl',[.60,.52,0]);}
  }
  const direction=[...directions[index]];
  direction[0]+=.10*Math.sin(p*Math.PI*2);direction[1]+=.035*Math.sin(p*Math.PI);
  return{poses,direction,apart,focus:focus[index]};
}

// Every transform is a pure function of the same seconds used by the audio.
// Seeking backwards produces the same pose; no accumulated animation state.
export function sampleStory(time,restCenters={},portrait=false){
  time=clamp(time,0,totalDuration);const index=chapterAt(time),chapter=chapters[index],local=time-chapter.start;
  const current=rawPose(index,local,restCenters,portrait),previous=index>=2?rawPose(index-1,chapters[index-1].duration,restCenters,portrait):current;
  const blend=index>=2?ease(local/motionTiming.transition):1,poses={};
  for(const part of parts){const a=previous.poses[part.id],b=current.poses[part.id];poses[part.id]={offset:b.offset.map((v,i)=>lerp(a.offset[i],v,blend)),opacity:lerp(a.opacity,b.opacity,blend)};}
  return{time,index,chapter,local,progress:clamp(local/chapter.duration),poses,
    direction:current.direction.map((v,i)=>lerp(previous.direction[i],v,blend)),
    frameFrom:previous,frameTo:current,blend,apart:lerp(previous.apart,current.apart,blend),labels:labels[index],focus:current.focus};
}
