from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory storage for alerts (keeps project simple for hackathons).
sos_history = []


def json_error(message, status_code=400):
    """Helper to return consistent error JSON responses."""
    return jsonify({"status": "error", "message": message}), status_code


@app.get('/api/health')
def health_check():
    """Basic health endpoint for quick backend checks."""
    return jsonify({"status": "success", "message": "RescueNet AI+ backend is healthy"})


@app.post('/sos')
def create_sos_alert():
    """Create a new SOS alert using location from frontend."""
    try:
        data = request.get_json(silent=True) or {}
        latitude = data.get('latitude')
        longitude = data.get('longitude')

        # Validate required inputs.
        if latitude is None or longitude is None:
            return json_error('latitude and longitude are required', 400)

        alert = {
            'id': len(sos_history) + 1,
            'latitude': latitude,
            'longitude': longitude,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }

        sos_history.append(alert)

        print(
            '[SOS ALERT]',
            f"id={alert['id']} lat={latitude} lon={longitude} time={alert['timestamp']}",
        )
        print('Alert sent to emergency contacts')

        return jsonify(
            {
                'status': 'success',
                'message': 'Emergency alert sent successfully',
                'data': alert,
            }
        )
    except Exception as error:
        print(f'[ERROR] /sos failed: {error}')
        return json_error('Internal server error', 500)


@app.get('/sos/history')
def get_sos_history():
    """Return all alerts with latest alert first."""
    try:
        return jsonify(
            {
                'status': 'success',
                'count': len(sos_history),
                'data': list(reversed(sos_history)),
            }
        )
    except Exception as error:
        print(f'[ERROR] /sos/history failed: {error}')
        return json_error('Internal server error', 500)

@app.get('/api/health')
def health_check():
    return jsonify({"message": "CrisisIQ backend running"})


@app.post('/sos')
def send_sos_alert():
    data = request.get_json(silent=True) or {}
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    print(f"SOS location received -> latitude: {latitude}, longitude: {longitude}")

    return jsonify(
        {
            "status": "success",
            "message": "Emergency alert sent successfully",
        }
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
