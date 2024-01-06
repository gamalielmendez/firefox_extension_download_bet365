'use strict';

//clase para manejar los intevalos de manera centralizada
class Timer{

  constructor(Interval=1000,callBack=null){
      this.Interval=Interval
      this.callBack=callBack
      this.myThread=null
      this.enabled=false
  }

  start(){
      this.myThread=setTimeout(this.Tick,this.Interval,this)
      this.enabled=true
  }

  stop(){
      clearTimeout(this.myThread)
      this.enabled=false
  }

  setCallback(callBack=null){ this.callBack=callBack }

  setInterval(Interval=1000){ this.Interval=Interval }

  isrunning(){ return this.enabled }

  async Tick(_this){
      
      if(_this.callBack){
          await _this.callBack(_this.Interval) 
      }  

      //se reinicia el hilo
      _this.start() 

  }
  
}

// declaracion del objeto que manejara los intervalos
const tick= new Timer(1500, async ()=>{ 

  try {
    
    //obtiene todas las pestañas abiertas en el navegador para recorrerlas
    const tabs= await queryTabs(); 

    for (let i = 0; i < tabs.length; i++) {
      
      const tab=tabs[i]

      //solo ejecuta la descarga si es un host valido
      if(isValidHost(tab.url)){

        //inicia la descarga del contrenido de la pagina
        await downloadHtml(tab.id)
        //limpia el historial de las descargas del navegador
        await browser.downloads.erase({});

      }

    }

  } catch (error) {
    console.error("Error en la consulta de pestañas:", error);
  }
  
})

//funcion para obtener las pestañas del navegador de manera asincrona
function queryTabs() {
  return new Promise((resolve, reject) => {
    browser.tabs.query({}, tabs => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError));
      } else {
        resolve(tabs);
      }
    });
  });
}

//funcion para validar los host disponibles
const isValidHost = (url) => url.includes('bet365')

//funcion para descargar el contenido de la pagina
const downloadHtml =  (tabId) =>{

  return new Promise((resolve ,reject)=>{

    browser.tabs.executeScript(tabId, { code: 'document.documentElement.outerHTML' }, function (result) {

      //parsea el resultado de la pagina para su posterior descarga
      const html = result[0];
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      //descarga y sobre escribe el archivo
      browser.downloads.download({ url: url, filename: 'pagina.html',conflictAction: 'overwrite', })
      .then(downloadId => {

          browser.downloads.onChanged.addListener(function onChanged(downloadItem) {
            
            if (downloadItem.id === downloadId && downloadItem.state && downloadItem.state.current === "complete") {
              // Dejar de escuchar una vez que la descarga ha finalizado
              browser.downloads.onChanged.removeListener(onChanged); 
              //limpia el objeto creado una vez descargado
              URL.revokeObjectURL(url);
              //resuelve la promesa para que seguir en el ciclo
              resolve();
            }

          });
     
      })

    });

  })

}

// arranca el intervalos
tick.start()
