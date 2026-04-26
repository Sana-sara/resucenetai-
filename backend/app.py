from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


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
