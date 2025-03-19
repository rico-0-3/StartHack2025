import pandas as pd
import matplotlib.pyplot as plt
import statsmodels.api as sm

# Carica i dati dal CSV; assicurati che il file si chiami "dati_storici.csv"
df = pd.read_csv("dati_storici.csv", parse_dates=["Date"], index_col="Date", quotechar='"')

# Ordina il DataFrame per data (dal più vecchio al più recente)
df.sort_index(inplace=True)

# Visualizza un'anteprima dei dati
print("Anteprima dei dati:")
print(df.head())

# Visualizza la lista delle colonne per verificare il nome corretto (dovrebbe esserci "Price")
print("\nColonne del dataset:")
print(df.columns)

# Suddividi i dati:
# - Training: tutti gli anni fino al 2021 (fino al 31/12/2021)
# - Test: dal 2022 in poi (dal 01/01/2022)
train = df.loc[:'2019-12-31']
test = df.loc['2020-01-01':]

print("\nDimensioni training:", train.shape)
print("Dimensioni test:", test.shape)

# Adatta il modello ARIMA sui dati di training utilizzando la colonna "Price"
model = sm.tsa.ARIMA(train['Price'], order=(1, 0, 1), seasonal_order=(1, 1, 1, 12))
model_fit = model.fit()
print("\nSintesi del modello ARIMA:")
print(model_fit.summary())

# Previsione per il periodo di test (numero di periodi pari al numero di osservazioni in test)
forecast = model_fit.forecast(steps=len(test))
forecast.index = test.index

# Confronta previsione e andamento reale
plt.figure(figsize=(12, 6))
plt.plot(train['Price'], label='Dati di Training')
plt.plot(test['Price'], label='Dati Reali (Test)', color='blue')
plt.plot(forecast, label='Previsione ARIMA', color='red', linestyle='--')
plt.title("Confronto tra previsione ARIMA e andamento reale")
plt.xlabel("Data")
plt.ylabel("Prezzo")
plt.legend()
plt.savefig('forecast_arima2.png')
