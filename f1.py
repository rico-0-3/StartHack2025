import requests
import json
import pandas as pd

def companydatasearch(query:str):
    url = ("https://idchat-api-containerapp01-dev.orangepebble-16234c4b."
           "switzerlandnorth.azurecontainerapps.io//companydatasearch"
           f"?query={query}")
    response = requests.post(url)
    return response.json()


# Esempio di utilizzo
query = "BBVA : employee"
resp = companydatasearch(query)
# 1) Fai il parsing del campo "object" per ottenere un dict
# Adesso prendiamo la stringa JSON contenuta in resp["object"]
object_str = resp["object"]      # <--- questo è una stringa
obj = json.loads(object_str)     # <--- decodifica la stringa in un nuovo dict

# A questo punto obj["data"] è una lista di stringhe JSON: di solito è un elenco con un solo elemento
data_str = obj["data"][0]
data_dict = json.loads(data_str) # <--- decodifichiamo di nuovo la stringa

# Ora data_dict è il dizionario finale con tutte le colonne
df = pd.DataFrame(data_dict).T

print(df)