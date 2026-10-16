import * as T from './vendor/three.module.min.js';
import {buildMechanicals,buildPistonMechanism} from './mechanicals.mjs';
import {parts} from './parts.mjs';

export async function buildSupra(onProgress=()=>{}) {
 const root=new T.Group(),assemblies={},pickables=[],wheels=[];
 const material=(color,roughness=.78,metalness=.02)=>new T.MeshStandardMaterial({color,roughness,metalness,side:T.DoubleSide});
 const m={paint:material('#efefec'),glass:material('#c8d0cf',.5),rubber:material('#b0b3b0'),dark:material('#929994'),black:material('#8a918e'),alloy:material('#e4e7e3',.5,.18),steel:material('#bfc5bf',.6,.12),red:material('#c66b5a'),amber:material('#c0b19c'),light:material('#f9faf8'),interior:material('#c6cac4'),engine:material('#b9c0b8'),cover:material('#9da69d'),bolt:material('#6c776b')};
 const outline=new T.LineBasicMaterial({color:'#59665c',transparent:true,opacity:.40,depthWrite:false});
 for(const part of parts){const g=new T.Group();g.name=part.id;g.userData={system:part.id,home:new T.Vector3(),offset:new T.Vector3(...part.offset)};root.add(g);assemblies[part.id]=g}
 for(const [id,x,z] of [['fl',-1.229,-.784],['fr',-1.229,.784],['rl',1.231,-.797],['rr',1.231,.797]]){
  for(const prefix of ['wheel-','brake-']){const g=assemblies[prefix+id];g.position.set(x,.324,z);g.userData.home.copy(g.position)}
  wheels.push(assemblies['wheel-'+id]);
 }
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 let meta,data;
 try{
  const fetchOK=async path=>{const response=await fetch(path,{signal:controller.signal});if(!response.ok)throw new Error(`Model asset ${response.status}: ${path}`);return response};
  const [metaResponse,geoResponse]=await Promise.all([fetchOK('./assets/supra/geometry.json'),fetchOK('./assets/supra/geometry.bin')]);
  meta=await metaResponse.json();data=await geoResponse.arrayBuffer();
 }catch(error){controller.abort();throw error;}finally{clearTimeout(timeout);}
 const decode=(offset,count,min,max)=>{const src=new Int16Array(data,offset,count*3),result=new Float32Array(count*3);for(let i=0;i<count;i++)for(let d=0;d<3;d++)result[i*3+d]=min[d]+(src[i*3+d]/32767+1)*.5*(max[d]-min[d]||1);return result};
 function partFor(r){
  const n=r.name,c=r.min.map((v,i)=>(v+r.max[i])/2),s=r.min.map((v,i)=>r.max[i]-v);
  if(r.group.startsWith('wheel'))return /metal|lambert1|brake/.test(r.mat)&&r.mat!=='blackplate_metal'?r.group.replace('wheel','brake'):r.group;
  if(r.group==='aero'||r.group==='hood')return r.group;
  if(r.mat==='carpaint'){
   if(n.startsWith('Plane047_'))return c[2]<0?'door-left':'door-right';
   if(s[0]>1.3&&s[1]<.45&&Math.abs(c[2])>.85)return c[2]<0?'sill-left':'sill-right';
   if(r.group.startsWith('door'))return r.group;
   if(c[0]<-1.6&&s[2]>1)return 'bumper-front';
   if(c[0]>1.6&&s[1]>.4&&s[2]>1)return 'bumper-rear';
   if(c[0]>1.6&&c[1]>.7)return 'hatch';
   if(c[0]<-.5&&Math.abs(c[2])>.8&&s[0]>.5)return c[2]<0?'fender-left':'fender-right';
  }
  if(/^Plane004_(carbon|GlossBlackpaint)|^Plane(023|036|054)_/.test(n))return 'roof';
  if(n.startsWith('Plane037_'))return 'glass';
  if(n.startsWith('Plane046_'))return 'mirrors';
  if(/^Plane(039|027|025|026|076|077|078)_|^pDisc/.test(n))return 'headlights';
  if(/^Plane(035|056|052)_/.test(n))return 'taillights';
  if(n.startsWith('Plane024_'))return 'steering';
  if(/^Plane(044|034)_/.test(n))return 'seats';
  if(/^Plane(038|058)_/.test(n))return 'console';
  if(/^Plane(030|014|009|040)_/.test(n))return 'dashboard';
  return r.group==='interior'?'interior':'body';
 }
 const materialFor=(name,group)=>{
  if(name==='carpaint')return m.paint;
  if(group.startsWith('wheel'))return name==='tire'?m.rubber:name==='GlossBlackpaint'?m.dark:m.alloy;
  if(name.includes('glass'))return m.glass;
  return ({GlossBlackpaint:m.dark,screen:m.black,seat:m.interior,carbon:m.cover,button:m.alloy,metal:m.steel,blackleather:m.interior,lambert1:m.alloy,tire:m.rubber,blackplate_metal:m.steel,mirror:m.glass,brake:m.red,orange_light:m.amber,taillights:m.red,light:m.light,carplate:m.alloy,red_reflec:m.red})[name]||m.alloy;
 };
 let triangles=0;
 for(let k=0;k<meta.meshes.length;k++){
  const r=meta.meshes[k],part=partFor(r),owner=assemblies[part],geo=new T.BufferGeometry();
  const localize=positions=>{for(let i=0;i<positions.length;i+=3){positions[i]-=owner.position.x;positions[i+1]-=owner.position.y;positions[i+2]-=owner.position.z}return positions};
  geo.setAttribute('position',new T.BufferAttribute(localize(decode(r.p,r.count,r.min,r.max)),3));
  geo.setAttribute('normal',new T.BufferAttribute(new Int8Array(data,r.n,r.count*3).slice(),3,true));
  geo.setIndex(new T.BufferAttribute((r.indexBytes===2?new Uint16Array(data,r.i,r.indices):new Uint32Array(data,r.i,r.indices)).slice(),1));
  const mesh=new T.Mesh(geo,materialFor(r.mat,part));mesh.name=r.name;mesh.castShadow=true;mesh.receiveShadow=true;owner.add(mesh);
  if(r.edgeCount){const ep=localize(decode(r.e,r.edgeCount,r.min,r.max));mesh.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(ep,3)),outline))}
  triangles+=r.indices/3;onProgress((k+1)/meta.meshes.length);
 }
 buildMechanicals(assemblies,m,outline,pickables);
 // The mechanical drawing is authored in vehicle coordinates; regroup without
 // changing those coordinates so each assembly gets its own exploded transform.
 for(const owner of [assemblies.engine,assemblies.chassis])for(const mesh of [...owner.children]){
  if(!mesh.isMesh)continue;
  const n=mesh.name;let target=owner.name;
  if(/Cover fastener|Acoustic|identification plate|Coil cover|Ignition coil|Cover heat|Oil filler|Cap grip/.test(n))target='engine-cover';
  else if(/Turbo fastener|Compressor volute|Compressor inlet|Turbine housing|Twin scroll|Turbo center|wastegate|Wastegate|Turbo oil|Turbo coolant/.test(n))target='turbo';
  else if(/intake|Intake|Air inlet|Air filter|Airbox|Compressor charge|Charge pipe/.test(n))target='intake';
  else if(/Radiator|Cooling fan|Fluid reservoir|Reservoir cap/.test(n))target='cooling';
  else if(/Bellhousing|transmission|Gearbox/.test(n))target='gearbox';
  else if(/Propshaft/.test(n))target='propshaft';
  else if(/differential|Differential/.test(n))target='differential';
  else if(/exhaust|Exhaust|silencer/.test(n))target='exhaust';
  else if(/fuel tank/.test(n))target='fuel-tank';
  else if(/Strut|strut brace/.test(n))target='suspension-front';
  else if(/suspension fastener|Steering tie rod|Axle subframe|Halfshaft|CV boot|suspension arm|toe link|Damper|Coil spring|Spring seat/.test(n)){
   mesh.updateMatrix();mesh.geometry.computeBoundingBox();const c=mesh.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(mesh.matrix);target=c.x<0?'suspension-front':'suspension-rear';
  }
  if(target!==owner.name)assemblies[target].add(mesh);
 }
 const mechanism=buildPistonMechanism(assemblies.pistons,m,outline);
 // Put each fan's blades on a pivot at the hub, retaining their world geometry.
 const fans=[];
 for(const z of [-.27,.27]){const pivot=new T.Group();pivot.position.set(-1.88,.46,z);assemblies.cooling.add(pivot);assemblies.cooling.updateMatrixWorld(true);
  for(const mesh of [...assemblies.cooling.children])if(mesh.isMesh&&/Cooling fan (blade|hub)/.test(mesh.name)&&Math.sign(mesh.position.z)===Math.sign(z))pivot.attach(mesh);
  fans.push(pivot);
 }
 const shaftPivot=new T.Group();shaftPivot.position.set(.54,.30,0);assemblies.propshaft.add(shaftPivot);root.updateMatrixWorld(true);
 for(const mesh of [...assemblies.propshaft.children])if(mesh.isMesh)shaftPivot.attach(mesh);
 pickables.length=0;
 for(const part of parts)assemblies[part.id].traverse(o=>{if(o.isMesh){o.userData.system=part.id;o.geometry.computeBoundingBox();pickables.push(o)}});
 const originals=new Map(pickables.map(o=>[o,o.material])),highlights=new Map(),hoverHighlights=new Map();
 const selectionColor=new T.Color('#cb7755'),hoverColor=new T.Color('#ef8250');
 let selection='body',isolated=null,hovered=null;
 function refreshHighlights(){
  for(const o of pickables){
   const original=originals.get(o),id=o.userData.system;
   const hovering=id===hovered&&!isolated,selected=id===selection&&id!=='body'&&!isolated;
   if(hovering||selected){
    const cache=hovering?hoverHighlights:highlights;
    if(!cache.has(original)){
     const h=original.clone();h.color.lerp(hovering?hoverColor:selectionColor,hovering?.72:.32);
     if(hovering&&h.emissive){h.emissive.set('#a83b10');h.emissiveIntensity=.22;}
     cache.set(original,h);
    }
    o.material=cache.get(original);
   }else o.material=original;
  }
 }
 function select(part){selection=part;refreshHighlights();}
 function hover(part){if(hovered===part)return;hovered=part;refreshHighlights();}
 function pose(explode,focus=0){
  for(const part of parts){const g=assemblies[part.id];g.position.copy(g.userData.home).addScaledVector(g.userData.offset,explode)}
  if(!isolated)assemblies.hood.position.add(new T.Vector3(-.12,.82,0).multiplyScalar(focus*(1-explode)));
  root.updateMatrixWorld(true);
 }
 const setColor=color=>{m.paint.color.set(color);for(const [base,h] of highlights)h.color.copy(base.color).lerp(selectionColor,.32);for(const [base,h] of hoverHighlights)h.color.copy(base.color).lerp(hoverColor,.72)};
 const setTechnical=enabled=>{outline.opacity=enabled?.40:0;m.rubber.color.set(enabled?'#b0b3b0':'#343b37');m.dark.color.set(enabled?'#929994':'#525d55');m.glass.color.set(enabled?'#c8d0cf':'#647b78');m.interior.color.set(enabled?'#c6cac4':'#525d55');for(const cache of [highlights,hoverHighlights]){cache.forEach(h=>h.dispose());cache.clear();}refreshHighlights()};
 const isolate=part=>{isolated=part;if(part)hovered=null;for(const o of pickables)o.visible=!part||o.userData.system===part;refreshHighlights()};
 const bounds=(part=null,view=null)=>{
  const b=new T.Box3();
  for(const o of pickables)if(o.visible&&(!part||o.userData.system===part)){
   const g=assemblies[o.userData.system],delta=g.position.clone().sub(g.userData.home);
   const matrix=new T.Matrix4().makeTranslation(...delta.toArray()).multiply(o.userData.fitMatrix);
   if(view)matrix.premultiply(view);
   b.union(o.geometry.boundingBox.clone().applyMatrix4(matrix));
  }
  return b;
 };
 function animate(time,part){
  for(const w of wheels)w.rotation.z=part===w.name?time*1.2:0;
  for(const f of fans)f.rotation.x=part==='cooling'?time*3:0;
  shaftPivot.rotation.x=part==='propshaft'?time*1.8:0;
  mechanism.animate(part==='pistons'?time*1.5:0);
 }
 pose(0);animate(0,null);root.updateMatrixWorld(true);
 for(const o of pickables)o.userData.fitMatrix=o.matrixWorld.clone();
 return{isolate,root,assemblies,pickables,wheels,pose,select,hover,setColor,setTechnical,bounds,animate,materials:m,stats:{triangles,meshes:meta.meshes.length,parts:parts.length,source:meta.source},get selection(){return selection},get hovered(){return hovered}};
}
