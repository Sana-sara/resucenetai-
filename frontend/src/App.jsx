import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:5000';
const TRIGGER_KEYWORDS = ['help', 'accident', 'fire'];
const hospitals = [
  { name: 'Apollo', distance: 2, availability: 'low' },
  { name: 'Yashoda', distance: 5, availability: 'high' },
  { name: 'Care Hospital', distance: 3, availability: 'medium' },
];
const ambulances = [
  { name: 'Red Cross Ambulance', distance: 1.5, phone: '108' },
  { name: 'City Care Ambulance', distance: 2.5, phone: '102' },
  { name: 'Apollo Ambulance', distance: 3, phone: '040-123456' },
];
const hospitalPins = [
  { name: 'Apollo', lat: 17.385, lon: 78.486 },
  { name: 'Yashoda', lat: 17.412, lon: 78.478 },
];

export default function App() {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [priority, setPriority] = useState('LOW');
  const [stats, setStats] = useState({ HIGH: 0, MEDIUM: 0, LOW: 0 });
  const [isListening, setIsListening] = useState(false);
  const [recommendedHospital, setRecommendedHospital] = useState(null);
  const [nearestAmbulance, setNearestAmbulance] = useState(null);
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

  // Detect AI severity priority from user text.
  const detectPriority = (text) => {
    const lower = text.toLowerCase();

    if (lower.includes('accident') || lower.includes('fire')) {
      return 'HIGH';
    }

    if (lower.includes('help')) {
      return 'MEDIUM';
    }

    return 'LOW';
  };

  // Explainable AI reason for detected text.
  const getReason = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('accident')) return 'Detected accident-related emergency';
    if (lower.includes('fire')) return 'Detected fire emergency';
    if (lower.includes('help')) return 'User requested help';
    return 'No critical keywords detected';
  };

  // Select best hospital: HIGH availability first, then nearest by distance.
  const selectBestHospital = () => {
    const availabilityRank = { high: 3, medium: 2, low: 1 };

    const sorted = [...hospitals].sort((a, b) => {
      const rankDiff = availabilityRank[b.availability] - availabilityRank[a.availability];
      if (rankDiff !== 0) return rankDiff;
      return a.distance - b.distance;
    });

    return sorted[0] || null;
  };

  // Select nearest ambulance (smallest distance).
  const selectNearestAmbulance = () => {
    const sorted = [...ambulances].sort((a, b) => a.distance - b.distance);
    return sorted[0] || null;
  };

  // Start voice input using Web Speech API (Chrome/Edge: webkitSpeechRecognition).
  const startVoiceRecognition = () => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

    if (!SpeechRecognition) {
      setMessage('⚠️ Voice recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setPriority(detectPriority(transcript));
    };

    recognition.onerror = () => {
      setMessage('⚠️ Could not capture voice. Please try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

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
    let coords = null;

    setIsSending(true);
    setMessage('Sending alert...');
    setStats((prev) => ({
      ...prev,
      [priority]: prev[priority] + 1,
    }));
    setRecommendedHospital(selectBestHospital());
    setNearestAmbulance(selectNearestAmbulance());

    try {
      coords = await getLocation();
      setLocation(coords);

      if (!navigator.onLine) {
        throw new Error('Offline mode detected');
      }

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
      const fallbackCoords = coords || location;
      if (fallbackCoords?.latitude !== null && fallbackCoords?.longitude !== null) {
        const smsBody = `HELP! Emergency at Lat: ${fallbackCoords.latitude}, Lon: ${fallbackCoords.longitude}`;
        window.open(`sms:108?body=${encodeURIComponent(smsBody)}`);
      }
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
    ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}(You)|${hospitalPins
        .map((h) => `${h.lat},${h.lon}(${h.name})`)
        .join('|')}&z=15&output=embed`
    : '';

  const cardStyle = {
    background: 'white',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh', padding: '20px' }}>
      <div
        style={{
          maxWidth: '650px',
          margin: '0 auto',
          padding: '20px',
          textAlign: 'center',
          color: '#2f2f2f',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>RescueNet AI+</h1>

        <div style={cardStyle}>
          <h3 style={{ fontWeight: 'bold', marginTop: 0 }}>🚨 Emergency Dashboard</h3>
          <p style={{ color: 'red', margin: '6px 0' }}>High: {stats.HIGH}</p>
          <p style={{ color: 'orange', margin: '6px 0' }}>Medium: {stats.MEDIUM}</p>
          <p style={{ color: 'green', margin: '6px 0' }}>Low: {stats.LOW}</p>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontWeight: 'bold', marginTop: 0 }}>Input + Voice</h3>
          <input
            placeholder="Type: help, accident, fire"
            value={inputText}
            onChange={(e) => {
              const newText = e.target.value;
              setInputText(newText);
              setPriority(detectPriority(newText));
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #cfcfcf',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={startVoiceRecognition}
            disabled={isListening}
            style={{
              background: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              cursor: 'pointer',
            }}
          >
            {isListening ? '🎤 Listening...' : '🎤 Start Voice Input'}
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontWeight: 'bold', marginTop: 0 }}>Priority</h3>
          <p
            style={{
              color: priority === 'HIGH' ? 'red' : priority === 'MEDIUM' ? 'orange' : 'green',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            Priority: {priority}
          </p>
          <p style={{ marginTop: '8px' }}>Reason: {getReason(inputText)}</p>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontWeight: 'bold', marginTop: 0 }}>Hospital + Ambulance</h3>
          {recommendedHospital && (
            <p style={{ margin: '6px 0' }}>
              Recommended Hospital: {recommendedHospital.name} (
              {recommendedHospital.availability.charAt(0).toUpperCase() + recommendedHospital.availability.slice(1)}{' '}
              availability)
            </p>
          )}
          {nearestAmbulance && (
            <p style={{ margin: '6px 0' }}>
              🚑 Nearest Ambulance: {nearestAmbulance.name}
              <br />
              📞 Phone: {nearestAmbulance.phone}
              <br />
              📍 Distance: {nearestAmbulance.distance} km
            </p>
          )}
          {nearestAmbulance && (
            <a
              href={`tel:${nearestAmbulance.phone}`}
              style={{
                display: 'inline-block',
                background: '#e0e0e0',
                color: '#222',
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                marginTop: '8px',
              }}
            >
              Call Ambulance
            </a>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontWeight: 'bold', marginTop: 0 }}>SOS</h3>
          <button
            onClick={() => sendSOS()}
            disabled={isSending}
            style={{
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
            }}
          >
            {isSending ? 'Sending...' : '🚨 SOS'}
          </button>
          <p style={{ marginTop: '12px' }}>{message}</p>
        </div>

        {hasLocation && (
          <div style={cardStyle}>
            <h3 style={{ fontWeight: 'bold', marginTop: 0 }}>Map</h3>
            <p style={{ margin: '6px 0' }}>
              Lat: {location.latitude}, Lon: {location.longitude}
            </p>
            <iframe
              title="Location Map"
              src={mapUrl}
              width="100%"
              height="240"
              style={{ border: 0, borderRadius: '8px' }}
            />
            <div style={{ marginTop: '10px' }}>
              <strong>Nearby Hospitals:</strong>
              <div>- Apollo</div>
              <div>- Yashoda</div>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <h3 style={{ fontWeight: 'bold', marginTop: 0 }}>History</h3>
          {history.map((h) => (
            <div key={h.id || `${h.latitude}-${h.longitude}-${h.timestamp || ''}`} style={{ marginBottom: '6px' }}>
              {h.latitude}, {h.longitude} {h.timestamp ? `(${new Date(h.timestamp).toLocaleString()})` : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
