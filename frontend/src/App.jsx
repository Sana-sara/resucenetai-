import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:5000';
const TRIGGER_KEYWORDS = ['help', 'accident', 'fire', 'bleeding'];

const hospitals = [
  { name: 'City General Hospital', lat: 17.401, lon: 78.477, beds: 4, type: 'general' },
  { name: 'Apollo Trauma Center', lat: 17.385, lon: 78.486, beds: 6, type: 'trauma' },
  { name: 'Yashoda Emergency Care', lat: 17.412, lon: 78.478, beds: 3, type: 'general' },
  { name: 'Metro Trauma Hospital', lat: 17.39, lon: 78.47, beds: 2, type: 'trauma' },
];

const ambulances = [
  { name: 'Red Cross Ambulance', lat: 17.398, lon: 78.482, phone: '108' },
  { name: 'City Care Ambulance', lat: 17.407, lon: 78.49, phone: '102' },
  { name: 'Apollo Ambulance', lat: 17.382, lon: 78.475, phone: '040-123456' },
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
    if (lower.includes('bleeding') || lower.includes('accident') || lower.includes('fire')) return 'HIGH';
    if (lower.includes('help')) return 'MEDIUM';
    return 'LOW';
  };

  // Explainable AI reason for detected text.
  const getReason = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('bleeding')) return 'Detected bleeding-related emergency';
    if (lower.includes('accident')) return 'Detected accident-related emergency';
    if (lower.includes('fire')) return 'Detected fire emergency';
    if (lower.includes('help')) return 'User requested help';
    return 'No critical keywords detected';
  };

  // Helper: Haversine distance between two geo points (km).
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const earthRadius = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  };

  // Helper: Select best hospital by condition + bed availability + distance.
  const selectBestHospital = (userLat, userLon, text) => {
    const condition = text.toLowerCase();

    const hospitalWithDistance = hospitals.map((hospital) => ({
      ...hospital,
      distance: calculateDistance(userLat, userLon, hospital.lat, hospital.lon),
    }));

    const traumaPriority = condition.includes('bleeding') || condition.includes('accident');
    const fireCase = condition.includes('fire');

    const sorted = [...hospitalWithDistance].sort((a, b) => {
      if (fireCase) {
        return a.distance - b.distance;
      }

      if (traumaPriority) {
        if (a.type !== b.type) {
          return a.type === 'trauma' ? -1 : 1;
        }
      }

      if (a.beds !== b.beds) {
        return b.beds - a.beds;
      }

      return a.distance - b.distance;
    });

    return sorted[0] || null;
  };

  // Select nearest ambulance and estimate ETA by distance.
  const selectNearestAmbulance = (userLat, userLon) => {
    const withDistance = ambulances.map((ambulance) => {
      const distance = calculateDistance(userLat, userLon, ambulance.lat, ambulance.lon);
      const eta = Math.max(3, Math.round(distance * 4)); // simple ETA rule: ~4 min per km

      return {
        ...ambulance,
        distance,
        eta,
      };
    });

    const sorted = [...withDistance].sort((a, b) => a.distance - b.distance);
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

    try {
      coords = await getLocation();
      setLocation(coords);

      const bestHospital = selectBestHospital(coords.latitude, coords.longitude, inputText);
      const bestAmbulance = selectNearestAmbulance(coords.latitude, coords.longitude);

      setRecommendedHospital(bestHospital);
      setNearestAmbulance(bestAmbulance);

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
      setMessage('❌ Failed to send SOS (SMS fallback launched)');
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
  const mapUrl = hasLocation && recommendedHospital
    ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}(You)|${recommendedHospital.lat},${recommendedHospital.lon}(${encodeURIComponent(recommendedHospital.name)})&z=13&output=embed`
    : '';

  const pageStyle = {
    background: 'linear-gradient(140deg, #06080f, #0d1f3a 55%, #123a6a)',
    minHeight: '100vh',
    padding: '20px',
    color: '#f0f6ff',
    fontFamily: 'Arial, sans-serif',
  };

  const containerStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'grid',
    gap: '16px',
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '14px',
    padding: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    backdropFilter: 'blur(4px)',
  };

  const headingStyle = {
    margin: '0 0 10px',
    fontWeight: 'bold',
    fontSize: '1.05rem',
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={{ fontSize: '28px', margin: 0, textAlign: 'center' }}>RescueNet AI+ Emergency Dashboard</h1>

        <div style={cardStyle}>
          <h3 style={headingStyle}>Input + Voice</h3>
          <input
            placeholder="Type: help, accident, fire, bleeding"
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
              border: '1px solid #6f84aa',
              marginBottom: '12px',
              boxSizing: 'border-box',
              background: '#f8fbff',
              color: '#111',
            }}
          />
          <button
            onClick={startVoiceRecognition}
            disabled={isListening}
            style={{
              background: '#c9d6eb',
              color: '#1a2233',
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
          <h3 style={headingStyle}>Priority</h3>
          <p style={{ color: priority === 'HIGH' ? '#ff6b6b' : priority === 'MEDIUM' ? '#f7b267' : '#7ee787', margin: 0, fontWeight: 'bold' }}>
            Priority: {priority}
          </p>
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>Explainable AI Reason</h3>
          <p style={{ margin: 0 }}>Reason: {getReason(inputText)}</p>
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>Suggested Hospital</h3>
          {recommendedHospital ? (
            <p style={{ margin: 0 }}>
              {recommendedHospital.name} ({recommendedHospital.distance.toFixed(2)} km, {recommendedHospital.beds} beds available)
            </p>
          ) : (
            <p style={{ margin: 0 }}>No recommendation yet. Trigger SOS to calculate.</p>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>Nearest Ambulance</h3>
          {nearestAmbulance ? (
            <>
              <p style={{ margin: '0 0 8px' }}>
                🚑 {nearestAmbulance.name}
                <br />
                📍 {nearestAmbulance.distance.toFixed(2)} km away
                <br />
                ⏱️ ETA: {nearestAmbulance.eta} mins
                <br />
                📞 {nearestAmbulance.phone}
              </p>
              <a
                href={`tel:${nearestAmbulance.phone}`}
                style={{
                  display: 'inline-block',
                  background: '#2a3d5f',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                }}
              >
                Call Ambulance
              </a>
            </>
          ) : (
            <p style={{ margin: 0 }}>No ambulance selected yet.</p>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>Location</h3>
          <p style={{ margin: 0 }}>
            Lat: {location.latitude ?? 'N/A'}, Lon: {location.longitude ?? 'N/A'}
          </p>
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>Emergency Dashboard</h3>
          <p style={{ color: '#ff6b6b', margin: '6px 0' }}>High: {stats.HIGH}</p>
          <p style={{ color: '#f7b267', margin: '6px 0' }}>Medium: {stats.MEDIUM}</p>
          <p style={{ color: '#7ee787', margin: '6px 0' }}>Low: {stats.LOW}</p>
        </div>

        <div style={cardStyle}>
          <button
            onClick={() => sendSOS()}
            disabled={isSending}
            style={{
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            {isSending ? 'Sending...' : '🚨 SOS'}
          </button>
          <p style={{ marginTop: '12px' }}>{message}</p>
        </div>

        {hasLocation && recommendedHospital && (
          <div style={cardStyle}>
            <h3 style={headingStyle}>Map</h3>
            <iframe
              title="Location Map"
              src={mapUrl}
              width="100%"
              height="260"
              style={{ border: 0, borderRadius: '8px' }}
            />
          </div>
        )}

        <div style={cardStyle}>
          <h3 style={headingStyle}>History</h3>
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
