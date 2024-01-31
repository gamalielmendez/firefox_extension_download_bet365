'use strict';

const DEBUG = false

//clase para manejar los intevalos de manera centralizada
class Timer {
  constructor(interval = 1000, callBack = null) {
    this.interval = interval;
    this.callBack = callBack;
    this.enabled = false;
    this.timerId = null;
    this.startTime = 0;
  }

  start() {
    if (this.enabled) return; // Evita iniciar un nuevo temporizador si ya está en funcionamiento
    this.enabled = true;
    this.startTime = performance.now(); // Registra el tiempo de inicio

    this.tick(); // Llama a tick directamente en lugar de setTimeout
  }

  stop() {
    clearTimeout(this.timerId);
    this.enabled = false;
  }

  setCallback(callBack) {
    this.callBack = callBack;
  }

  setInterval(interval) {
    this.interval = interval;
    if (this.enabled) {
      this.stop();
      this.start(); // Reinicia el temporizador con el nuevo intervalo si ya está en funcionamiento
    }
  }

  isRunning() {
    return this.enabled;
  }

  async tick() {
    if (this.callBack) {
      this.callBack(this.interval);
    }

    if (DEBUG) {
      const endTime = performance.now();
      const elapsedTime = endTime - this.startTime;
      console.log(`Tiempo transcurrido: ${elapsedTime} milisegundos`);
      this.startTime = performance.now();
    }

    if (this.enabled) {
      // Solo reinicia el temporizador si aún está habilitado
      this.timerId = setTimeout(this.tick.bind(this), this.interval);
    }
  }
}

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

    //crea el objeto blob del html para descargarlo
    let blob = new Blob([await getHtmlPage(tabId)], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    try {

      //inicia la descarga y almacena el id
      const downloadId = await browser.downloads.download({ url: url, filename: 'pagina.html' })

      //se delara la funcion para manejar la descarga
      const handleDownload = (downloadItem) => {

        if (downloadItem.id === downloadId && downloadItem.state && downloadItem.state.current === "complete") {

          browser.downloads.onChanged.removeListener(handleDownload);
          URL.revokeObjectURL(url);
          blob=null
          resolve();

        } else if (downloadItem.id === downloadId && downloadItem.state && downloadItem.state.current === "interrupted") {
          // Descarga interrumpida (fallida)
          browser.downloads.onChanged.removeListener(handleDownload);
          URL.revokeObjectURL(url);
          blob=null
          resolve()

        }

      }

      //se escucha la descarga para manejarla
      browser.downloads.onChanged.addListener(handleDownload);

    } catch (error) {

      // Error al iniciar la descarga
      URL.revokeObjectURL(url);
      blob=null
      reject(error);
    }

  })

}

const setConfig = ({ ejecutando = true, intervalo = 1500 }) => {

  return new Promise((resolve) => {
    browser.storage.local.set({ 'config': { ejecutando, intervalo } }, function () {
      resolve({ ejecutando, intervalo })
    });
  })

}

const getConfig = () => {
  return new Promise((resolve, reject) => {
    browser.storage.local.get('config').then(result => {
      const config = result.config || { ejecutando: true, intervalo: 1500 };
      resolve(config);
    }).catch(error => {
      resolve({ ejecutando: true, intervalo: 1500 });
    });
  });
};

// declaracion del objeto que manejara los intervalos
const tick = new Timer(1500, async () => {

  try {

    //obtiene todas las pestañas abiertas en el navegador para recorrerlas
    const tabs = await queryTabs()

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

//obtiene la configuracion de la extencion
let Config = {}
getConfig().then((conf) => {

  Config = conf;

  if (!Config.ejecutando) {
    return
  }

  //establece el intervalo de la configuracion
  tick.setInterval(Config.intervalo)
  // arranca el intervalos
  tick.start()

})

// Escucha los mensajes enviados desde otros scripts o extensiones
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {

  switch (request.action) {
    case "getConfig":

      //se obtiene la configuracion
      return await getConfig();

    case "setConfig":

      //se almacena la configuracion
      await setConfig(request.config);

      //se establece el intervalo
      tick.setInterval(request.config.intervalo)

      //se apaga o activa el intervalo dependiendo de la configuracion
      if (!request.config.ejecutando && tick.isRunning()) {
        tick.stop()
      } else if (request.config.ejecutando && !tick.isRunning()) {
        tick.start()
      }

      return true
  }
});