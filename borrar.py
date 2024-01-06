import os
import time
import shutil

# Ruta de la carpeta de descargas
descargas_path = r'C:\Users\jose9\OneDrive\Documentos\descargas'

# Función para borrar el contenido de la carpeta
def borrar_contenido_carpeta(ruta):
    for archivo in os.listdir(ruta):
        archivo_path = os.path.join(ruta, archivo)
        try:
            if os.path.isfile(archivo_path) or os.path.islink(archivo_path):
                os.unlink(archivo_path)
            elif os.path.isdir(archivo_path):
                shutil.rmtree(archivo_path)
        except Exception as e:
            print(f'Error al borrar {archivo_path}: {e}')

# Bucle principal
while True:
    # Borra el contenido de la carpeta de descargas
    try:
        borrar_contenido_carpeta(descargas_path)
    except Exception as e:
        print(f'Error al borrar contenido de la carpeta: {e}')
    
    # Espera 1 minuto
    time.sleep(60)
