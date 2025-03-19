import speech_recognition as sr

def save_text(text):
    with open("registrazioni.txt", "a", encoding="utf-8") as f:
        f.write(text + "\n")
    print("Testo salvato nel file registrazioni.txt.")

def main():
    recognizer = sr.Recognizer()
    # Imposta la soglia di pausa a 5 secondi: questo parametro indica
    # per quanto tempo il riconoscimento deve attendere il silenzio per considerare terminata la frase.
    recognizer.pause_threshold = 5.0
    mic = sr.Microphone(device_index=1)
    
    print("Microfoni disponibili:")
    for index, name in enumerate(sr.Microphone.list_microphone_names()):
        print(f"{index}: {name}")

    print("Calibrazione del rumore ambientale in corso, attendere...")
    with mic as source:
        recognizer.adjust_for_ambient_noise(source, duration=2)
    print("Calibrazione completata. In ascolto per la parola trigger.")

    while True:
        with mic as source:
            print("In ascolto...")
            audio = recognizer.listen(source, timeout=2, phrase_time_limit=5)
        try:
            # Prova a riconoscere il parlato tramite Google Speech Recognition
            text = recognizer.recognize_google(audio, language="it-IT")
        except sr.UnknownValueError:
            # Se non viene riconosciuto nulla, assegna una stringa vuota
            text = ""
        except Exception as e:
            print("Errore:", e)
            continue

        print("Hai detto:", text)

        # Se viene rilevata la parola trigger "alexa"
        if "ciao" in text.lower():
            parole = text.lower().split()
            index = parole.index("ciao")
            if index < len(parole) - 1:
                post_trigger = " ".join(parole[index+1:])
                print("Parole dopo il trigger:", post_trigger)
                save_text(post_trigger)
            else:
                print("Trigger rilevato, registrazione della frase successiva. Parla ora (termina con 5 sec di silenzio)...")
                with mic as source:
                    audio2 = recognizer.listen(source)
                try:
                    spoken_text = recognizer.recognize_google(audio2, language="it-IT")
                except sr.UnknownValueError:
                    spoken_text = ""
                except Exception as e:
                    print("Errore durante la registrazione successiva:", e)
                    continue
                print("Hai detto:", spoken_text)
                save_text(spoken_text)

if __name__ == "__main__":
    main()
