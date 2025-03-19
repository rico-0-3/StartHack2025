import speech_recognition as sr

def save_text(text):
    with open("registrazioni.txt", "w", encoding="utf-8") as f:
        f.write(text + "\n")
    print("Testo salvato nel file registrazioni.txt.")

def main():
    recognizer = sr.Recognizer()
    recognizer.pause_threshold = 5.0
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

        # Prova il riconoscimento in ciascuna lingua fino a ottenere un risultato valido
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
            # Verifica se il testo riconosciuto contiene il trigger "ciao"
            if "ciao" in recognized_text.lower():
                print("Trigger 'ciao' rilevato.")
                parole = recognized_text.lower().split()
                index = parole.index("ciao")
                # Se ci sono parole dopo "ciao", le registra direttamente
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

if __name__ == "__main__":
    main()
