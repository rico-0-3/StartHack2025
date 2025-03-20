import requests
import json
import pandas as pd

def get_response(query:str):
    url = ("https://idchat-api-containerapp01-dev.orangepebble-16234c4b."
           f"switzerlandnorth.azurecontainerapps.io//query?query={query}")

    response = requests.post(url)
    print(response.json())
    return response.json()

# Esempio di utilizzo
query = "mostrami i dati di nvidia degli utlimi due giorni"
resp = get_response(query)
company_messages = [msg for msg in resp["messages"] if msg.get("name") == "Company_Data_Search"]

# Verifichiamo quanti messaggi abbiamo trovato:
print("Numero di messaggi per i dati aziendali:", len(company_messages))

# Per ogni messaggio, se esiste il campo "item", lo stampiamo:
for msg in company_messages:
    if msg.get("item"):
        print("Dati aziendali:", msg["item"])
    else:
        print("Nessun dato trovato in questo messaggio:", msg)

# print(df)