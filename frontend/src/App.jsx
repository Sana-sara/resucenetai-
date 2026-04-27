import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:5000';
const TRIGGER_KEYWORDS = ['help', 'accident', 'fire'];

export default function App() {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  const lastTriggeredText = useRef('');

  // Load SOS history from backend.
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sos/history`);
      const data = await res.json();

      // Supports both { data: [...] } and { alerts: [...] } response shapes.
      setHistory(data.data || data.alerts || []);
    } catch {
      setMessage('⚠️ Failed to load history');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Get browser geolocation as a Promise.
  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('No geolocation support'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => reject(new Error('Permission denied'))
      );
    });

  // Send SOS alert to backend.
  const sendSOS = async (reason = 'Manual') => {
    setIsSending(true);
    setMessage('Sending alert...');

    try {
      const coords = await getLocation();
      setLocation(coords);

      const res = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error('Failed request');
      }

      setMessage(`✅ Emergency alert sent successfully (${reason})`);
      await fetchHistory();
    } catch {
      setMessage('❌ Failed to send SOS');
    } finally {
      setIsSending(false);
    }
  };

  // AI auto-trigger if emergency keywords are typed.
  useEffect(() => {
    const text = inputText.toLowerCase();
    const match = TRIGGER_KEYWORDS.some((k) => text.includes(k));

    if (match && text !== lastTriggeredText.current && !isSending) {
      lastTriggeredText.current = text;
      sendSOS('AI trigger');
    }
  }, [inputText, isSending]);

  const hasLocation = location.latitude !== null && location.longitude !== null;
  const mapUrl = hasLocation
    ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`
    : '';

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>RescueNet AI+</h1>

      <input
        placeholder="Type: help, accident, fire"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />

      <br />
      <br />

      <button onClick={() => sendSOS()} disabled={isSending}>
        {isSending ? 'Sending...' : '🚨 SOS'}
      </button>

      <p>{message}</p>

      {hasLocation && (
        <>
          <p>
            Lat: {location.latitude}, Lon: {location.longitude}
          </p>
          <iframe title="Location Map" src={mapUrl} width="300" height="200" />
        </>
      )}

      <h3>History</h3>
      {history.map((h) => (
        <div key={h.id || `${h.latitude}-${h.longitude}-${h.timestamp || ''}`}>
          {h.latitude}, {h.longitude} {h.timestamp ? `(${new Date(h.timestamp).toLocaleString()})` : ''}
        </div>
      ))}
    </div>
  );
}
