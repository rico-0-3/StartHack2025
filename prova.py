import speech_recognition as sr
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import time
import threading
import os
import requests
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)
FILE_PATH = "registrazioni.json"

# Variabili globali per la configurazione degli indicatori
indicator_config = {
    "SMA_windows": [10, 20],
    "EMA_windows": [10, 20],
    "RSI_window": 14,
    "MACD_fast": 12,
    "MACD_slow": 26,
    "MACD_signal": 9
}

def get_response(query: str):
    """
    Esegue una richiesta POST passando il testo riconosciuto come query.
    """
    url = ("https://idchat-api-containerapp01-dev.orangepebble-16234c4b."
           "switzerlandnorth.azurecontainerapps.io//query?query={}".format(query))
    try:
        response = requests.post(url)
        return response.json()
    except Exception as e:
        print("Errore nella query:", e)
        return {}

def save_json(data):
    """
    Salva il JSON ottenuto dalla query in registrazioni.json.
    """
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Risultato della query salvato in registrazioni.json.")

def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcola gli indicatori finanziari sul DataFrame:
    SMA, EMA, RSI, MACD, ecc.
    """
    # Calcolo della Media Mobile Semplice (SMA)
    for window in indicator_config['SMA_windows']:
        df[f'SMA_{window}'] = df['close'].rolling(window=window).mean()

    # Calcolo della Media Mobile Esponenziale (EMA)
    for window in indicator_config['EMA_windows']:
        df[f'EMA_{window}'] = df['close'].ewm(span=window, adjust=False).mean()

    # Calcolo dell'RSI (Relative Strength Index)
    delta = df['close'].diff(1)
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(window=indicator_config['RSI_window']).mean()
    avg_loss = loss.rolling(window=indicator_config['RSI_window']).mean()
    rs = avg_gain / avg_loss
    df['RSI'] = 100 - (100 / (1 + rs))

    # Calcolo del MACD
    ema_fast = df['close'].ewm(span=indicator_config['MACD_fast'], adjust=False).mean()
    ema_slow = df['close'].ewm(span=indicator_config['MACD_slow'], adjust=False).mean()
    df['MACD'] = ema_fast - ema_slow
    df['Signal_Line'] = df['MACD'].ewm(span=indicator_config['MACD_signal'], adjust=False).mean()

    # Stampa i primi record a schermo per debug
    print("\n==== DATAFRAME CON INDICATORI ====")
    print(df.head(5))
    print("=================================\n")

    return df

def speech_recognition_loop():
    recognizer = sr.Recognizer()
    recognizer.pause_threshold = 5.0
    # Assicurati che il device_index corrisponda al microfono corretto
    mic = sr.Microphone(device_index=1)

    print("Calibrazione del rumore ambientale in corso, attendere...")
    with mic as source:
        recognizer.adjust_for_ambient_noise(source, duration=5)
    print("Calibrazione completata. In ascolto per la parola trigger.")

    # Lista di lingue da provare
    languages = ["it-IT", "en-US"]

    while True:
        with mic as source:
            print("In ascolto...")
            try:
                # Aggiunta di un valore di timeout valido (es: 1.5 secondi)
                audio = recognizer.listen(source, timeout=1.5, phrase_time_limit=15)
            except Exception as e:
                print("Errore nell'ascolto:", e)
                continue

        recognized_text = None
        for lang in languages:
            try:
                recognized_text = recognizer.recognize_google(audio, language=lang)
                if recognized_text:
                    break
            except sr.UnknownValueError:
                continue
            except Exception as e:
                print("Errore:", e)
                recognized_text = None
                break

        if recognized_text:
            # Verifica se il testo contiene il trigger "ciao"
            if "ciao" in recognized_text.lower():
                print("Trigger 'ciao' rilevato.")
                parole = recognized_text.lower().split()
                index = parole.index("ciao")
                # Se ci sono parole dopo "ciao", le usiamo come query
                if index < len(parole) - 1:
                    post_trigger = " ".join(parole[index+1:])
                    print("Testo per la query:", post_trigger)
                    # Passa il testo alla query e salva il risultato in JSON
                    query_result = get_response(post_trigger)

                    output = {}

                    for message in query_result.get('messages', []):
                        # Processa solo i messaggi di tipo "tool" che contengono il campo "item"
                        if message.get('type') == 'tool' and 'item' in message:
                            item_str = message['item']
                            # Decodifica il JSON esterno per ottenere il dizionario con le chiavi 'tool' e 'data'
                            item_dict = json.loads(item_str)
                            # La chiave 'data' contiene una stringa JSON che decodificheremo
                            data_str = item_dict['data']
                            data_dict = json.loads(data_str)

                            # Itera sulle chiavi del dizionario per gestire dinamicamente ogni azienda
                            for company, company_data_str in data_dict.items():
                                # company_data_str è una stringa JSON con i dati storici dell'azienda
                                company_data = json.loads(company_data_str)
                                # Converte il dizionario in un DataFrame di Pandas
                                df = pd.DataFrame.from_dict(company_data, orient='index')
                                df.index = pd.to_datetime(df.index).strftime('%Y-%m-%d')
                                # Verifica che siano presenti le colonne richieste, altrimenti le aggiunge con valore None
                                for col in ['open', 'high', 'low', 'close', 'vol']:
                                    if col not in df.columns:
                                        df[col] = None
                                # Seleziona le colonne nell'ordine desiderato
                                df = df[['open', 'high', 'low', 'close', 'vol']]

                                # Calcola gli indicatori sul DataFrame
                                df = calculate_indicators(df)

                                # Converte il DataFrame in una lista di dizionari con timestamp
                                data_list = (
                                    df.reset_index()
                                    .rename(columns={'index': 'timestamp'})
                                    .to_dict(orient='records')
                                )
                                output[company] = data_list

                    save_json(output)
                else:
                    print("Nessun testo dopo il trigger 'ciao'.")
                    continue
            else:
                print("Parola trigger non rilevata, testo ignorato.")
        else:
            print("Nessun testo riconosciuto.")

@app.route('/set_indicators', methods=['POST'])
def set_indicators():
    global indicator_config
    try:
        new_config = request.json
        indicator_config.update(new_config)
        return jsonify({"status": "success", "message": "Configurazione degli indicatori aggiornata."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/registrazioni', methods=['GET'])
def get_registrazioni():
    """
    Endpoint che restituisce il contenuto del file 'registrazioni.json' in formato JSON.
    """
    if os.path.exists(FILE_PATH):
        with open(FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    else:
        return jsonify({"registrazioni": []})

if __name__ == "__main__":
    # Avvia il loop di riconoscimento vocale in un thread separato
    threading.Thread(target=speech_recognition_loop, daemon=True).start()
    # Avvia il server Flask
    app.run(debug=True, port=5000)

