import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:5000';
const EMERGENCY_KEYWORDS = ['help', 'accident', 'fire'];

function App() {
  const [message, setMessage] = useState('Ready');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inputText, setInputText] = useState('');

  // Prevent repeated auto-triggering for the same exact text.
  const lastAutoTriggeredText = useRef('');

  const fetchHistory = async () => {
    setHistoryLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/sos/history`);
      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Could not load SOS history.');
      }

      setHistory(data.alerts || []);
    } catch (err) {
      setError(err.message || 'Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load history as soon as the page opens.
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

      // Frontend calls Flask backend at 127.0.0.1:5000.
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
      setMessage('SOS failed');
    } finally {
      setLoading(false);
    }
  };

  // AI simulation: if user types emergency keywords, trigger SOS automatically.
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
        backgroundColor: '#f7f8fa',
      }}
    >
      <h1>RescueNet AI+ Emergency Console</h1>

      {/* AI keyword box */}
      <input
        type="text"
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        placeholder="Type: help, accident, fire"
        style={{
          width: 'min(500px, 90vw)',
          padding: '0.75rem 1rem',
          fontSize: '1rem',
          borderRadius: '8px',
          border: '1px solid #ccc',
          backgroundColor: '#fff',
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
          boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
        }}
      >
        {loading ? 'Sending...' : '🚨 SOS'}
      </button>

      {/* Status panel */}
      <section
        style={{
          width: 'min(700px, 95vw)',
          backgroundColor: '#fff',
          border: '1px solid #e6e6e6',
          borderRadius: '10px',
          padding: '1rem',
        }}
      >
        <h3>Status</h3>
        {loading && <p>⏳ Loading: sending your SOS alert...</p>}
        {!loading && <p>ℹ️ {message}</p>}
        {error && <p style={{ color: '#c62828' }}>❌ Error: {error}</p>}
      </section>

      {/* Live location panel */}
      <section
        style={{
          width: 'min(700px, 95vw)',
          backgroundColor: '#fff',
          border: '1px solid #e6e6e6',
          borderRadius: '10px',
          padding: '1rem',
        }}
      >
        <h3>Your Live Location</h3>
        <p>
          <strong>Latitude:</strong>{' '}
          {location.latitude !== null ? location.latitude : 'Not available yet'}
          <br />
          <strong>Longitude:</strong>{' '}
          {location.longitude !== null ? location.longitude : 'Not available yet'}
        </p>
      </section>

      {/* History panel */}
      <section
        style={{
          width: 'min(700px, 95vw)',
          backgroundColor: '#fff',
          border: '1px solid #e6e6e6',
          borderRadius: '10px',
          padding: '1rem',
        }}
      >
        <h3>SOS Alert History</h3>
        {historyLoading ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
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
