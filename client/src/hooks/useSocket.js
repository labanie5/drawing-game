import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let _socket = null;

export function getSocket() {
  if (!_socket) {
    _socket = io(SERVER_URL, { autoConnect: false });
  }
  return _socket;
}

export function useSocketEvent(event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const fn = (...args) => handlerRef.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [event]);
}

export function connectSocket() {
  const socket = getSocket();
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
