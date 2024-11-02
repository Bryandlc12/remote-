import asyncio
import websockets
import mss
from PIL import Image
from io import BytesIO
import base64
import json

connected_clients = set()

def capture_screen():
    with mss.mss() as sct:
        monitor = sct.monitors[1]
        screenshot = sct.grab(monitor)
        img = Image.frombytes("RGB", screenshot.size, screenshot.rgb)
        buffered = BytesIO()
        img.save(buffered, format="JPEG", quality=50)  # Corrige 'quiality' a 'quality'
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        print("Imagen capturada y convertida a base64")
        return img_str

async def screen_stream(websocket, path):
    connected_clients.add(websocket)
    print("Cliente conectado")
    try:
        while True:
            img_str = capture_screen()
            print("Captura de pantalla realizada, enviando datos...")
            for client in connected_clients:
                await client.send(json.dumps({"type": "image", "data": img_str}))
            await asyncio.sleep(200)
    except websockets.ConnectionClosed:
        print("Conexión cerrada")
    except Exception as e:
        print(f"Error en la captura o envío de pantalla: {e}")
    finally:
        connected_clients.remove(websocket)

start_server = websockets.serve(screen_stream, "localhost", 8765)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
