import requests
import json
import pandas as pd
from datetime import datetime


#################################### API FUNCTION (LLM) ##################################################

def get_response(query:str):
    url = ("https://idchat-api-containerapp01-dev.orangepebble-16234c4b."
           f"switzerlandnorth.azurecontainerapps.io//query?query={query}")

    response = requests.post(url)
    return response.json()

#################################### API DECODING ##################################################

def company_data_search(query:str):
    response = get_response(query)
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


def ohlcv(query:str):
    response = get_response(query)
    for message in response.get('messages', []):
        # Processa solo i messaggi di tipo "tool" che contengono il campo "item"
        if message.get('type') == 'tool' and 'item' in message:
            item_str = message['item']
            # Decodifica il JSON esterno per ottenere il dizionario con le chiavi 'tool' e 'data'
            item_dict = json.loads(item_str)
            # La chiave 'data' contiene una stringa JSON che decodificheremo
            data_str = item_dict['data']
            data_dict = json.loads(data_str)
            
            # Itera sulle chiavi del dizionario per gestire dinamicamente gli ohlcv dell'azienda in questione

            # Convertiamo il timestamp in formato leggibile ISO 8601
            formatted_data = {
                "data": [
                    {
                        "timestamp": datetime.utcfromtimestamp(entry["timestamp"]).isoformat() + "Z",
                        "open": entry["open"],
                        "high": entry["high"],
                        "low": entry["low"],
                        "close": entry["close"],
                        "volume": entry["volume"]
                    }
                    for entry in data_dict.items()
                ]
            }

            # Scriviamo in un file JSON
            with open("ohlcv_data.json", "w") as f:
                json.dump(formatted_data, f, indent=4)

            print("Dati OHLCV salvati in ohlcv_data.json")



if __name__ == "__main__":
    query = "i want the historical data of apple since 2024"
    ohlcv(query)