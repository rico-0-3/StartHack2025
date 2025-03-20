// App.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { 
  VictoryChart, 
  VictoryCandlestick, 
  VictoryTheme, 
  VictoryAxis, 
  VictoryTooltip,
  createContainer
} from 'victory';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Crea il container combinato per zoom e voronoi (tooltip)
const VictoryZoomVoronoiContainer = createContainer("zoom", "voronoi");

export default function App() {
  const [pollingActive, setPollingActive] = useState(false);
  interface RecordType {
    timestamp: string;
    open: number;
    close: number;
    high: number;
    low: number;
  }
  const [registrazioni, setRegistrazioni] = useState<RecordType[]>([]);
  const [companyName, setCompanyName] = useState("");

  // Avvia il polling solo se il bottone è stato premuto (pollingActive true)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pollingActive) {
      interval = setInterval(async () => {
        try {
          console.log("fetching...");
          const response = await fetch('http://localhost:5000/registrazioni');
          const json = await response.json();
          
          // Controlla se ci sono dati nel JSON
          const companies = Object.keys(json);
          if (companies.length > 0) {
            const selectedCompany = companies[0];
            setRegistrazioni(json[selectedCompany]);
            setCompanyName(selectedCompany);
          }
        } catch (error) {
          console.error('Errore nel fetch:', error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [pollingActive]);

  // Trasforma i dati ricevuti in un formato compatibile con VictoryCandlestick
  const transformedData = registrazioni.length > 0 
    ? registrazioni.map(record => ({
        x: new Date(record.timestamp),
        open: record.open,
        close: record.close,
        high: record.high,
        low: record.low,
      }))
    : [
        { x: new Date("2024-03-20"), open: 181.81, close: 179.73, high: 182.67, low: 174.0 },
        { x: new Date("2024-03-21"), open: 186.12, close: 178.68, high: 187.65, low: 177.66 },
        { x: new Date("2024-03-22"), open: 177.01, close: 179.65, high: 180.76, low: 175.05 },
        { x: new Date("2024-03-25"), open: 172.75, close: 178.63, high: 182.78, low: 172.0 },
        { x: new Date("2024-03-26"), open: 179.54, close: 177.87, high: 182.59, low: 176.33 },
        { x: new Date("2024-03-27"), open: 179.93, close: 179.59, high: 181.21, low: 175.41 },
        { x: new Date("2024-03-28"), open: 179.59, close: 180.49, high: 183.38, low: 178.3 },
      ];

  // Calcola il trend percentuale
  const trendPercent = (
    ((transformedData[transformedData.length - 1].close - transformedData[0].close) /
      transformedData[0].close) *
    100
  ).toFixed(2);

  // Calcola i limiti per gli assi
  const xValues = transformedData.map(d => d.x);
  const yValues = transformedData.reduce((acc: number[], d) => acc.concat([d.open, d.close, d.high, d.low]), []);
  const minX = new Date(Math.min(...xValues.map(d => d.getTime())));
  const maxX = new Date(Math.max(...xValues.map(d => d.getTime())));
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const xTickCount = registrazioni.length > 0 ? (registrazioni.length > 31 ? 31 : registrazioni.length) : 7;
  const yTickCount = registrazioni.length > 0 ? (registrazioni.length > 1 ? 10 : registrazioni.length) : 7;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {pollingActive ? (
          registrazioni.length > 0 ? (
            <> 
              <View style={styles.chartHeader}>
                <Text style={styles.stockTitle}>{companyName}</Text>
                <View style={styles.tickerContainer}>
                  <Text style={styles.tickerText}>{trendPercent}%</Text>
                  {parseFloat(trendPercent) > 0 
                    ? <MaterialCommunityIcons name="arrow-up-bold" size={28} color="#00FF00" />
                    : <MaterialCommunityIcons name="arrow-down-bold" size={28} color="#FF4500" />
                  }
                </View>
              </View>
              <View style={styles.chartContainer}>
                <VictoryChart
                  theme={VictoryTheme.material}
                  width={Dimensions.get('window').width - 80}
                  padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
                  domain={{
                    x: [minX, maxX],
                    y: [minY, maxY],
                  }}
                  // Usa il container combinato per abilitare zoom e tooltip
                  containerComponent={
                    <VictoryZoomVoronoiContainer
                      // Prop per configurare lo zoom, ad esempio limitandolo all'asse x:
                      zoomDimension="x"
                      // Configura i tooltip come prima:
                      labels={({ datum }) =>
                        `Data: ${new Date(datum.x).toLocaleDateString()}\nOpen: ${datum.open}\nHigh: ${datum.high}\nLow: ${datum.low}\nClose: ${datum.close}`
                      }
                      labelComponent={
                        <VictoryTooltip 
                          flyoutStyle={{ fill: "#1e1e1e", stroke: "#ccc" }}
                          style={{ fill: "#ccc", fontSize: 12 }}
                          cornerRadius={5}
                        />
                      }
                    />
                  }
                >
                  <VictoryAxis 
                    tickCount={xTickCount}
                    tickFormat={(t) => {
                      const date = new Date(t);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                    style={{
                      axis: { stroke: '#ccc' },
                      tickLabels: { fill: '#ccc' },
                      grid: { stroke: '#555' }
                    }}
                  />
                  <VictoryAxis 
                    dependentAxis
                    tickCount={yTickCount}
                    style={{
                      axis: { stroke: '#ccc' },
                      tickLabels: { fill: '#ccc' },
                      grid: { stroke: '#555' }
                    }}
                  />
                  <VictoryCandlestick 
                    data={transformedData}
                    candleColors={{ positive: "#00FF00", negative: "#FF4500" }}
                    animate={{ onLoad: { duration: 1000 } }}
                  />
                </VictoryChart>
              </View>
            </>
          ) : (
            <Text style={styles.placeholder}>In attesa dei dati...</Text>
          )
        ) : (
          <Text style={styles.placeholder}>Premi il bottone per iniziare la lettura dei dati</Text>
        )}
      </View>
      {!pollingActive && (
  <TouchableOpacity
    style={styles.siriButton}
    onPress={() => setPollingActive(true)}
  >
    <MaterialCommunityIcons name="microphone" size={32} color="#fff" />
  </TouchableOpacity>
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '80%',
    minHeight: 300,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholder: {
    color: '#ccc',
    fontSize: 18,
    textAlign: 'center',
  },
  chartHeader: {
    width: '100%',
    height: '10%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 30,
  },
  stockTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginLeft: 10,
  },
  tickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 30,
    marginBottom: 20,
  },
  tickerText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginRight: 5,
  },
  chartContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    marginBottom: 0,
  },
  siriButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
