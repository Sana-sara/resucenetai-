import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSOSClick = async () => {
    setLoading(true);
    setMessage('Sending emergency alert...');

    try {
      const response = await fetch('http://127.0.0.1:5000/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setMessage(data.message || 'Request completed.');
    } catch (error) {
      setMessage('Could not connect to backend. Please make sure Flask is running.');
    } finally {
      setLoading(false);
    }
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
        🚨 SOS
      </button>

      {message && <p>{message}</p>}
    </main>
  );
}

export default App;
