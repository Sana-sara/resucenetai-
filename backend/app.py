from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

history = []

@app.get('/api/health')
def health_check():
    return jsonify({"message": "CrisisIQ backend running"})

@app.post('/sos')
def send_sos_alert():
    data = request.json
    history.append(data)

    return jsonify({
        "status": "success",
        "message": "Emergency alert sent successfully"
    })

@app.get('/sos/history')
def get_history():
    return jsonify({"data": history})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
