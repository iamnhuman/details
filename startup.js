// Keep startup failures visible even if an ES module or one of its imports fails.
(() => {
  const stages=[document.querySelector('#hero-stage'),document.querySelector('#stage')];
  const loaders=[document.querySelector('#hero-loader'),document.querySelector('#loader')];
  let timer;
  const complete=()=>stages.every(stage=>stage.dataset.ready);
  const fail=error=>{
    clearTimeout(timer);
    const reason=location.protocol==='file:'?'Откройте проект через локальный сервер: http://127.0.0.1:4173.':error?.name==='TimeoutError'?'Загрузка модели прервалась. Попробуйте ещё раз.':'Не удалось загрузить 3D-модель. Попробуйте ещё раз.';
    stages.forEach((stage,i)=>{
      if(stage.dataset.ready&&stage.dataset.ready!=='fallback'&&stage.dataset.mode!=='fallback')return;
      stage.dataset.loadError='true';stage.setAttribute('aria-busy','false');
      const loader=loaders[i];loader.hidden=false;loader.classList.add('load-error');
      loader.querySelector('[data-load-message]').textContent=reason;
      loader.querySelector('[data-retry]').hidden=false;
      stage.querySelectorAll('button,input').forEach(control=>control.disabled=true);
      loader.querySelector('[data-retry]').disabled=false;
    });
    console.error('Supra startup failed:',error);
  };
  const progress=message=>{
    clearTimeout(timer);timer=setTimeout(()=>fail({name:'TimeoutError'}),30000);
    stages.forEach((stage,i)=>{
      if(!stage.dataset.ready)loaders[i].querySelector('[data-load-message]').textContent=message;
    });
  };
  const finish=()=>{
    stages.forEach(stage=>{if(stage.dataset.ready)stage.setAttribute('aria-busy','false');});
    if(complete())clearTimeout(timer);
  };
  window.__supraStartup={progress,fail,finish};
  document.querySelectorAll('[data-retry]').forEach(button=>button.addEventListener('click',()=>location.reload()));
  const observer=new MutationObserver(finish);
  stages.forEach(stage=>observer.observe(stage,{attributes:true,attributeFilter:['data-ready']}));
  progress('Загружаем 3D-модель…');
  import('./app.mjs').catch(fail);
})();
