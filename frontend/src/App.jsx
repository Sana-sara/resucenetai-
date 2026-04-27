import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:5000';
const TRIGGER_KEYWORDS = ['help', 'accident', 'fire'];

function App() {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Prevent AI trigger from firing repeatedly for the same text.
  const lastTriggeredText = useRef('');

  const fetchHistory = async () => {
    setIsLoadingHistory(true);

    try {
      const response = await fetch(`${API_BASE_URL}/sos/history`);
      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Could not load SOS history');
      }

      setHistory(result.data || []);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load SOS history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load SOS history once on first page render.
  useEffect(() => {
    fetchHistory();
  }, []);

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => reject(new Error('Location access denied. Please allow location permission.'))
      );
    });

  const sendSOS = async (reason = 'Manual SOS') => {
    setIsSending(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const coords = await getCurrentLocation();
      setLocation(coords);

      const response = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to send emergency alert');
      }

      setSuccessMessage(`Emergency alert sent successfully (${reason})`);
      await fetchHistory();
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong while sending SOS');
    } finally {
      setIsSending(false);
    }
  };

  // AI simulation: trigger SOS if keyword appears in typed text.
  useEffect(() => {
    const lower = inputText.toLowerCase();
    const hasEmergencyKeyword = TRIGGER_KEYWORDS.some((keyword) => lower.includes(keyword));

    if (hasEmergencyKeyword && lower !== lastTriggeredText.current && !isSending) {
      lastTriggeredText.current = lower;
      sendSOS('AI trigger detected');
    }
  }, [inputText, isSending]);

  const mapUrl =
    location.latitude !== null && location.longitude !== null
      ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`
      : null;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f4f6f8',
        padding: '1rem',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: 'min(900px, 96vw)',
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h1 style={{ textAlign: 'center', margin: 0 }}>RescueNet AI+ Emergency Response</h1>

        <input
          type="text"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="Type emergency words: help, accident, fire"
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #d6d6d6',
            fontSize: '1rem',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => sendSOS('Manual SOS')}
            disabled={isSending}
            style={{
              backgroundColor: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem 2.5rem',
              fontSize: '2rem',
              fontWeight: 'bold',
              cursor: isSending ? 'not-allowed' : 'pointer',
            }}
          >
            {isSending ? 'Sending...' : '🚨 SOS'}
          </button>
        </div>

        {isSending && <p style={{ margin: 0 }}>⏳ Sending emergency alert...</p>}
        {successMessage && <p style={{ color: '#1b7f36', margin: 0 }}>✅ {successMessage}</p>}
        {errorMessage && <p style={{ color: '#c62828', margin: 0 }}>❌ {errorMessage}</p>}

        <section>
          <h3 style={{ marginBottom: '0.5rem' }}>Your Current Location</h3>
          <p style={{ margin: 0 }}>
            <strong>Latitude:</strong> {location.latitude ?? 'Not available yet'}
            <br />
            <strong>Longitude:</strong> {location.longitude ?? 'Not available yet'}
          </p>
        </section>

        {mapUrl && (
          <section>
            <h3 style={{ marginBottom: '0.5rem' }}>Map Preview</h3>
            <iframe
              title="Current Location Map"
              width="100%"
              height="250"
              style={{ border: 0, borderRadius: '10px' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapUrl}
            />
          </section>
        )}

        <section>
          <h3 style={{ marginBottom: '0.5rem' }}>SOS History</h3>

          {isLoadingHistory ? (
            <p style={{ margin: 0 }}>Loading history...</p>
          ) : history.length === 0 ? (
            <p style={{ margin: 0 }}>No SOS alerts yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              {history.map((alert) => (
                <li
                  key={alert.id}
                  style={{
                    border: '1px solid #e3e3e3',
                    borderRadius: '8px',
                    padding: '0.75rem',
                  }}
                >
                  <strong>Latitude:</strong> {alert.latitude}
                  <br />
                  <strong>Longitude:</strong> {alert.longitude}
                  <br />
                  <strong>Time:</strong> {new Date(alert.timestamp).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;
