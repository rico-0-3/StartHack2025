// App.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { VictoryChart, VictoryLine, VictoryTheme } from 'victory';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {
  const [showChart, setShowChart] = useState(false);

  // Dati simulati per l'azione Apple
  const data = [
    { x: 1, y: 150 },
    { x: 2, y: 155 },
    { x: 3, y: 153 },
    { x: 4, y: 160 },
    { x: 5, y: 158 },
    { x: 6, y: 165 },
    { x: 7, y: 163 },
  ];

  // Calcolo del trend: se l'ultimo dato è maggiore del primo, trend in rialzo
  const trend = data[data.length - 1].y - data[0].y;
  const trendIcon = trend > 0 
    ? <MaterialCommunityIcons name="arrow-up-bold" size={28} color="green" />
    : <MaterialCommunityIcons name="arrow-down-bold" size={28} color="red" />;

  return (
    <View style={styles.container}>
      {/* Header con bottone e icona */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.button} onPress={() => setShowChart(true)}>
          <Text style={styles.buttonText}>Start listening</Text>
        </TouchableOpacity>
        <MaterialIcons name="play-arrow" size={28} color="#007BFF" style={styles.icon} />
      </View>
      
      {/* Area dati */}
      <View style={styles.dataContainer}>
        {showChart ? (
          <>
            {/* Footer del grafico: Nome e sigla con freccia posizionati in basso */}
            <View style={styles.chartFooter}>
              <Text style={styles.stockTitle}>Apple</Text>
              <View style={styles.tickerContainer}>
                <Text style={styles.tickerText}>AAPL</Text>
                {trendIcon}
              </View>
            </View>
            {/* Grafico animato (senza i pallini) posizionato in alto */}
            <VictoryChart theme={VictoryTheme.material}>
              <VictoryLine 
                data={data}
                animate={({ onLoad: { duration: 1000, easing: "bounce" } } as any)}
                style={{
                  data: { 
                    stroke: trend > 0 ? 'green' : 'red', 
                    strokeWidth: 3 
                  }
                }}
              />
            </VictoryChart>
          </>
        ) : (
          <Text style={styles.placeholder}>here will be show the data listened</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 40,
    backgroundColor: '#f0f4f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginLeft: 8,
        marginBottom: 30,
  },
  dataContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholder: {
    color: '#ccc',
    fontSize: 16,
  },
  chartFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: 10,
  },
  stockTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#333',
    marginTop: 10,
    marginLeft: 30,
  },
  tickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginRight: 30,
  },
  tickerText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#333',
    marginRight: 5,
  },
});
