import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:5000';
const EMERGENCY_KEYWORDS = ['help', 'accident', 'fire'];

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');

  // Prevent repeated auto-triggering for the same detected text.
  const lastAutoTriggeredText = useRef('');

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sos/history`);
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setHistory(data.alerts || []);
      }
    } catch {
      // Keep silent here so initial load remains simple for beginners.
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => reject(new Error('Location permission denied or unavailable.'))
      );
    });

  const triggerSOS = async (reason = 'Manual SOS button') => {
    setLoading(true);
    setError('');
    setMessage('Getting your live location...');

    try {
      const coords = await getCurrentLocation();
      const payload = {
        ...coords,
        timestamp: new Date().toISOString(),
      };

      setLocation(coords);
      setMessage(`Sending SOS alert... (${reason})`);

      const response = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to send SOS alert.');
      }

      setMessage('SOS Sent ✅ Emergency alert sent successfully.');
      await fetchHistory();
    } catch (err) {
      setError(err.message || 'Something went wrong while sending SOS.');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  // AI simulation: auto-trigger SOS when dangerous keywords are typed.
  useEffect(() => {
    const lowerText = inputText.toLowerCase();
    const hasEmergencyWord = EMERGENCY_KEYWORDS.some((word) => lowerText.includes(word));

    if (hasEmergencyWord && lowerText !== lastAutoTriggeredText.current && !loading) {
      lastAutoTriggeredText.current = lowerText;
      triggerSOS('AI emergency detection');
    }
  }, [inputText, loading]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1>RescueNet AI+ Emergency Console</h1>

      {/* AI simulation input box */}
      <input
        type="text"
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        placeholder="Type emergency words (help, accident, fire)..."
        style={{
          width: 'min(500px, 90vw)',
          padding: '0.75rem 1rem',
          fontSize: '1rem',
          borderRadius: '8px',
          border: '1px solid #ccc',
        }}
      />

      {/* Main SOS trigger */}
      <button
        onClick={() => triggerSOS('Manual SOS button')}
        disabled={loading}
        style={{
          backgroundColor: '#d32f2f',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          padding: '1rem 2.5rem',
          fontSize: '2rem',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Sending...' : '🚨 SOS'}
      </button>

      {message && <p style={{ color: '#0a7d20' }}>{message}</p>}
      {error && <p style={{ color: '#c62828' }}>{error}</p>}

      {location && (
        <section>
          <h3>Your Live Location</h3>
          <p>
            <strong>Latitude:</strong> {location.latitude}
            <br />
            <strong>Longitude:</strong> {location.longitude}
          </p>

          {/* Optional simple map preview using Google Maps iframe */}
          <iframe
            title="Live Location Map"
            width="320"
            height="220"
            style={{ border: 0, borderRadius: '8px' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`}
          />
        </section>
      )}

      <section style={{ width: 'min(700px, 95vw)', marginTop: '1rem' }}>
        <h3>SOS Alert History</h3>

        {history.length === 0 ? (
          <p>No SOS alerts yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
            {history.map((alert) => (
              <li
                key={alert.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                }}
              >
                <strong>Time:</strong> {new Date(alert.timestamp).toLocaleString()}
                <br />
                <strong>Location:</strong> {alert.latitude}, {alert.longitude}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
