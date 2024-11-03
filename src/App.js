import React, { useEffect, useState, useRef } from 'react';
import './App.css';

function App() {
  const [image, setImage] = useState(null); // estado para almacenar la imagen
  const [connectionStatus, setConnectionStatus] = useState('Desconectado'); // estado para la conexión
  const [messages, setMessages] = useState([]); // estado para almacenar nuevos mensajes
  const [newMessage, setNewMessage] = useState(''); // estado para el nuevo mensaje
  const [file, setFile] = useState(null); // estado para almacenar el archivo a enviar
  const [fileName, setFileName] = useState(''); // estado para el nombre del archivo seleccionado

  const ws = useRef(null); // referencia para el WebSocket
  const imageRef = useRef(null); // referencia para la imagen

  useEffect(() => {
    // conectar al servidor WebSocket
    ws.current = new WebSocket('ws://localhost:8765');

    ws.current.onopen = () => {
      console.log('Conexión establecida');
      setConnectionStatus('Conectado');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "image") {
          // Actualizar la imagen cada vez que llega un frame
          setImage(data.data); // Actualiza la imagen desde los datos recibidos
        } else if (data.type === "message") {
          setMessages((prevMessages) => [...prevMessages, { text: data.data, type: 'message', self: false }]);
        } else if (data.type === "file") {
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: `Archivo recibido: ${data.fileName}`, type: 'file', self: false, fileName: data.fileName, fileData: data.fileData }
          ]);
        }
      } catch (error) {
        console.error("Error al procesar el mensaje:", error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('Error en WebSocket:', error);
      setConnectionStatus('Error en la conexión');
    };

    ws.current.onclose = () => {
      console.log('Conexión cerrada');
      setConnectionStatus('Desconectado');
    };

    return () => {
      ws.current.close();
    };
  }, []);

  useEffect(() => {
    const updateFrame = () => {
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "request_next_frame" }));
      }
      requestAnimationFrame(updateFrame);
    };
  
    updateFrame(); // Iniciar la actualización continua
  }, [image]);

  const handleSendMessage = (e) => {
    e.preventDefault(); // Evitar el comportamiento por defecto del formulario
    if (newMessage.trim() !== '' && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "message", data: newMessage })); // Enviar el mensaje
      setMessages((prevMessages) => [...prevMessages, { text: newMessage, type: 'message', self: true }]); // Añadir mensaje enviado
      setNewMessage(''); // Limpiar el campo de entrada
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile); // Guardar el archivo en el estado
      setFileName(selectedFile.name); // Guardar el nombre del archivo
    }
  };

  const handleSendFile = (e) => {
    e.preventDefault();
    if (file && ws.current.readyState === WebSocket.OPEN) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData = reader.result.split(',')[1]; // Obtener el contenido codificado en base64
        ws.current.send(JSON.stringify({ type: "file", fileName: fileName, fileData: fileData }));
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: `Archivo enviado: ${fileName}`, type: 'file', self: true, fileName: fileName, fileData: fileData }
        ]);
        setFile(null); // Limpiar el archivo
        setFileName(''); // Limpiar el nombre del archivo
      };
      reader.readAsDataURL(file); // Leer el archivo como base64
    }
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Pantalla en Vivo</h1>
        <p>Estado de la conexión: {connectionStatus}</p>
        {image ? (
          <div className="image-container">
            <img src={`data:image/jpeg;base64,${image}`} alt="Pantalla en vivo" className="live-image" ref={imageRef} />
          </div>
        ) : (
          <p>Conectando al servidor...</p>
        )}
        <div className="chat-container">
          <h2>Chat</h2>
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.self ? 'sent' : 'received'}`}>
                {msg.type === 'message' ? (
                  msg.text
                ) : (
                  <a href={`data:application/octet-stream;base64,${msg.fileData}`} download={msg.fileName}>
                    Descargar {msg.fileName}
                  </a>
                )}
              </div>
            ))}
          </div>
          <form className="form-container" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
            />
            <button type="submit">Enviar</button>
          </form>
        </div>

        {/* Contenedor para transferir archivos */}
        <div className="file-container">
          <h2>Transferencia de Archivos</h2>
          <label htmlFor="file-upload" className="custom-file-upload">
            Seleccionar archivo
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }} // Ocultamos el input de archivo original
          />
          {fileName && (
            <>
              <p>Archivo seleccionado: {fileName}</p>
              <button onClick={handleSendFile} className="send-file-button">Enviar Archivo</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
