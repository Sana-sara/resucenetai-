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
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
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
          padding: '1rem 2rem',
          fontSize: '2rem',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Sending...' : '🚨 SOS'}
      </button>

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
