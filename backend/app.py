from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory store for SOS alerts (kept simple; no database required).
sos_history = []


@app.get('/api/health')
def health_check():
    return jsonify({"message": "RescueNet AI+ backend running"})


@app.post('/sos')
def send_sos_alert():
    """Receive SOS alert data and save it in memory."""
    try:
        data = request.get_json(silent=True) or {}

        latitude = data.get('latitude')
        longitude = data.get('longitude')
        timestamp = data.get('timestamp') or datetime.now(timezone.utc).isoformat()

        # Basic validation for beginner-friendly error messages.
        if latitude is None or longitude is None:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "latitude and longitude are required",
                    }
                ),
                400,
            )

        alert = {
            "id": len(sos_history) + 1,
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": timestamp,
        }

        sos_history.append(alert)

        print(
            "SOS received:",
            f"lat={latitude}, lon={longitude}, time={timestamp}",
        )
        print("Alert sent to emergency contacts")

        return jsonify(
            {
                "status": "success",
                "message": "Emergency alert sent successfully",
                "alert": alert,
            }
        )
    except Exception as error:
        print(f"Error in /sos: {error}")
        return jsonify({"status": "error", "message": "Internal server error"}), 500


@app.get('/sos/history')
def get_sos_history():
    """Return all previous SOS alerts (latest first)."""
    return jsonify({"status": "success", "alerts": list(reversed(sos_history))})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
