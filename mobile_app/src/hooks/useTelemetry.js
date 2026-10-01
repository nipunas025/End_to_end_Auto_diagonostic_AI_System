import { useState, useEffect } from 'react';
import Paho from 'paho-mqtt';

export const useTelemetry = (brokerUrl, port, topic) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('CONNECTING...');

  useEffect(() => {
    // Client ID එක අහඹු ලෙස සෑදීම (Reconnection conflicts වළක්වා ගැනීමට)
    const clientId = `mobile_app_${Math.random().toString(16).substr(2, 8)}`;
    const client = new Paho.Client(brokerUrl, Number(port), "/", clientId);

    client.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        setStatus('OFFLINE');
        console.error("Connection Lost:", responseObject.errorMessage);
      }
    };

    client.onMessageArrived = (message) => {
      try {
        const parsed = JSON.parse(message.payloadString);
        setData(parsed);
      } catch (e) {
        console.error("Data Parse Error:", e);
      }
    };

    client.connect({
      onSuccess: () => {
        setStatus('ONLINE');
        client.subscribe(topic);
      },
      onFailure: (err) => {
        setStatus('ERROR');
        console.error("Connection Failed:", err.errorMessage);
      },
      useSSL: false
    });

    return () => {
      if (client.isConnected()) {
        client.disconnect();
      }
    };
  }, [brokerUrl, port, topic]);

  return { data, status };
};