import speech_recognition as sr
from flask import Flask, jsonify
from flask_cors import CORS 
import json
import time
import threading
import os
import requests
import pandas as pd

app = Flask(__name__)
CORS(app)
FILE_PATH = "registrazioni.json"

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
    languages = ["en-US"]
    
    while True:
        with mic as source:
            print("In ascolto...")
            try:
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
            if "hello" in recognized_text.lower():
                print("Trigger 'hello' rilevato.")
                parole = recognized_text.lower().split()
                index = parole.index("hello")
                # Se ci sono parole dopo "ciao", le usiamo come query
                if index < len(parole) - 1:
                    post_trigger = " ".join(parole[index+1:])
                    print("Testo per la query:", post_trigger)
                    # Passa il testo alla query e salva il risultato in JSON
                    query_result = get_response(post_trigger)
                    
                    
                    output = {}
                    try:
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
                                    
                                    # Converte il DataFrame in una lista di dizionari aggiungendo il timestamp
                                    data_list = (
                                        df.reset_index()
                                        .rename(columns={'index': 'timestamp'})
                                        .to_dict(orient='records')
                                    )
                                    output[company] = data_list
                    
                    except:
                        pass
                    
                    save_json(output)
                else:
                    print("Nessun testo dopo il trigger 'ciao'.")
                    continue
            else:
                print("Parola trigger non rilevata, testo ignorato.")
        else:
            print("Nessun testo riconosciuto.")

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
