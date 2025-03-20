// App.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView,
  Animated
} from 'react-native';
import { 
  VictoryChart, 
  VictoryCandlestick, 
  VictoryTheme, 
  VictoryAxis, 
  createContainer,
  VictoryLine,
  VictoryTooltip
} from 'victory';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

// Container combinato per zoom e tooltip
const VictoryZoomVoronoiContainer = createContainer("zoom", "voronoi");

export default function App() {
  const [pollingActive, setPollingActive] = useState(false);

  // Interfaccia dati
  interface RecordType {
    timestamp: string;
    open: number;
    close: number;
    high: number;
    low: number;
  }
  
  const [registrazioni, setRegistrazioni] = useState<RecordType[]>([]);
  const [companyName, setCompanyName] = useState("");

  // Stati per SMA
  const [maData, setMaData] = useState<{ x: Date; y: number }[]>([]);
  const [maWindow, setMaWindow] = useState(20);
  const [showMA, setShowMA] = useState(true);

  // Stati per volatilità
  const [volData, setVolData] = useState<{ x: Date; y: number }[]>([]);
  const [volWindow, setVolWindow] = useState(2);
  // La volatilità sarà sempre visibile (nessun bottone per nasconderla)

  // Polling per dati
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pollingActive) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('http://localhost:5000/registrazioni');
          const json = await response.json();
          const companies = Object.keys(json);
          if (companies.length > 0) {
            const selectedCompany = companies[0];
            setRegistrazioni(json[selectedCompany]);
            setCompanyName(selectedCompany);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [pollingActive]);

  // Trasforma i dati per il grafico candlestick (senza fallback default)
  const transformedData = registrazioni.length > 0 
    ? registrazioni.map(record => ({
        x: new Date(record.timestamp),
        open: record.open,
        close: record.close,
        high: record.high,
        low: record.low,
      }))
    : [];

  // Trend percentuale per il titolo
  const trendPercent = transformedData.length > 0
    ? (
      ((transformedData[transformedData.length - 1].close - transformedData[0].close) /
        transformedData[0].close) *
      100
    ).toFixed(2)
    : "--";

  // Dominio per il grafico candlestick
  const xValues = transformedData.map(d => d.x);
  const yValues = transformedData.reduce((acc: number[], d) => acc.concat([d.open, d.close, d.high, d.low]), []);
  const minX = xValues.length ? new Date(Math.min(...xValues.map(d => d.getTime()))) : new Date();
  const maxX = xValues.length ? new Date(Math.max(...xValues.map(d => d.getTime()))) : new Date();
  const minY = yValues.length ? Math.min(...yValues) : 0;
  const maxY = yValues.length ? Math.max(...yValues) : 0;
  
  // Se il numero di dati supera 25, usa 25 tick
  const xTickCount = transformedData.length > 0 ? (transformedData.length > 25 ? 25 : transformedData.length) : 7;
  const yTickCount = transformedData.length > 0 ? (transformedData.length > 1 ? 10 : transformedData.length) : 7;

  // Calcola la SMA
  const calculateMovingAverage = (data: any, windowSize: number) => {
    if (data.length < windowSize) return [];
    const movingAverageData = [];
    for (let i = windowSize - 1; i < data.length; i++) {
      const windowData = data.slice(i - windowSize + 1, i + 1);
      const sum = windowData.reduce((acc: number, item: any) => acc + item.close, 0);
      const avg = sum / windowSize;
      movingAverageData.push({ x: data[i].x, y: avg });
    }
    return movingAverageData;
  };

  // Calcola la volatilità (deviazione standard)
  const calculateVolatility = (data: typeof transformedData, windowSize: number) => {
    if (data.length < windowSize) return [];
    const vol = [];
    for (let i = windowSize - 1; i < data.length; i++) {
      const slice = data.slice(i - windowSize + 1, i + 1);
      const closes = slice.map(item => item.close);
      const avg = closes.reduce((acc, v) => acc + v, 0) / closes.length;
      const variance = closes.reduce((acc, v) => acc + (v - avg) ** 2, 0) / closes.length;
      const stdDev = Math.sqrt(variance);
      vol.push({ x: data[i].x, y: stdDev });
    }
    return vol;
  };

  // Ricalcola SMA
  useEffect(() => {
    const computedMA = calculateMovingAverage(transformedData, maWindow);
    setMaData(computedMA);
  }, [transformedData, maWindow]);

  // Ricalcola volatilità e applica un fattore di scala (se desiderato)
  const volatilityScaleFactor = 10;
  useEffect(() => {
    const computedVol = calculateVolatility(transformedData, volWindow)
      .map(v => ({ x: v.x, y: v.y * volatilityScaleFactor }));
    setVolData(computedVol);
  }, [transformedData, volWindow]);

  // Dati per il grafico dell'indice (valori reali, chiusura)
  const indexData = transformedData.map(d => ({ x: d.x, y: d.close }));

  // Stato e animazione per il menu di configurazione (colonna destra)
  // Il menu viene renderizzato solo se sono presenti dati (primo grafico caricato)
  const [menuVisible, setMenuVisible] = useState(false);
  const menuWidth = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(menuWidth, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(menuWidth, {
        toValue: 200,
        duration: 300,
        useNativeDriver: false
      }).start();
    }
  };

  // Sezioni di configurazione per SMA (menu a destra)
  const renderMAConfig = () => {
    const options = [10, 20, 50, 100];
    return (
      <View style={styles.configSection}>
        <Text style={styles.configLegend}>
          The yellow line represents the Simple Moving Average (SMA) of the closing prices.
          Select the period:
        
        </Text>
        <View style={styles.buttonContainer}>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.button, maWindow === option && styles.buttonSelected]}
              onPress={() => setMaWindow(option)}
            >
              <Text style={[styles.buttonText, maWindow === option && styles.buttonTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.button, !showMA && styles.buttonSelected]}
            onPress={() => setShowMA(prev => !prev)}
          >
            <Text style={[styles.buttonText, !showMA && styles.buttonTextSelected]}>
              {showMA ? "Remove MA" : "Show MA"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Sezione di configurazione per la volatilità (menu a destra)
  const renderVolConfig = () => {
    const options = [2, 5, 10, 30];
    return (
      <View style={styles.configSection}>
        <Text style={styles.configLegend}>
          The blue line represent the stock's value.
          The purple line represents the volatility of the closing prices.
Select the period:        </Text>
        <View style={styles.buttonContainer}>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.button, volWindow === option && styles.buttonSelected]}
              onPress={() => setVolWindow(option)}
            >
              <Text style={[styles.buttonText, volWindow === option && styles.buttonTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.outerContainer}>
        {/* Colonna sinistra: card con grafici */}
        <View style={styles.leftColumn}>
          {/* Prima card: grafico candlestick/SMA */}
          <View style={styles.card}>
            {pollingActive ? (
              transformedData.length > 0 ? (
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
                      width={Dimensions.get('window').width * 0.65}
                      padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
                      domain={{ x: [minX, maxX], y: [minY, maxY] }}
                      containerComponent={<VictoryZoomVoronoiContainer zoomDimension="x" />}
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
                      {showMA && (
                        <VictoryLine 
                          data={maData}
                          labelComponent={<VictoryTooltip />}
                          labels={({ datum }) => `${datum.x.toLocaleDateString()}\n${datum.y.toFixed(2)}`}
                          style={{ data: { stroke: "#FFCC00", strokeWidth: 1 } }}
                        />
                      )}
                    </VictoryChart>
                  </View>
                </>
              ) : (
                <Text style={styles.placeholder}>Waiting for data...</Text>
              )
            ) : (
              <Text style={styles.placeholder}>Press the button to start data fetching</Text>
            )}
          </View>

          {/* Seconda card: grafico Indice & Volatilità (mostrata solo se ci sono dati) */}
          {pollingActive && transformedData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.stockTitle}>Stock & Volatility</Text>
              {/* Grafico superiore: andamento dell'indice (valori reali) */}
              <View style={styles.splitChart}>
                <VictoryChart
                  theme={VictoryTheme.material}
                  width={Dimensions.get('window').width * 0.65}
                  height={150}
                  padding={{ top: 20, bottom: 25, left: 50, right: 20 }}
                  domain={{ x: [minX, maxX] }}
                  containerComponent={<VictoryZoomVoronoiContainer zoomDimension="x" />}
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
                    style={{
                      axis: { stroke: '#ccc' },
                      tickLabels: { fill: '#ccc' },
                      grid: { stroke: '#555' }
                    }}
                  />
                  <VictoryLine 
                    data={indexData}
                    labelComponent={<VictoryTooltip />}
                    labels={({ datum }) => `${datum.x.toLocaleDateString()}\n${datum.y.toFixed(2)}`}
                    style={{ data: { stroke: "#00BFFF", strokeWidth: 1 } }}
                  />
                </VictoryChart>
              </View>
              {/* Grafico inferiore: volatilità (valori reali) */}
              <View style={styles.splitChart}>
                <VictoryChart
                  theme={VictoryTheme.material}
                  width={Dimensions.get('window').width * 0.65}
                  height={150}
                  padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
                  domain={{ x: [minX, maxX] }}
                  containerComponent={<VictoryZoomVoronoiContainer zoomDimension="x" />}
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
                    style={{
                      axis: { stroke: '#ccc' },
                      tickLabels: { fill: '#ccc' },
                      grid: { stroke: '#555' }
                    }}
                  />
                  <VictoryLine 
                    data={volData}
                    labelComponent={<VictoryTooltip />}
                    labels={({ datum }) => `${datum.x.toLocaleDateString()}\n${datum.y.toFixed(2)}`}
                    style={{ data: { stroke: "#A020F0", strokeWidth: 1 } }}
                  />
                </VictoryChart>
              </View>
            </View>
          )}
        </View>

        {/* Colonna destra: menu di configurazione a scomparsa (visibile solo se ci sono dati) */}
        {pollingActive && transformedData.length > 0 && (
          <Animated.View style={[styles.rightColumn, { width: menuWidth }]}>
            {menuVisible && (
              <View>
                {renderMAConfig()}
                {renderVolConfig()}
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* Bottone per avviare il polling */}
      {!pollingActive && (
        <TouchableOpacity style={styles.siriButton} onPress={() => setPollingActive(true)}>
          <MaterialCommunityIcons name="microphone" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Bottone per mostrare/nascondere il menu di configurazione (visibile solo se ci sono dati) */}
      {pollingActive && transformedData.length > 0 && (
        <TouchableOpacity style={styles.menuToggle} onPress={toggleMenu}>
          <MaterialCommunityIcons name={menuVisible ? "close" : "menu"} size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#121212',
    alignItems: 'center',
  },
  outerContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  leftColumn: {
    flex: 3,
    paddingRight: 10,
  },
  rightColumn: {
    paddingLeft: 10,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    padding: 20,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  tickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginRight: 5,
  },
  chartContainer: {
    width: '100%',
    height: 300,
  },
  splitChart: {
    marginBottom: 10,
  },
  siriButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  configSection: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    padding: 15,
    marginBottom: 20,
  },
  configLegend: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  button: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  buttonSelected: {
    backgroundColor: '#FFCC00',
  },
  buttonText: {
    color: '#ccc',
    fontSize: 16,
  },
  buttonTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  menuToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 25,
  },
});
