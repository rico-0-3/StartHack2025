import speech_recognition as sr
from flask import Flask, jsonify
from flask_cors import CORS 
import json
import time
import threading
import os

app = Flask(__name__)
CORS(app)
FILE_PATH = "registrazioni.json"

def save_text(text):
    """
    Salva il testo in registrazioni.json eliminando ogni contenuto precedente.
    """
    data = {"registrazioni": [text]}  # Sostituisce il contenuto precedente con la nuova registrazione
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Testo salvato nel file registrazioni.json.")

def speech_recognition_loop():
    recognizer = sr.Recognizer()
    recognizer.pause_threshold = 5.0
    # Assicurati che il device_index corrisponda al microfono corretto
    mic = sr.Microphone(device_index=1)

    print("Calibrazione del rumore ambientale in corso, attendere...")
    with mic as source:
        recognizer.adjust_for_ambient_noise(source, duration=5)
    print("Calibrazione completata. In ascolto per la parola trigger.")

    # Lista di lingue da provare: aggiungi o modifica in base alle tue esigenze
    languages = ["it-IT", "en-US"]
    
    while True:
        with mic as source:
            print("In ascolto...")
            try:
                audio = recognizer.listen(source, timeout=3, phrase_time_limit=15)
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
                # Se ci sono parole dopo "ciao", salvale
                if index < len(parole) - 1:
                    post_trigger = " ".join(parole[index+1:])
                    print("Parole dopo il trigger:", post_trigger)
                    save_text(post_trigger)
                else:
                    continue
            else:
                print("Parola trigger non rilevata, testo ignorato.")
        else:
            print("Nessun testo riconosciuto.")

@app.route('/registrazioni', methods=['GET'])
def get_registrazioni():
    """
    Endpoint che restituisce il contenuto del file 'registrazioni.json' in formato JSON.
    Il frontend React potrà utilizzarlo per aggiornare il grafico in base alle registrazioni.
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
