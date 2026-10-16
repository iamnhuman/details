import * as T from './vendor/three.module.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Explanatory B58 layout. The exterior/salon use the credited model;
// the powertrain and underbody are a purpose-built schematic, not service CAD.
export function buildMechanicals(groups, mats, lineMaterial, pickables) {
 const {engine,chassis}=groups, m=mats;
 const add=(geo,mat,owner,name,p=[0,0,0],edge=true)=>{const o=new T.Mesh(geo,mat);o.name=name;o.position.set(...p);o.castShadow=true;o.receiveShadow=true;o.userData.system=owner.userData.system;owner.add(o);pickables.push(o);if(edge)o.add(new T.LineSegments(new T.EdgesGeometry(geo,34),lineMaterial));return o};
 const box=(owner,name,p,size,mat=m.steel)=>add(new RoundedBoxGeometry(...size,2,Math.min(.008,...size.map(v=>v/4))),mat,owner,name,p);
 const cyl=(owner,name,p,r,h,mat=m.steel,axis=[0,1,0],r2=r,n=32)=>{const o=add(new T.CylinderGeometry(r2,r,h,n),mat,owner,name,p);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...axis).normalize());return o};
 const tube=(owner,name,pts,r,mat=m.steel)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),Math.max(16,pts.length*8),r,8,false),mat,owner,name,[0,0,0],false);
 const bolt=(owner,p,axis=[0,1,0],r=.009)=>{const name=owner===engine?(p[1]>.70?'Cover fastener':p[1]>.56&&Math.abs(p[2])>.5?'Strut fastener':p[2]>.39&&p[1]>.35&&p[1]<.6?'Turbo fastener':'Hex fastener'):(p[0]<0?'Front suspension fastener':'Rear suspension fastener');return cyl(owner,name,p,r,.008,m.bolt,axis,r,6)};
 const ring=(owner,name,p,r,t,axis=[0,1,0],mat=m.steel)=>{const o=add(new T.TorusGeometry(r,t,8,40),mat,owner,name,p,false);o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...axis));return o};
 box(engine,'Aluminium closed-deck block',[-1.14,.43,0],[.87,.25,.34],m.engine);
 box(engine,'Sump flange',[-1.14,.29,0],[.92,.025,.38]);
 box(engine,'Oil sump',[-1.11,.245,0],[.71,.09,.30],m.alloy);
 box(engine,'Cylinder head',[-1.14,.585,0],[.95,.07,.37],m.alloy);
 box(engine,'Head gasket',[-1.14,.545,0],[.95,.012,.375],m.dark);
 box(engine,'Acoustic engine cover B58',[-1.13,.665,0],[.98,.09,.40],m.cover);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;
 const labelCtx=labelCanvas.getContext('2d');labelCtx.fillStyle='#e9ece6';labelCtx.fillRect(0,0,512,128);labelCtx.fillStyle='#606c5c';labelCtx.font='600 70px Helvetica';labelCtx.fillText('B58',24,89);labelCtx.font='27px monospace';labelCtx.fillText('3.0 L',270,56);labelCtx.fillText('TWIN SCROLL',270,93);
 const labelMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(labelCanvas),side:T.DoubleSide});
 const label=add(new T.PlaneGeometry(.26,.065),labelMat,engine,'Engine identification plate',[-1.34,.717,-.115],false);label.rotation.x=-Math.PI/2;
 box(engine,'Coil cover spine',[-1.13,.716,0],[.88,.012,.1],m.dark);
 for(let i=0;i<6;i++){
  const x=-1.50+i*.147;
  box(engine,'Six cylinder casting rib',[x,.435,.178],[.022,.205,.018],m.alloy);
  box(engine,'Cylinder head rib',[x,.588,.192],[.055,.05,.018],m.steel);
  box(engine,'Ignition coil connector',[x,.728,0],[.055,.022,.065],m.alloy);
  tube(engine,'Injector fuel line',[[x,.61,-.195],[x,.65,-.22],[x,.655,-.27]],.006,m.steel);
  tube(engine,'Curved intake runner',[[x,.595,-.19],[x,.56,-.31],[x+.02,.49,-.34],[x+.02,.48,-.39]],.022,m.alloy);
  for(const z of [-.15,.15])bolt(engine,[x,.716,z]);
  for(const z of [-.203,.203])bolt(engine,[x,.55,z]);
 }
 cyl(engine,'High pressure fuel rail',[-1.14,.653,-.267],.014,.82,m.steel,[1,0,0]);
 box(engine,'Intake plenum',[-1.10,.49,-.41],[.87,.13,.15],m.cover);
 for(let i=0;i<12;i++)box(engine,'Cover heat ribs',[-1.56+i*.076,.715,.128],[.038,.008,.12],m.alloy);
 cyl(engine,'Oil filler cap',[-.78,.725,.095],.038,.019,m.dark);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(engine,'Cap grip',[-.78+Math.cos(a)*.038,.728,.095+Math.sin(a)*.038],[.009,.014,.009],m.cover)}
 // One twin-scroll turbocharger, with distinct hot and cold housings.
 ring(engine,'Compressor volute',[-1.25,.47,.36],.087,.026,[0,0,1],m.alloy);
 cyl(engine,'Compressor inlet',[-1.25,.47,.405],.054,.08,m.alloy,[0,0,1]);
 cyl(engine,'Compressor inlet recess',[-1.25,.47,.449],.042,.005,m.dark,[0,0,1]);
 ring(engine,'Turbine housing',[-1.25,.47,.265],.068,.025,[0,0,1],m.steel);
 box(engine,'Twin scroll collector',[-1.22,.53,.227],[.27,.12,.075],m.steel);
 cyl(engine,'Turbo center bearing',[-1.25,.47,.31],.035,.06,m.bolt,[0,0,1]);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;bolt(engine,[-1.25+Math.cos(a)*.077,.47+Math.sin(a)*.077,.401],[0,0,1],.006)}
 cyl(engine,'Electronic wastegate actuator',[-1.05,.50,.37],.026,.09,m.dark,[1,0,0]);
 tube(engine,'Wastegate linkage',[[-1.11,.5,.37],[-1.18,.5,.37],[-1.2,.52,.31]],.006);
 tube(engine,'Compressor charge pipe',[[-1.24,.54,.38],[-1.22,.62,.44],[-1.62,.63,.43],[-1.76,.54,.30],[-1.77,.50,-.24],[-1.61,.49,-.40]],.031,m.alloy);
 for(const x of [-1.48,-1.55])ring(engine,'Charge pipe band clamp',[x,.63,.43],.033,.004,[1,0,0],m.bolt);
 tube(engine,'Air inlet duct',[[-1.25,.47,.449],[-1.18,.46,.5],[-1.50,.46,.51],[-1.74,.52,.50]],.039,m.dark);
 box(engine,'Air filter housing',[-1.80,.52,.50],[.28,.14,.24],m.cover);
 for(let i=0;i<9;i++)box(engine,'Airbox ribs',[-1.91+i*.026,.598,.50],[.009,.012,.22],m.steel);
 tube(engine,'Turbo oil feed',[[-1.30,.64,.23],[-1.37,.58,.27],[-1.30,.53,.31]],.005,m.bolt);
 tube(engine,'Turbo coolant return',[[-1.16,.4,.29],[-1.12,.35,.34],[-1.43,.34,.32],[-1.5,.39,.19]],.008,m.dark);
 const front=-1.62;
 box(engine,'Timing cover',[front,.45,0],[.055,.27,.32],m.alloy);
 for(const [y,z,r] of [[.40,0,.068],[.53,-.10,.042],[.53,.10,.042],[.37,.15,.036]]){
  cyl(engine,'Accessory pulley',[front-.04,y,z],r,.028,m.dark,[-1,0,0]);
  cyl(engine,'Pulley hub',[front-.057,y,z],r*.38,.01,m.bolt,[-1,0,0]);
  ring(engine,'Pulley rim',[front-.06,y,z],r*.82,.004,[-1,0,0]);
  bolt(engine,[front-.07,y,z],[-1,0,0]);
 }
 tube(engine,'Serpentine belt',[[front-.06,.35,0],[front-.06,.37,.185],[front-.06,.56,.12],[front-.06,.58,-.11],[front-.06,.35,0]],.007,m.dark);
 cyl(engine,'Alternator casing',[-1.58,.43,-.24],.057,.12,m.steel,[1,0,0]);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;tube(engine,'Alternator cooling slot',[[-1.64,.43+Math.cos(a)*.06,-.24+Math.sin(a)*.06],[-1.53,.43+Math.cos(a)*.06,-.24+Math.sin(a)*.06]],.003,m.dark)}
 cyl(engine,'Bellhousing',[-.57,.40,0],.14,.25,m.alloy,[1,0,0],.105);
 box(engine,'Six-speed transmission',[-.22,.36,0],[.49,.17,.19],m.steel);
 for(let i=0;i<9;i++)box(engine,'Gearbox reinforcement rib',[-.44+i*.052,.36,0],[.012,.19,.22],m.alloy);
 for(const z of [-.19,.19]){
  box(engine,'Hydraulic engine mount',[-.95,.31,z],[.13,.08,.08],m.dark);
  bolt(engine,[-.95,.355,z]);
 }
 box(engine,'Radiator core',[-1.94,.46,0],[.045,.30,1.05],m.steel);
 for(let i=0;i<38;i++)box(engine,'Radiator fin',[-1.968,.46,-.50+i*.027],[.006,.265,.006],m.dark);
 box(engine,'Radiator top tank',[-1.94,.625,0],[.07,.04,1.08],m.cover);
 for(const z of [-.27,.27]){
  ring(engine,'Cooling fan shroud',[-1.90,.46,z],.128,.013,[1,0,0],m.dark);
  cyl(engine,'Cooling fan hub',[-1.88,.46,z],.029,.028,m.dark,[1,0,0]);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const blade=box(engine,'Cooling fan blade',[-1.88,.46+Math.cos(a)*.075,z+Math.sin(a)*.075],[.012,.086,.028],m.cover);blade.rotation.x=-a}
 }
 for(const s of [-1,1]){
  tube(engine,'Radiator coolant hose',[[-1.90,.60,s*.47],[-1.75,.63,s*.43],[-1.65,.56,s*.26]],.018,m.dark);
  box(engine,'Strut tower',[-1.23,.47,s*.64],[.23,.16,.23],m.alloy);
  cyl(engine,'Strut top mount',[-1.23,.562,s*.64],.085,.014,m.steel);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2;bolt(engine,[-1.23+Math.cos(a)*.063,.577,s*.64+Math.sin(a)*.063])}
  tube(engine,'Triangulated strut brace',[[-1.23,.58,s*.64],[-.80,.62,s*.32],[-.52,.65,s*.50]],.014,m.steel);
  box(engine,'Fluid reservoir',[-.58,.54,s*.52],[.12,.15,.10],m.alloy);
  cyl(engine,'Reservoir cap',[-.58,.624,s*.52],.026,.02,m.dark);
  tube(engine,'Wiring loom',[[-1.55,.6,s*.19],[-1.45,.63,s*.24],[-.9,.63,s*.25],[-.64,.59,s*.32]],.009,m.dark);
  for(const x of [-1.45,-1.2,-.94])ring(engine,'Wiring clip',[x,.63,s*.25],.012,.003,[1,0,0],m.steel);
 }
 // Floor, transmission tunnel, rear differential and suspension.
 box(chassis,'Pressed floor pan',[.32,.205,0],[2.78,.045,1.36],m.alloy);
 for(const z of [-.54,.54])box(chassis,'Longitudinal sill rail',[.1,.25,z],[3.55,.08,.07],m.steel);
 for(let i=0;i<10;i++)box(chassis,'Underfloor press rib',[-.55+i*.22,.18,0],[.025,.018,1.12],m.steel);
 cyl(chassis,'Propshaft',[.54,.30,0],.034,1.44,m.steel,[1,0,0]);
 for(const x of [-.12,1.20]){
  ring(chassis,'Propshaft flange',[x,.30,0],.052,.009,[1,0,0],m.bolt);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;cyl(chassis,'Propshaft flange bolt',[x,.30+Math.cos(a)*.043,Math.sin(a)*.043],.006,.014,m.alloy,[1,0,0],.006,6)}
 }
 box(chassis,'Propshaft witness mark',[.54,.334,0],[1.2,.003,.006],m.dark);
 box(chassis,'Limited-slip differential',[1.23,.31,0],[.31,.18,.27],m.steel);
 for(let i=0;i<8;i++)box(chassis,'Differential cooling rib',[1.10+i*.034,.31,0],[.01,.20,.29],m.alloy);
 for(const x of [-1.23,1.23]){
  box(chassis,'Axle subframe',[x,.26,0],[.19,.08,1.24],m.steel);
  for(const s of [-1,1]){
   if(x>0){cyl(chassis,'Halfshaft',[x,.32,s*.39],.023,.65,m.bolt,[0,0,1]);
   for(const z of [s*.18,s*.64]){cyl(chassis,'CV boot',[x,.32,z],.038,.09,m.dark,[0,0,1]);for(let j=0;j<6;j++)ring(chassis,'CV boot bellows',[x,.32,z+(j-2.5)*.013],.041,.004,[0,0,1],m.cover)}}
   tube(chassis,'Lower suspension arm',[[x-.18,.25,s*.36],[x,.22,s*.72],[x+.19,.25,s*.36]],.018,m.alloy);
   tube(chassis,x<0?'Steering tie rod':'Rear toe link',[[x+.23,.31,s*.38],[x+.08,.30,s*.72]],.013,m.steel);
   cyl(chassis,'Damper', [x,.43,s*.67],.022,.29,m.steel);
   const spring=Array.from({length:101},(_,i)=>{const t=i/100,a=t*Math.PI*12;return[x+Math.cos(a)*.044,.325+t*.23,s*.67+Math.sin(a)*.044]});
   tube(chassis,'Coil spring',spring,.006,m.cover);
   for(const y of [.325,.56])cyl(chassis,'Spring seat',[x,y,s*.67],.055,.011,m.alloy);
   for(const dx of [-.18,.19])bolt(chassis,[x+dx,.27,s*.36]);
  }
 }
 box(chassis,'Rear fuel tank',[.83,.23,0],[.55,.13,.69],m.cover);
 for(const s of [-1,1]){
  tube(chassis,'Dual exhaust pipe',[[-1.18,.24,.24],[-.7,.15,.24],[.25,.14,s*.23],[1.30,.18,s*.43],[1.78,.25,s*.59],[1.96,.29,s*.59]],.027,m.steel);
  cyl(chassis,'Rear silencer',[1.65,.25,s*.53],.085,.39,m.alloy,[1,0,0]);
  cyl(chassis,'Polished exhaust outlet',[1.98,.29,s*.59],.057,.16,m.alloy,[1,0,0]);
  cyl(chassis,'Exhaust outlet recess',[2.066,.29,s*.59],.044,.003,m.dark,[1,0,0]);
 }
 // Batch repeated fasteners/fins to keep the detailed drawing responsive.
 for(const owner of [engine,chassis]){
  const batches=new Map();
  for(const mesh of [...owner.children])if(mesh.isMesh&&/fastener|Radiator fin|Cover heat ribs|Underfloor press rib/.test(mesh.name)){
   const key=mesh.name+mesh.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
  }
  for(const list of batches.values())if(list.length>3){
   const gs=list.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix)}),g=mergeGeometries(gs,false);
   if(g){list.forEach(o=>owner.remove(o));add(g,list[0].material,owner,list[0].name+' × '+list.length,[0,0,0],false)}
   gs.forEach(g=>g.dispose());
  }
 }
}

