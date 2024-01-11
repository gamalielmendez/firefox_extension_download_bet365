document.addEventListener('DOMContentLoaded', function () {

    const boton = document.getElementById("toggleButton");
    const input = document.getElementById("intervalInput");

    boton.addEventListener("click", () => {
        boton.innerText = (boton.innerText === "Detener") ? "Iniciar" : "Detener";
        saveLocalConfig()
    });

    input.addEventListener("input", () => saveLocalConfig());

    //carga la configuracion
    getLocalConfig()

});

const getLocalConfig = async () => {
    try {

        const response = await browser.runtime.sendMessage({ action: "getConfig" });

        //actualiza la interfaz
        const boton = document.getElementById("toggleButton");
        const input = document.getElementById("intervalInput");

        boton.innerText = (response.ejecutando) ? "Detener" : "Iniciar";
        input.value = response.intervalo;

    } catch (error) {
        console.log(":(")
        console.error("Error al obtener la configuración:", error);
    }
};

const saveLocalConfig = async () => {

    const boton = document.getElementById("toggleButton");
    const input = document.getElementById("intervalInput");

    const config = {
        ejecutando: (boton.innerText === "Detener") ? true : false,
        intervalo: (!input.value) ? 0 : parseInt(input.value)
    }

    browser.runtime.sendMessage({ action: "setConfig", config });

}   