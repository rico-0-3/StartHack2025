// App.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis, VictoryVoronoiContainer } from 'victory';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {
  const [pollingActive, setPollingActive] = useState(false);
  const [registrazioni, setRegistrazioni] = useState([]);

  // Avvia il polling solo se il bottone è stato premuto (pollingActive true)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pollingActive) {
      interval = setInterval(async () => {
        try {
          console.log("fetching...");
          const response = await fetch('http://localhost:5000/registrazioni');
          const json = await response.json();
          console.log("Registrazioni:", json.registrazioni);
          // Se il JSON contiene dati, li aggiorno nello stato
          if (json.registrazioni && json.registrazioni.length > 0) {
            setRegistrazioni(json.registrazioni);
          }
        } catch (error) {
          console.error('Errore nel fetch:', error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [pollingActive]);

  // Determino quale dataset usare: se sono presenti registrazioni uso questi dati, altrimenti dati simulati
  const dataToDisplay = registrazioni.length < 0 ? registrazioni : [
    { x: 1, y: 150 },
    { x: 2, y: 155 },
    { x: 3, y: 153 },
    { x: 4, y: 160 },
    { x: 5, y: 158 },
    { x: 6, y: 165 },
    { x: 7, y: 150 },
    { x: 8, y: 150 },
    { x: 9, y: 150 },
    { x: 10, y: 150 },
    { x: 11, y: 150 },
    { x: 12, y: 150 },
    { x: 13, y: 150 },
    { x: 14, y: 150 },
    { x: 15, y: 150 },
    { x: 16, y: 150 },
    { x: 17, y: 150 },
    { x: 18, y: 150 },
    { x: 19, y: 150 },
    { x: 20, y: 150 },
    { x: 21, y: 150 },
    { x: 22, y: 150 },
    { x: 23, y: 150 },
    { x: 24, y: 150 },
    { x: 25, y: 150 },
    { x: 26, y: 150 },
    { x: 27, y: 150 },
    { x: 28, y: 150 },
    { x: 29, y: 150 },
    { x: 30, y: 150 },
    { x: 31, y: 150 },
    { x: 32, y: 150 },
    { x: 33, y: 190 },
  ];

  // Calcolo del trend: se l'ultimo dato è maggiore del primo, trend in rialzo
  const trend = dataToDisplay[dataToDisplay.length - 1].y - dataToDisplay[0].y;
  const trendIcon = trend > 0 
    ? <MaterialCommunityIcons name="arrow-up-bold" size={28} color="#00FF00" />
    : <MaterialCommunityIcons name="arrow-down-bold" size={28} color="#FF4500" />;

  // Calcolo i limiti per x e y dai dati
  const xValues = dataToDisplay.map(d => d.x);
  const yValues = dataToDisplay.map(d => d.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  return (
    <View style={styles.container}>
      {/* Card per i dati */}
      <View style={styles.card}>
        {pollingActive ? (
          // Se è attivo il polling, controllo se sono già arrivate registrazioni
          registrazioni.length > 0 ? (
            <>
              {/* Header della card con nome e ticker */}
              <View style={styles.chartHeader}>
                <Text style={styles.stockTitle}>Apple</Text>
                <View style={styles.tickerContainer}>
                  <Text style={styles.tickerText}>AAPL</Text>
                  {trendIcon}
                </View>
              </View>
              {/* Container del grafico */}
              <View style={styles.chartContainer}>
                <VictoryChart
                  theme={VictoryTheme.material}
                  width={Dimensions.get('window').width - 80}
                  domain={{ x: [minX, maxX], y: [minY, maxY] }}
                  padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
                  containerComponent={
                    <VictoryVoronoiContainer
                      labels={({ datum }) => `x: ${datum.x}, y: ${datum.y}`}
                    />
                  }
                  style={{
                    parent: { backgroundColor: '#1e1e1e' }
                  }}
                >
                  <VictoryAxis 
                    tickCount={70}
                    style={{
                      axis: { stroke: '#ccc' },
                      tickLabels: { fill: '#ccc' },
                      grid: { stroke: '#555' }
                    }}
                  />
                  <VictoryAxis 
                    dependentAxis 
                    tickCount={20}
                    style={{
                      axis: { stroke: '#ccc' },
                      tickLabels: { fill: '#ccc' },
                      grid: { stroke: '#555' }
                    }}
                  />
                  <VictoryLine 
                    data={dataToDisplay}
                    animate={{ onLoad: { duration: 1000 } }}
                    style={{
                      data: { 
                        stroke: trend > 0 ? '#00FF00' : '#FF4500', 
                        strokeWidth: 3 
                      }
                    }}
                  />
                </VictoryChart>
              </View>
            </>
          ) : (
            <Text style={styles.placeholder}>
              In attesa dei dati...
            </Text>
          )
        ) : (
          <Text style={styles.placeholder}>
            Premi il bottone per iniziare la lettura dei dati
          </Text>
        )}
      </View>

      {/* Bottone rotondo stile Siri */}
      <TouchableOpacity
        style={styles.siriButton}
        onPress={() => setPollingActive(true)}
      >
        <MaterialCommunityIcons name="microphone" size={32} color="#fff" />
      </TouchableOpacity>
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
    width: '95%',
    height: '80%',
    minHeight: 300,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginBottom: 30,
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
