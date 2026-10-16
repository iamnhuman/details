import * as T from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { buildSupra } from './model.mjs';
import {parts,categories,descriptions} from './parts.mjs';
import {initNarratedHero} from './hero.mjs';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const stage = $('#stage');
const canvas = $('#car-canvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = { selected: 'body', hovered: null, explode: 0, currentExplode: 0, focus: 0, currentFocus: 0, rotate: false, zoom: 1, visible: true, dirty: true, framing: true, cameraTween: null, fallback: false, technical: true, isolated: false, motion: false, motionTime: 0 };
let renderer, scene, camera, controls, model;
function setHover(part){
  const changed=state.hovered!==part;
  state.hovered=part;
  model?.hover(part);
  stage.classList.toggle('is-hovering',!!part);
  stage.dataset.hovered=part||'';
  const tooltip=$('#part-tooltip');tooltip.hidden=!part;
  if(part&&changed){$('#hover-number').textContent=descriptions[part].number;$('#hover-name').textContent=descriptions[part].label;}
  if(changed)state.dirty=true;
  return changed;
}
let filteredParts=parts;
$('#part-count').textContent=`${parts.length} ДЕТАЛИ`;
for(const [value,label] of Object.entries(categories))$('#part-category').add(new Option(label,value));
function filterParts(){
 const query=$('#part-search').value.trim().toLocaleLowerCase('ru'),category=$('#part-category').value;
 filteredParts=parts.filter(p=>(category==='all'||p.category===category)&&`${p.label} ${p.text}`.toLocaleLowerCase('ru').includes(query));
 $('#part-list').innerHTML=filteredParts.map(p=>`<button class="system ${p.id===state.selected?'active':''}" data-system="${p.id}" aria-pressed="${p.id===state.selected}"><span class="system-number">${p.number}</span><span>${p.label}</span><span class="system-arrow">↗</span></button>`).join('');
 $('#part-list').hidden=!filteredParts.length;$('#catalog-empty').hidden=!!filteredParts.length;
 $('#part-count').textContent=`${filteredParts.length} / ${parts.length}`;
 for(const id of ['previous-part','next-part','isolated-prev','isolated-next'])$('#'+id).disabled=filteredParts.length===1;
}
filterParts();
$('#part-search').addEventListener('input',filterParts);
$('#part-category').addEventListener('change',filterParts);
$('#part-list').addEventListener('click',e=>{const b=e.target.closest('[data-system]');if(b)selectSystem(b.dataset.system)});
for(const [id,step]of [['previous-part',-1],['next-part',1],['isolated-prev',-1],['isolated-next',1]])$('#'+id).addEventListener('click',()=>{const list=filteredParts.length?filteredParts:parts;const i=list.findIndex(p=>p.id===state.selected);selectSystem(list[(i+step+list.length)%list.length].id)});
const announce = text => { $('#announce').textContent = text; };

function updateReadout() {
  const value = Math.round(state.explode * 100);
  $('#explode-range').value = value;
  $('#explode-range').style.setProperty('--value', `${value}%`);
  $('#explode-range').setAttribute('aria-valuetext', value ? `Разборка ${value}%` : 'Модель собрана');
  $('#explode-value').innerHTML = `${value}<span>%</span>`;
  $('#explode-toggle').setAttribute('aria-pressed', String(value > 0));
  $('#explode-toggle span').textContent = value > 0 ? 'Собрать модель' : 'Разобрать модель';
  $('#model-status').textContent = `${descriptions[state.selected].label} · ${state.fallback ? 'статичная иллюстрация' : state.isolated ? 'узел отдельно' : value ? `разборка ${value}%` : state.focus ? 'капот открыт' : 'модель собрана'}`;
  stage.dataset.explode = String(value);
  stage.dataset.system = state.selected;
  if(!state.fallback)$('#interaction-hint').textContent=value?'Наведите · нажмите на деталь':'Вращайте · нажмите на деталь';
}

function selectSystem(system, shouldAnnounce = true) {
  if (!descriptions[system]) return;
  const samePart = state.selected === system;
  state.selected = system;
  state.focus = descriptions[system].category==='power' ? 1 : 0;
  if (!samePart) { state.motion=false;state.motionTime=0; }
  updateMotionButton();
  const d = descriptions[system];
  $('#detail-index').textContent = d.index;
  $('#detail-title').textContent = d.title;
  $('#isolated-name').textContent=d.label;
  $('#selected-hotspot').textContent=d.number;
  $('#selected-hotspot').setAttribute('aria-label',`Рассмотреть ${d.label} отдельно`);
  $('#detail-text').textContent = d.text;
  $('#detail-facts').innerHTML = d.facts.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  $$('.system').forEach(b => { const active = b.dataset.system === system; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  const selectedButton=$(`#part-list [data-system="${system}"]`);
  if(selectedButton){const list=$('#part-list'),row=selectedButton.getBoundingClientRect(),bounds=list.getBoundingClientRect();if(row.top<bounds.top)list.scrollTop+=row.top-bounds.top;else if(row.bottom>bounds.bottom)list.scrollTop+=row.bottom-bounds.bottom;}
  if (model) { model.select(system); if (state.isolated && !samePart) isolateSelected(true); }
  state.dirty = true;
  updateReadout();
  if (shouldAnnounce) announce(`Выбран узел: ${d.label}`);
}

function setExplode(value, speak = false) {
  if (state.isolated && value > 0) isolateSelected(false);
  state.explode = Math.max(0, Math.min(1, value));
  if(!state.explode)setHover(null);
  state.dirty = true;
  updateReadout();
  if (speak) announce(state.explode ? 'Модель разобрана на основные узлы' : 'Модель собрана');
}

$('#selected-hotspot').addEventListener('click',()=>isolateSelected(true));
$('#exit-isolate').addEventListener('click',()=>isolateSelected(false));
$('#explode-toggle').addEventListener('click', () => setExplode(state.explode > .01 ? 0 : 1, true));
$('#explode-range').addEventListener('input', e => setExplode(Number(e.target.value) / 100));
$('#explode-range').addEventListener('change', () => announce(`Разборка ${Math.round(state.explode * 100)} процентов`));
$$('.swatch').forEach(b => b.addEventListener('click', () => {
  if (model) model.setColor(b.dataset.color);
  $$('.swatch').forEach(s => { s.classList.toggle('selected', s === b); s.setAttribute('aria-pressed', String(s === b)); });
  state.dirty = true;
  announce(`Цвет кузова: ${b.getAttribute('aria-label')}`);
}));
$('#explore-engine').addEventListener('click', () => {
  selectSystem('engine');
  isolateSelected(true);
  $('#explore').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
  stage.focus({ preventScroll: true });
});
function openAtlasPart(part,explode=false){
  selectSystem(part);
  if(!state.fallback){if(explode)setExplode(1);else isolateSelected(true);}
  $('#explore').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  stage.focus({preventScroll:true});
}
$('#hero-explore').addEventListener('click',e=>{e.preventDefault();openAtlasPart('body',true);});
$$('[data-hero-part]').forEach(b=>b.addEventListener('click',()=>openAtlasPart(b.dataset.heroPart)));

const presetPositions = { iso: [-6.2, 4.6, 7.6], side: [0, 1.8, 10], front: [-10, 2.25, .001], top: [-.001, 10, .001] };
function viewPosition(view){
 const p=new T.Vector3(...presetPositions[view]);
 if(state.isolated&&view==='iso'){
  const id=state.selected,side=/left$|-fl$|-rl$/.test(id)?-1:1;
  if(/^(wheel|brake)-/.test(id))p.set(-4,2.8,side*9);
  else if(/door-|fender-|sill-/.test(id))p.z*=side;
  else if(/^(bumper-rear|taillights|hatch|exhaust)$/.test(id))p.x*=-1;
 }
 return p;
}
function setView(view) {
  if (!camera || !controls) return;
  state.rotate = false;
  controls.autoRotate = false;
  $('#rotate').setAttribute('aria-pressed', 'false');
  state.cameraTween = viewPosition(view);
  $$('.view-presets button').forEach(b => { b.classList.toggle('selected', b.dataset.view === view); b.setAttribute('aria-pressed', String(b.dataset.view === view)); });

  $('#projection-label').textContent = { iso: 'ИЗОМЕТРИЯ', side: 'ВИД СБОКУ', front: 'ВИД СПЕРЕДИ', top: 'ВИД СВЕРХУ' }[view];
  state.dirty = true;
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
function zoomBy(delta) {
  state.zoom = Math.max(.7, Math.min(3.6, state.zoom + delta));
  state.dirty = true;
}
$('#zoom-in').addEventListener('click', () => zoomBy(.12));
$('#zoom-out').addEventListener('click', () => zoomBy(-.12));
$('#rotate').addEventListener('click', () => {
  if (!controls) return;
  state.rotate = !state.rotate;
  state.cameraTween = null;
  controls.autoRotate = state.rotate;
  $('#rotate').setAttribute('aria-pressed', String(state.rotate));
  state.dirty = true;
  announce(state.rotate ? 'Автовращение включено' : 'Автовращение выключено');
});
function reset() {
  if (state.isolated) isolateSelected(false);
  state.zoom = 1;
  $('#part-search').value='';$('#part-category').value='all';filterParts();
  setExplode(0);
  selectSystem('body', false);
  setView('iso');
  announce('Исходный вид восстановлен');
}
$('#reset').addEventListener('click', reset);
function isolateSelected(enabled) {
  setHover(null);
  state.isolated = enabled;
  model?.isolate(enabled ? state.selected : null);
  $('#detail-focus').setAttribute('aria-pressed', String(enabled));
  $('#detail-focus').innerHTML = enabled ? 'Вернуть машину <span>↙</span>' : 'Рассмотреть отдельно <span>↗</span>';
  state.zoom = 1;
  $('#isolated-badge').hidden=!enabled;
  if(!enabled){state.motion=false;updateMotionButton();}
  if (enabled) { state.explode = 0; updateReadout();if(matchMedia('(max-width:760px)').matches)stage.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'}); }
  state.cameraTween = viewPosition('iso');
  state.framing = true;
  state.dirty = true;
  updateReadout();
}
function updateMotionButton(){
 const d=descriptions[state.selected],label=d.motion||(state.selected==='engine'?'Как работают поршни':null);
 for(const b of [$('#part-motion'),$('#stage-motion')]){
  b.hidden=!label;b.setAttribute('aria-pressed',String(state.motion));b.textContent=state.motion?'Ⅱ Приостановить':`▷ ${label||'Запустить движение'}`;
 }
 stage.classList.toggle('has-motion',!!label);
}
function toggleMotion(){
 if(state.selected==='engine')selectSystem('pistons');
 const play=!state.motion;
 if(play&&!state.isolated)isolateSelected(true);
 state.motion=play;updateMotionButton();state.dirty=true;
 announce(play?'Анимация узла запущена':'Анимация приостановлена');
}
$('#part-motion').addEventListener('click',toggleMotion);
$('#stage-motion').addEventListener('click',toggleMotion);
$('#detail-focus').addEventListener('click', () => isolateSelected(!state.isolated));
$('#technical').addEventListener('click', () => {
  state.technical = !state.technical;
  model?.setTechnical(state.technical);
  $('#technical').setAttribute('aria-pressed', String(state.technical));
  state.dirty = true;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault(); zoomBy(e.deltaY < 0 ? .12 : -.12);
}, {passive:false});
$('#fullscreen').addEventListener('click', async () => {
  const atlas = $('.atlas');
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (atlas.requestFullscreen) await atlas.requestFullscreen();
    else atlas.classList.toggle('expanded');
  } catch { atlas.classList.toggle('expanded'); }
  $('#fullscreen').setAttribute('aria-label', atlas.classList.contains('expanded') || document.fullscreenElement ? 'Свернуть модель' : 'Развернуть модель');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('.atlas').classList.remove('expanded'); });
stage.addEventListener('keydown', e => {
  if (e.target !== stage) return;
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', '+', '=', '-'].includes(e.key)) e.preventDefault();
  if (e.key === ' ') setExplode(state.explode > .01 ? 0 : 1, true);
  if (e.key === 'Home') reset();
  if (e.key === '+' || e.key === '=') zoomBy(.12);
  if (e.key === '-') zoomBy(-.12);
  if (controls && e.key.startsWith('Arrow')) {
    state.cameraTween = null;
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new T.Spherical().setFromVector3(offset);
    if (e.key === 'ArrowLeft') spherical.theta -= .14;
    if (e.key === 'ArrowRight') spherical.theta += .14;
    if (e.key === 'ArrowUp') spherical.phi -= .10;
    if (e.key === 'ArrowDown') spherical.phi += .10;
    spherical.phi = Math.max(.03, Math.min(1.48, spherical.phi));
    camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical));
    state.dirty = true;
  }
});

function fallback(reason) {
  setHover(null);
  state.fallback = true;
  $('#loader').hidden = true;
  canvas.hidden = true;
  $('#fallback-image').hidden = false;
  $('#hotspots').hidden = true;
  $('#interaction-hint').textContent = 'Иллюстрация · 3D недоступно в этом браузере';
  $$('.view-toolbar button, #technical, #detail-focus, #part-motion, #stage-motion, #explore-engine, #explode-toggle, #explode-range, .swatch').forEach(b => b.disabled = true);
  stage.dataset.ready = 'fallback';
  updateReadout();
  if (reason) console.info('Supra uses the SVG fallback:', reason.message);
  if(!$('#hero-stage').dataset.ready)initNarratedHero(null);
  if(reason)window.__supraStartup?.fail(reason);else window.__supraStartup?.finish();
}

async function init() {
  try {
    const context = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!context) { fallback(); return; }
    renderer = new T.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  } catch (error) { fallback(error); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0xfaf9f5, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.VSMShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  scene = new T.Scene();
  camera = new T.OrthographicCamera(-3, 3, 2, -2, .1, 50);
  camera.position.set(...presetPositions.iso);
  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, .65, 0);
  controls.enableDamping = !reduced.matches;
  controls.dampingFactor = .085;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = .005;
  controls.maxPolarAngle = Math.PI * .48;
  controls.autoRotateSpeed = .50;
  controls.rotateSpeed = .55;
  controls.touches.ONE = T.TOUCH.ROTATE;
  controls.touches.TWO = T.TOUCH.DOLLY_ROTATE;
  // Pointer events update OrbitControls before rAF. Always invalidate the image,
  // even when the next controls.update() reports no further camera change.
  controls.addEventListener('change', () => { state.dirty = true; });
  controls.addEventListener('start', () => {
    state.cameraTween = null;
    controls.autoRotate = false;
    state.rotate = false;
    $('#rotate').setAttribute('aria-pressed', 'false');
    $$('.view-presets button').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
    $('#projection-label').textContent = 'СВОБОДНЫЙ РАКУРС';
  });
  scene.add(new T.HemisphereLight(0xffffff, 0xa6ada8, 2.1));
  const key = new T.DirectionalLight(0xffffff, 3.0);
  key.position.set(-3.5, 7, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.camera.near = .5; key.shadow.camera.far = 20;
  key.shadow.normalBias = .025;
  key.shadow.bias = -.0001;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 8;
  scene.add(key);
  const fill = new T.DirectionalLight(0xdde7ee, 1.1);
  fill.position.set(3, 3, -4);
  scene.add(fill);
  model = await buildSupra(progress=>window.__supraStartup?.progress(`Собираем детали Supra · ${Math.round(progress*100)}%`));
  scene.add(model.root);
  // Show the opening scene before compiling shadows for the atlas below it.
  // An offscreen atlas must not hold the hero behind its loading overlay.
  await initNarratedHero(model);
  const ground = new T.Mesh(new T.PlaneGeometry(200, 200), new T.ShadowMaterial({ color: 0x63705b, opacity: .12 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.003;
  ground.receiveShadow = true;
  scene.add(ground);
  const shadowTexCanvas = document.createElement('canvas');
  shadowTexCanvas.width = 128; shadowTexCanvas.height = 128;
  const ctx = shadowTexCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 12, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(60,73,52,.23)');
  gradient.addColorStop(.6, 'rgba(60,73,52,.12)');
  gradient.addColorStop(1, 'rgba(60,73,52,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const contact = new T.Mesh(new T.PlaneGeometry(5.6, 2.8), new T.MeshBasicMaterial({ map: new T.CanvasTexture(shadowTexCanvas), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = .002;
  scene.add(contact);
  const resize = () => {
    const width = stage.clientWidth, height = stage.clientHeight;
    renderer.setSize(width, height, false);
    const aspect = width / height, span = aspect > 1.5 ? 6.2 : 5.75;
    camera.left = -span / 2; camera.right = span / 2;
    camera.top = span / aspect / 2; camera.bottom = -span / aspect / 2;
    camera.updateProjectionMatrix();
    state.framing = true;
    state.dirty = true;
  };
  new ResizeObserver(resize).observe(stage);
  const initialBounds=stage.getBoundingClientRect();
  state.visible=initialBounds.bottom>-100&&initialBounds.top<innerHeight+100;
  new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; if (state.visible) state.dirty = true; }, { rootMargin: '100px' }).observe(stage);
  function updateHotspots() {
    const b=$('#selected-hotspot'),box=model.bounds(state.selected);
    if(box.isEmpty()){b.hidden=true;return}
    const p=box.getCenter(new T.Vector3());p.y=box.max.y+.08;p.project(camera);
    const left=(p.x*.5+.5)*stage.clientWidth,top=(-p.y*.5+.5)*stage.clientHeight;
    b.style.left=`${left}px`;b.style.top=`${top}px`;
    b.hidden=state.isolated||left<20||left>stage.clientWidth-20||top<45||top>stage.clientHeight-35;
  }
  function fitZoom(){
    camera.updateMatrixWorld(true);
    const box=model.bounds(null,camera.matrixWorldInverse),size=box.getSize(new T.Vector3());
    return Math.min((camera.right-camera.left)/Math.max(.05,size.x)/1.18,(camera.top-camera.bottom)/Math.max(.05,size.y)/1.38);
  }
  const ray = new T.Raycaster(),pointer=new T.Vector2();
  let pointerStart,hoverPointer=null,hoverPending=false;
  function pickPart(x,y){
    const bounds=canvas.getBoundingClientRect();
    if(x<bounds.left||x>=bounds.right||y<bounds.top||y>=bounds.bottom)return null;
    pointer.set((x-bounds.left)/bounds.width*2-1,-(y-bounds.top)/bounds.height*2+1);
    ray.setFromCamera(pointer,camera);
    return ray.intersectObjects(model.pickables.filter(o=>o.visible),false)[0]?.object.userData.system||null;
  }
  function updateHover(){
    hoverPending=false;
    if(!hoverPointer||pointerStart||state.isolated||state.explode<=.01||state.fallback)return setHover(null);
    const part=pickPart(hoverPointer.x,hoverPointer.y),changed=setHover(part);
    if(part){
      const bounds=stage.getBoundingClientRect(),tooltip=$('#part-tooltip');
      const x=hoverPointer.x-bounds.left,y=hoverPointer.y-bounds.top;
      let left=x+16,top=y+18;
      if(left+tooltip.offsetWidth>bounds.width-12)left=x-tooltip.offsetWidth-16;
      if(top+tooltip.offsetHeight>bounds.height-12)top=y-tooltip.offsetHeight-18;
      tooltip.style.left=`${Math.max(12,left)}px`;tooltip.style.top=`${Math.max(12,top)}px`;
    }
    return changed;
  }
  function forgetPointer(){hoverPointer=null;hoverPending=false;setHover(null);}
  canvas.addEventListener('pointerdown', e => {
    pointerStart = { id:e.pointerId, x:e.clientX, y:e.clientY, dragged:false };
    stage.classList.add('is-dragging');setHover(null);
  });
  canvas.addEventListener('pointermove',e=>{
    if(pointerStart?.id===e.pointerId&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)pointerStart.dragged=true;
    if(e.pointerType!=='touch'){hoverPointer={x:e.clientX,y:e.clientY};hoverPending=true;}
  });
  canvas.addEventListener('pointerleave',forgetPointer);
  canvas.addEventListener('pointercancel',()=>{pointerStart=null;stage.classList.remove('is-dragging');forgetPointer();});
  window.addEventListener('blur',()=>{pointerStart=null;stage.classList.remove('is-dragging');forgetPointer();});
  window.addEventListener('scroll',forgetPointer,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)forgetPointer();});
  canvas.addEventListener('pointerup', e => {
    const start=pointerStart;pointerStart=null;stage.classList.remove('is-dragging');
    if(e.pointerType!=='touch'){hoverPointer={x:e.clientX,y:e.clientY};hoverPending=true;}
    if (!start || start.id!==e.pointerId || start.dragged || Math.hypot(e.clientX-start.x,e.clientY-start.y)>5 || e.button!==0) return;
    const part=pickPart(e.clientX,e.clientY);
    if(part&&part!==state.selected)selectSystem(part);
  });
  canvas.addEventListener('dblclick',e=>{
    const part=pickPart(e.clientX,e.clientY);
    if(part){selectSystem(part);isolateSelected(true);}
  });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fallback(); });
  reduced.addEventListener('change', () => {
    controls.enableDamping = !reduced.matches;
    state.dirty = true;
  });
  selectSystem(state.selected, false);
  model.isolate(state.isolated?state.selected:null);
  resize();
  let last = performance.now();
  let lastIsolated=state.isolated,lastMotionPart=null,lastMotionTime=-1;
  let lastExplode=-1,lastFocus=-1;
  function loop(now) {
    requestAnimationFrame(loop);
    const elapsed = Math.max(0, (now - last) / 1000), dt = Math.min(elapsed, .1); last = now;
    if (state.fallback || !state.visible || document.hidden) return;
    // Camera transitions follow wall time, including on a slow graphics device.
    const ease = reduced.matches ? 1 : 1 - Math.exp(-elapsed / .19);
    let changed = state.dirty || state.framing || !!state.cameraTween;
    for (const [current, target] of [['currentExplode', 'explode'], ['currentFocus', 'focus']]) {
      if (Math.abs(state[current] - state[target]) > .001) { state[current] += (state[target] - state[current]) * ease; changed = true; }
      else if(state[current]!==state[target]){state[current]=state[target];changed=true;}
    }
    const orbitChanged=controls.update(dt);
    changed=changed||orbitChanged||controls.autoRotate;
    if(state.motion){state.motionTime+=dt;changed=true;}
    // Coalesce pointer movement into one hit test per frame. Moving over the
    // same assembly updates its label without rendering the entire car again.
    let hoverChecked=false;
    if(!changed){if(hoverPending){changed=updateHover();hoverChecked=true;}if(!changed)return;}
    const motionPart=state.motionTime?state.selected:null;
    if(lastMotionTime!==state.motionTime||lastMotionPart!==motionPart){
      model.animate(state.motionTime,motionPart);lastMotionTime=state.motionTime;lastMotionPart=motionPart;
    }
    const poseChanged=lastExplode!==state.currentExplode||lastFocus!==state.currentFocus||lastIsolated!==state.isolated;
    if(poseChanged){
      model.pose(state.currentExplode,state.currentFocus);
      renderer.shadowMap.needsUpdate=true;
      lastExplode=state.currentExplode;lastFocus=state.currentFocus;lastIsolated=state.isolated;
    }
    camera.updateMatrixWorld(true);
    const bounds=model.bounds(null,camera.matrixWorldInverse),center=bounds.getCenter(new T.Vector3()).applyMatrix4(camera.matrixWorld);
    const oldTarget=controls.target.clone();controls.target.lerp(center,ease);
    const shift=controls.target.clone().sub(oldTarget);camera.position.add(shift);
    const centering=shift.lengthSq()>.000001;
    if(state.cameraTween){
      const desired=state.cameraTween.clone().sub(new T.Vector3(0,.65,0)).normalize().multiplyScalar(10);
      const offset=camera.position.clone().sub(controls.target).lerp(desired,ease);
      camera.position.copy(controls.target).add(offset);changed=true;
      if(offset.distanceTo(desired)<.003){camera.position.copy(controls.target).add(desired);state.cameraTween=null;}
      camera.lookAt(controls.target);
    }
    const desiredZoom=state.zoom*fitZoom();
    if(Math.abs(camera.zoom-desiredZoom)>.001){
      camera.zoom=desiredZoom<camera.zoom?desiredZoom:camera.zoom+(desiredZoom-camera.zoom)*ease;
      camera.updateProjectionMatrix();changed=true;
    }
    // Keep rendering until automatic framing settles; it must not depend on a
    // second user action to finish an isolate, view preset or zoom transition.
    state.framing=centering||Math.abs(camera.zoom-desiredZoom)>.001;
    ground.visible=contact.visible=!state.isolated;
    renderer.shadowMap.enabled=!state.isolated;
    // Recheck a stationary pointer after the camera or exploded parts move.
    camera.updateMatrixWorld(true);
    if(!hoverChecked&&(hoverPending||hoverPointer))updateHover();
    if(changed){
      try{renderer.render(scene, camera);}catch(error){fallback(error);return;}
      updateHotspots();
      $('#loader').hidden=true;
      state.dirty = false;
    }
  }
  controls.update();
  stage.dataset.ready = 'true';
  window.__supra = {parts, isolate:isolateSelected, controls, select: selectSystem, explode: setExplode, view: setView, reset, model, renderer, scene, camera, state };
  window.__supraStartup?.finish();
  requestAnimationFrame(loop);
}
selectSystem('body',false);
init().catch(error => { console.error(error); fallback(error); });
