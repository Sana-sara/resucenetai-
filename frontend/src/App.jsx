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
        reject(new Error('Geolocation is not supported by your browser.'));
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

import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  const handleSOSClick = async () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by this browser.');
      return;
    }

    setLoading(true);
    setMessage('Getting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setLocation(coords);
        setMessage('Sending emergency alert...');

        try {
          const response = await fetch('http://127.0.0.1:5000/sos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(coords),
          });

          const data = await response.json();
          setMessage(data.message || 'Request completed.');
        } catch (error) {
          setMessage('Could not connect to backend. Please make sure Flask is running.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setMessage('Location permission denied or unavailable.');
        setLoading(false);
      }
    );
  };

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
      }}
    >
      <h1>RescueNet AI+</h1>

      <button
        onClick={handleSOSClick}
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
          padding: '1rem 2rem',
          fontSize: '2rem',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
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
      {message && <p>{message}</p>}

      {location && (
        <p>
          <strong>Latitude:</strong> {location.latitude} <br />
          <strong>Longitude:</strong> {location.longitude}
        </p>
      )}
    </main>
  );
}

export default App;
