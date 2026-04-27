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
  const [loadingMessage, setLoadingMessage] = useState('');

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
    setLoadingMessage('Getting your location and sending SOS...');

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
      setLoadingMessage('');
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
    <>
      <style>{`
        :root {
          color-scheme: dark;
        }

        .app-shell {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #05070f 0%, #0b1d3a 45%, #12386b 100%);
          font-family: Inter, Segoe UI, Roboto, Arial, sans-serif;
          color: #e7eefc;
        }

        .main-card {
          width: min(960px, 96vw);
          background: rgba(10, 17, 35, 0.9);
          border: 1px solid rgba(110, 156, 255, 0.25);
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          gap: 14px;
          backdrop-filter: blur(8px);
        }

        .panel {
          background: rgba(14, 26, 54, 0.75);
          border: 1px solid rgba(143, 178, 255, 0.2);
          border-radius: 12px;
          padding: 14px;
        }

        .title {
          text-align: center;
          margin: 0;
          letter-spacing: 0.3px;
        }

        .input-label {
          display: block;
          font-size: 0.95rem;
          margin-bottom: 8px;
          color: #9fc0ff;
          font-weight: 600;
        }

        .ai-input {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(151, 186, 255, 0.45);
          background: #081123;
          color: #dbe9ff;
          font-size: 1rem;
          outline: none;
          transition: box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .ai-input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.25);
        }

        @keyframes placeholderPulse {
          0% { opacity: 0.45; }
          50% { opacity: 1; }
          100% { opacity: 0.45; }
        }

        .ai-input::placeholder {
          color: #8fb0f1;
          animation: placeholderPulse 2s ease-in-out infinite;
        }

        .sos-wrap {
          display: flex;
          justify-content: center;
        }

        @keyframes sosPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 70, 70, 0.6); }
          70% { box-shadow: 0 0 0 20px rgba(255, 70, 70, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 70, 70, 0); }
        }

        .sos-button {
          background: linear-gradient(180deg, #ff4d4d, #d41414);
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 16px 42px;
          font-size: 2rem;
          font-weight: 800;
          cursor: pointer;
          animation: sosPulse 2s infinite;
          transition: transform 0.2s ease, filter 0.2s ease;
        }

        .sos-button:hover {
          transform: translateY(-2px) scale(1.02);
          filter: brightness(1.08);
        }

        .sos-button:disabled {
          cursor: not-allowed;
          opacity: 0.8;
          animation: none;
        }

        .status {
          margin: 0;
          font-weight: 600;
        }

        .status-loading { color: #facc15; }
        .status-success { color: #4ade80; }
        .status-error { color: #f87171; }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(250, 204, 21, 0.35);
          border-top-color: #facc15;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          vertical-align: -3px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .map-frame {
          width: 100%;
          height: 260px;
          border: 0;
          border-radius: 12px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
        }

        .history-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 10px;
          max-height: 260px;
          overflow-y: auto;
        }

        .history-item {
          border: 1px solid rgba(143, 178, 255, 0.25);
          border-radius: 10px;
          padding: 10px;
          background: rgba(7, 14, 30, 0.6);
        }
      `}</style>

      <main className="app-shell">
        <div className="main-card">
          <h1 className="title">RescueNet AI+ Emergency Response</h1>

          <section className="panel">
            <label className="input-label">AI Emergency Detection</label>
            <input
              type="text"
              className="ai-input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Type emergency words: help, accident, fire"
            />
          </section>

          <div className="sos-wrap">
            <button className="sos-button" onClick={() => sendSOS('Manual SOS')} disabled={isSending}>
              {isSending ? 'Sending...' : '🚨 SOS'}
            </button>
          </div>

          <section className="panel">
            {loadingMessage && (
              <p className="status status-loading">
                <span className="spinner" />
                {loadingMessage}
              </p>
            )}
            {successMessage && <p className="status status-success">✅ {successMessage}</p>}
            {errorMessage && <p className="status status-error">❌ {errorMessage}</p>}
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>📍 Your Current Location</h3>
            <p style={{ margin: 0 }}>
              <strong>Latitude:</strong> {location.latitude ?? 'Not available yet'}
              <br />
              <strong>Longitude:</strong> {location.longitude ?? 'Not available yet'}
            </p>
          </section>

          {mapUrl && (
            <section className="panel">
              <h3 style={{ marginTop: 0 }}>Map Preview</h3>
              <iframe
                title="Current Location Map"
                className="map-frame"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapUrl}
              />
            </section>
          )}

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>SOS History</h3>

            {isLoadingHistory ? (
              <p className="status status-loading">
                <span className="spinner" />
                Loading history...
              </p>
            ) : history.length === 0 ? (
              <p style={{ margin: 0 }}>No SOS alerts yet.</p>
            ) : (
              <ul className="history-list">
                {history.map((alert) => (
                  <li key={alert.id} className="history-item">
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
    </>
  );
}

export default App;
