import requests
import json
import pandas as pd


def get_response(query:str):
    url = ("https://idchat-api-containerapp01-dev.orangepebble-16234c4b."
           f"switzerlandnorth.azurecontainerapps.io//query?query={query}")

    response = requests.post(url)
    return response.json()

if __name__ == "__main__":

    response = get_response("mostrami i dati di nvidia degli ultimi 7 anni, anche quelli di amd. Mese per mese")
    for message in response.get('messages', []):
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
                print(f"\nDati per {company}:")
                print(df)
