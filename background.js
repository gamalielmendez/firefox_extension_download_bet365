'use strict';

const DEBUG = false

//clase para manejar los intevalos de manera centralizada
class Timer {

  constructor(Interval = 1000, callBack = null) {
    this.Interval = Interval
    this.callBack = callBack
    this.myThread = null
    this.enabled = false
  }

  start() {

    if(DEBUG){
      this.startTime = performance.now();
    }

    this.myThread = setTimeout(this.Tick, this.Interval, this)
    this.enabled = true
  }

  stop() {
    clearTimeout(this.myThread)
    this.enabled = false
  }

  setCallback(callBack = null) { this.callBack = callBack }

  setInterval(Interval = 1000) { this.Interval = Interval }

  isrunning() { return this.enabled }

  async Tick(_this) {

    if (_this.callBack) {
      _this.callBack(_this.Interval)
    }
   
    if(DEBUG){
      const endTime = performance.now();
      const elapsedTime = endTime - _this.startTime;
      console.log(`Tiempo transcurrido: ${elapsedTime} milisegundos`);
    }

    //se reinicia el hilo
    _this.start()

  }

}

// declaracion del objeto que manejara los intervalos
const tick = new Timer(1500, async () => {

  try {

    //obtiene todas las pestañas abiertas en el navegador para recorrerlas
    const tabs = await queryTabs();

    // Filtra las pestañas válidas antes de iniciar las descargas
    const validTabs = tabs.filter(tab => isValidHost(tab.url));

    // Paraleliza las descargas
    Promise.all(validTabs.map(tab => downloadHtml(tab.id)));

    if (!DEBUG) {
      // Limpia el historial de las descargas del navegador una vez que todas las descargas han finalizado
      browser.downloads.erase({});
    }

  } catch (error) {
    console.error(error);
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

//cuncion para ejecutar scripts en la pagina
const getHtmlPage = (tabId) => {
  return new Promise((resolve) => {
    browser.tabs.executeScript(tabId, { code: 'document.documentElement.outerHTML' }, (result) => {
      resolve(result[0])
    })
  })
}

//funcion para descargar el contenido de la pagina
const downloadHtml = (tabId) => {

  return new Promise(async (resolve, reject) => {

    //obtiene el html de la pagina
    const html = await getHtmlPage(tabId)
    //crea el objeto blob del html para descargarlo
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    try {

      //inicia la descarga y almacena el id
      const downloadId = await browser.downloads.download({ url: url, filename: 'pagina.html' })

      //se delara la funcion para manejar la descarga
      const handleDownload = (downloadItem) => {

        if (downloadItem.id === downloadId && downloadItem.state && downloadItem.state.current === "complete") {
          
          browser.downloads.onChanged.removeListener(handleDownload);
          URL.revokeObjectURL(url);
          resolve();

        } else if (downloadItem.id === downloadId && downloadItem.state && downloadItem.state.current === "interrupted") {
          // Descarga interrumpida (fallida)
          browser.downloads.onChanged.removeListener(handleDownload);
          URL.revokeObjectURL(url);
          reject(new Error(`La descarga fue interrumpida. Motivo: ${downloadItem.error}`));

        }

      }

      //se escucha la descarga para manejarla
      browser.downloads.onChanged.addListener(handleDownload);

    } catch (error) {

      // Error al iniciar la descarga
      URL.revokeObjectURL(url);
      reject(error);
    }

  })

}

// arranca el intervalos
tick.start()
