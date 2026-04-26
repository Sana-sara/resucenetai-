from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.get('/api/health')
def health_check():
    return jsonify({"message": "CrisisIQ backend running"})


@app.post('/sos')
def send_sos_alert():
    return jsonify(
        {
            "status": "success",
            "message": "Emergency alert sent successfully",
        }
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
