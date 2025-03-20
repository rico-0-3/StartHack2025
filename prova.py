import json
from flask import Flask, request, jsonify
from flask_cors import CORS 
import requests
import os
import pandas as pd

app = Flask(__name__)
CORS(app)
FILE_PATH = "registrazioni.json"

def get_response(query: str):
    url = ("https://idchat-api-containerapp01-dev.orangepebble-16234c4b."
           "switzerlandnorth.azurecontainerapps.io/query?query={}".format(query))
    try:
        response = requests.post(url)
        return response.json()
    except Exception as e:
        print("Errore nella query:", e)
        return {}

def save_json(data):
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Risultato della query salvato in registrazioni.json.")

@app.route('/processQuery', methods=['POST'])
def process_query():
    data = request.get_json()
    query = data.get("query", "")
    if not query:
        return jsonify({"error": "Query mancante"}), 400

    query_result = get_response(query)
    output = {}

    for message in query_result.get('messages', []):
        if message.get('type') == 'tool' and 'item' in message:
            item_str = message['item']
            item_dict = json.loads(item_str)
            data_str = item_dict['data']
            data_dict = json.loads(data_str)
            
            for company, company_data_str in data_dict.items():
                company_data = json.loads(company_data_str)
                df = pd.DataFrame.from_dict(company_data, orient='index')
                df.index = pd.to_datetime(df.index).strftime('%Y-%m-%d')
                for col in ['open', 'high', 'low', 'close', 'vol']:
                    if col not in df.columns:
                        df[col] = None
                df = df[['open', 'high', 'low', 'close', 'vol']]
                data_list = (
                    df.reset_index()
                    .rename(columns={'index': 'timestamp'})
                    .to_dict(orient='records')
                )
                output[company] = data_list

    save_json(output)
    return jsonify({"status": "success", "data": output})

@app.route('/registrazioni', methods=['GET'])
def get_registrazioni():
    if os.path.exists(FILE_PATH):
        with open(FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    else:
        return jsonify({"registrazioni": []})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
