import { useEffect, useState, useRef } from "react";
import "./App.css";
const API_BASE_URL = "https://resucenetai.onrender.com";
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
  const [darkMode, setDarkMode] = useState(false);
  const [trackedAmbulance, setTrackedAmbulance] = useState(null);
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    address: ""
  });
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
      setTrackedAmbulance(bestAmbulance);

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
  // AI auto-trigger if emergency keywords are typed.
  useEffect(() => {
  if (!trackedAmbulance || location.latitude === null) return;

  const interval = setInterval(() => {
    setTrackedAmbulance((prev) => {
      if (!prev) return prev;

      const move = 0.02;
      const threshold = 0.0005;

      const latDiff = location.latitude - prev.lat;
      const lonDiff = location.longitude - prev.lon;

      if (Math.abs(latDiff) < threshold && Math.abs(lonDiff) < threshold) {
        return prev; // stop when reached
      }

      return {
        ...prev,
        lat: prev.lat + latDiff * move,
        lon: prev.lon + lonDiff * move,
      };
    });
  }, 1000);

  return () => clearInterval(interval);
}, [location.latitude, location.longitude, trackedAmbulance]);
  const hasLocation = location.latitude !== null && location.longitude !== null;
  const mapUrl = hasLocation
  ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`
  : '';
  const pageStyle = {
  background: darkMode
    ? 'linear-gradient(135deg, #0f172a, #020617)'
    : 'linear-gradient(135deg, #eef2ff, #f8fafc)',
  color: darkMode ? '#f1f5f9' : '#1e293b',
  minHeight: '100vh',
  padding: '20px',
  fontFamily: 'Inter, Arial, sans-serif',
  transition: 'all 0.3s ease',
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gap: '16px',
  };

  const cardStyle = {
  background: darkMode
    ? 'rgba(30, 41, 59, 0.7)'
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(10px)',
  border: darkMode
    ? '1px solid rgba(255,255,255,0.1)'
    : '1px solid rgba(255,255,255,0.3)',
  borderRadius: '16px',
  padding: '16px',
  boxShadow: darkMode
    ? '0 8px 30px rgba(0,0,0,0.6)'
    : '0 8px 30px rgba(0,0,0,0.08)',
  color: darkMode ? '#f1f5f9' : '#1e293b',
  transition: 'all 0.3s ease',
};

  const headingStyle = {
  margin: '0 0 10px',
  fontWeight: '600',
  fontSize: '1.1rem',
  letterSpacing: '0.3px',
};

  return (
    <div className={darkMode ? 'dark' : ''} style={pageStyle}>
      <div style={containerStyle}>
        <div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '20px'
}}>
  {/* LOGO */}
  <div style={{
    width: '42px',
    height: '42px',
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '20px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
  }}>
    🚑
  </div>

  {/* TEXT */}
  <div>
    <h1 className="logo-text">VitalLink AI</h1>
    <p className="logo-tagline">Connecting life-saving care in seconds</p>
  </div>
      {/* 🌙 DARK MODE BUTTON */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          marginLeft: 'auto',
          padding: '8px 14px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          background: darkMode ? '#f1f5f9' : '#1e293b',
          color: darkMode ? '#0f172a' : '#fff',
          fontWeight: 'bold'
        }}
      >
        {darkMode ? '☀️ Light' : '🌙 Dark'}
      </button>
  </div>   {/*HEADER closes*/}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
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
    padding: '12px',
    borderRadius: '12px',
    border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    marginBottom: '12px',
    boxSizing: 'border-box',
    background: darkMode ? '#1e293b' : '#ffffff',
    color: darkMode ? '#f1f5f9' : '#1e293b',
    outline: 'none',
    transition: 'all 0.2s ease'
  }}
              />
              <button
                onClick={startVoiceRecognition}
                disabled={isListening}
                style={{
  background: darkMode
  ? 'linear-gradient(135deg, #1e3a8a, #0f172a)'
  : 'linear-gradient(135deg, #2563eb, #1e40af)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 600,
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
  transition: 'all 0.2s ease'
}}
onMouseEnter={(e) => {
  e.currentTarget.style.transform = 'scale(1.05)';
  e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 99, 235, 0.4)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = 'scale(1)';
  e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)';
}}
              >
                {isListening ? '🎤 Listening...' : '🎤 Start Voice Input'}
              </button>
            </div>

            <div style={cardStyle}>
              <h3 style={headingStyle}>Priority</h3>
              <p
                style={{
                  color: priority === 'HIGH' ? '#ef4444' : priority === 'MEDIUM' ? '#f59e0b' : '#16a34a',
                  margin: 0,
                  fontWeight: 'bold',
                }}
              >
                Priority: {priority}
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={headingStyle}>AI Reason</h3>
              <p style={{ margin: 0 }}>Reason: {getReason(inputText)}</p>
            </div>

            <div style={cardStyle}>
              <h3 style={headingStyle}>SOS</h3>
              <button
                onClick={() => sendSOS()}
                disabled={isSending}
                style={{
  background: darkMode
  ? 'linear-gradient(135deg, #1e3a8a, #0f172a)'
  : 'linear-gradient(135deg, #2563eb, #1e40af)',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  padding: '12px 24px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '1rem',
  boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
  transition: 'all 0.2s ease',
}}
onMouseEnter={(e) => {
  e.currentTarget.style.transform = 'scale(1.06)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = 'scale(1)';
}}
              >
                {isSending ? 'Sending...' : '🚨 SOS'}
              </button>
              <p style={{ marginTop: '12px' }}>{message}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={cardStyle}>
              <h3 style={headingStyle}>Suggested Hospital</h3>
              {recommendedHospital ? (
                <p style={{ margin: 0 }}>
                  {recommendedHospital.name} ({recommendedHospital?.distance?.toFixed(2)} km, {recommendedHospital.beds}{' '}
                  beds available)
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
  onClick={(e) => {
    if (!window.confirm("🚑 Call ambulance now?")) {
      e.preventDefault();
    }
  }}
  style={{
    display: 'inline-block',
    background: '#2563eb',
    color: '#fff',
    textDecoration: 'none',
    padding: '10px 16px',
    borderRadius: '12px',
    fontWeight: 'bold',
    marginTop: '10px',
  }}
>
  📞 Call Ambulance
</a>

                </>
              ) : (
                <p style={{ margin: 0 }}>No ambulance selected yet.</p>
              )}
            </div>

            <div style={cardStyle}>
              <h3 style={headingStyle}>Location</h3>
              <p>
                📍 {location?.address || "Fetching address..."}
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={headingStyle}>Emergency Stats</h3>
              <p style={{ color: '#ef4444', margin: '6px 0' }}>High: {stats.HIGH}</p>
              <p style={{ color: '#f59e0b', margin: '6px 0' }}>Medium: {stats.MEDIUM}</p>
              <p style={{ color: '#16a34a', margin: '6px 0' }}>Low: {stats.LOW}</p>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>Result Summary</h3>
          <p style={{ margin: '4px 0' }}>
            <strong>Priority:</strong> <span style={{ color: priority === 'HIGH' ? '#ef4444' : priority === 'MEDIUM' ? '#f59e0b' : '#16a34a' }}>{priority}</span>
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Hospital:</strong>{' '}
            {recommendedHospital
              ? `${recommendedHospital.name} (${recommendedHospital?.distance?.toFixed(2)} km, ${recommendedHospital.beds} beds)`
              : 'N/A'}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Ambulance:</strong>{' '}
            {nearestAmbulance ? `${nearestAmbulance.name} (ETA ${nearestAmbulance.eta} mins)` : 'N/A'}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Location:</strong> {location.latitude ?? 'N/A'}, {location.longitude ?? 'N/A'}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>AI Reason:</strong> {getReason(inputText)}
          </p>
        </div>

        {hasLocation && recommendedHospital && (
          <div style={cardStyle}>
            <h3 style={headingStyle}>Map</h3>
    {trackedAmbulance && (
  <div style={{
    marginBottom: '12px',
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.2)',
    fontWeight: '600',
    color: '#1e3a8a',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  }}>
    🚑 Ambulance is on the way <br />
    📍 Live: {trackedAmbulance.lat.toFixed(4)}, {trackedAmbulance.lon.toFixed(4)} <br />
    ⏱ ETA: {nearestAmbulance?.eta} mins
  </div>
)}
            <iframe
  src={mapUrl}
  width="100%"
  height="300"
  style={{
  border: 0,
  borderRadius: '14px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
}}
/>
          <a
  href={`https://www.google.com/maps/dir/${location.latitude},${location.longitude}/${recommendedHospital.lat},${recommendedHospital.lon}`}
  target="_blank"
  style={{
    display: 'inline-block',
    marginTop: '10px',
    padding: '10px 16px',
    background: '#1976d2',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold'
  }}
>
  📍 Navigate to Hospital
</a>
  
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