// Slow kinematic illustration, intentionally separate from the opaque block.
export function buildPistonMechanism(owner,m,lineMaterial){
 const mesh=(geo,mat,parent,p=[0,0,0])=>{const o=new T.Mesh(geo,mat);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);o.add(new T.LineSegments(new T.EdgesGeometry(geo,34),lineMaterial));return o};
 const alongX=o=>{o.rotation.z=Math.PI/2;return o};
 const crank=new T.Group();crank.position.set(-1.14,.34,0);owner.add(crank);
 alongX(mesh(new T.CylinderGeometry(.018,.018,.92,24),m.bolt,crank));
 const pistons=[],radius=.035,length=.145;
 for(let i=0;i<6;i++){
  const x=-1.50+i*.147,phase=[0,2*Math.PI/3,4*Math.PI/3,4*Math.PI/3,2*Math.PI/3,0][i];
  const p=mesh(new T.CylinderGeometry(.047,.047,.055,32),m.alloy,owner,[x,.52,0]);
  p.name='Piston '+(i+1);
  for(const dy of [-.017,-.006,.005]){const r=mesh(new T.TorusGeometry(.047,.002,6,32),m.bolt,p,[0,dy,0]);r.rotation.x=Math.PI/2}
  const rod=mesh(new T.CylinderGeometry(.008,.012,length,12),m.steel,owner);rod.name='Connecting rod '+(i+1);
  const pin=alongX(mesh(new T.CylinderGeometry(.016,.016,.055,16),m.steel,crank,[x+1.14,Math.cos(phase)*radius,Math.sin(phase)*radius]));
  pin.name='Crank pin '+(i+1);
  for(const dx of [-.029,.029]){const web=alongX(mesh(new T.CylinderGeometry(.045,.045,.012,20),m.engine,crank,[x+1.14+dx,0,0]));web.name='Crank web';}
  pistons.push({p,rod,x,phase});
 }
 const flywheel=alongX(mesh(new T.CylinderGeometry(.105,.105,.027,48),m.alloy,crank,[.49,0,0]));flywheel.name='Flywheel';
 for(let i=0;i<8;i++){const a=i*Math.PI/4;alongX(mesh(new T.CylinderGeometry(.007,.007,.029,6),m.bolt,crank,[.506,Math.cos(a)*.07,Math.sin(a)*.07]))}
 const yAxis=new T.Vector3(0,1,0);
 return{animate(angle){crank.rotation.x=angle;for(const {p,rod,x,phase}of pistons){const a=angle+phase,cy=.34+Math.cos(a)*radius,cz=Math.sin(a)*radius,py=cy+Math.sqrt(length*length-cz*cz);p.position.y=py+.024;const lower=new T.Vector3(x,cy,cz),upper=new T.Vector3(x,py,0);rod.position.copy(lower).add(upper).multiplyScalar(.5);rod.quaternion.setFromUnitVectors(yAxis,upper.sub(lower).normalize())}}};
}
