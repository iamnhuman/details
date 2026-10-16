const video=document.querySelector('#mechanics-film');
const start=document.querySelector('#film-start');
const error=document.querySelector('#film-error');

if(video&&start){
  const showError=()=>{error.hidden=false;};
  start.addEventListener('click',()=>{error.hidden=true;video.play().catch(showError);});
  video.addEventListener('play',()=>{
    video.parentElement.dataset.started='true';
    error.hidden=true;
    window.__supraHero?.pause(true);
  });
  video.addEventListener('error',showError);
  video.querySelector('source')?.addEventListener('error',showError);
  // A deliberate click starts sound; leaving the film never leaves audio running.
  const observer=new IntersectionObserver(entries=>{
    if(!entries.at(-1).isIntersecting&&!document.fullscreenElement)video.pause();
  });
  observer.observe(video);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
}
