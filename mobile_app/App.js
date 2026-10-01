import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { Activity, Zap, Thermometer, Wind, Cpu, ShieldAlert, Wrench, ListChecks, AlertTriangle, FileSearch } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTelemetry } from './src/hooks/useTelemetry';

const screenWidth = Dimensions.get("window").width;

// --- BLINKING DTC COMPONENT ---
const BlinkingDTC = ({ dtc }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  if (dtc === 'NONE') return null;

  return (
    <Animated.View style={[styles.dtcBadge, { opacity }]}>
      <View style={styles.dtcDot} />
      <Text style={styles.dtcBadgeText}>DTC: {dtc} - DETECTED</Text>
    </Animated.View>
  );
};

// --- AI BLUERPINT COMPONENT (Mobile) ---
const AIBlueprintDashboard = ({ rawReport }) => {
  const parseAIReport = (report) => {
    if (!report || report.includes("Optimal") || report === "Awaiting live telemetry for anomalies...") return null;

    const extract = (key) => {
      const regex = new RegExp(`${key}:\\s*([\\s\\S]*?)(?=(?:\\n[A-Z_]+:|$))`);
      const match = report.match(regex);
      return match ? match[1].trim() : 'N/A';
    };

    return {
      status: extract('STATUS'),
      diagnosis: extract('DIAGNOSIS'),
      causes: extract('PROBABLE_CAUSES'),
      action: extract('RECOMMENDED_ACTION'),
      fastFix: extract('FAST_FIX'),
      deepDive: extract('DEEP_DIVE'),
      parts: extract('PARTS_REQUIRED'),
      risk: extract('RISK_LEVEL'),
      drivability: extract('DRIVABILITY_STATUS')
    };
  };

  const parsedData = parseAIReport(rawReport);

  if (!parsedData) {
    return (
      <View style={[styles.aiCard, { borderColor: 'rgba(6, 182, 212, 0.3)' }]}>
        <View style={styles.flexRow}>
          <ShieldAlert color="#22d3ee" size={24} />
          <Text style={[styles.aiTitle, { color: '#22d3ee' }]}>SYSTEM OPTIMAL</Text>
        </View>
        <Text style={styles.aiBody}>{rawReport || "Awaiting live telemetry..."}</Text>
      </View>
    );
  }

  const isCritical = parsedData.risk.toUpperCase().includes('CRITICAL');
  const riskBorder = isCritical ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)';
  const riskBg = isCritical ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)';
  const riskText = isCritical ? '#ef4444' : '#f59e0b';

  let driveColor = '#22d3ee'; // CYAN
  if (parsedData.drivability.includes('DO_NOT_DRIVE')) driveColor = '#ef4444';
  else if (parsedData.drivability.includes('CAUTION')) driveColor = '#f59e0b';

  return (
    <View style={styles.blueprintContainer}>
      
      <View style={[styles.riskCard, { borderColor: riskBorder, backgroundColor: riskBg }]}>
        <View style={styles.flexRow}>
          <AlertTriangle color={riskText} size={24} />
          <Text style={[styles.riskTitle, { color: riskText }]}>FAULT DETECTED</Text>
        </View>
        <Text style={styles.riskBody}>{parsedData.diagnosis}</Text>
        
        <View style={[styles.drivabilityBadge, { borderColor: 'rgba(255,255,255,0.1)' }]}>
          <View style={[styles.statusDot, { backgroundColor: driveColor }]} />
          <Text style={styles.drivabilityText}>{parsedData.drivability}</Text>
        </View>

        <View style={styles.riskLevelContainer}>
          <Text style={styles.riskLevelLabel}>RISK LEVEL</Text>
          <Text style={[styles.riskLevelValue, { color: riskText }]}>{parsedData.risk.split('-')[0] || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.strategyCard}>
        <View style={styles.flexRow}>
          <Zap color="#22d3ee" size={18} />
          <Text style={[styles.strategyTitle, { color: '#fff' }]}>FAST-FIX TIP</Text>
        </View>
        <Text style={styles.strategyBody}>{parsedData.fastFix}</Text>
      </View>

      <View style={[styles.strategyCard, { borderColor: 'rgba(192, 132, 252, 0.3)' }]}>
        <View style={styles.flexRow}>
          <FileSearch color="#c084fc" size={18} />
          <Text style={[styles.strategyTitle, { color: '#fff' }]}>DEEP-DIVE STRATEGY</Text>
        </View>
        <Text style={styles.strategyBody}>{parsedData.deepDive}</Text>
      </View>

      <View style={[styles.strategyCard, { borderColor: 'rgba(244, 114, 182, 0.3)' }]}>
        <View style={styles.flexRow}>
          <Wrench color="#f472b6" size={18} />
          <Text style={[styles.strategyTitle, { color: '#fff' }]}>PARTS & TOOLS</Text>
        </View>
        <Text style={styles.strategyBody}>{parsedData.parts}</Text>
      </View>

      <View style={[styles.actionCard, { borderColor: 'rgba(96, 165, 250, 0.3)' }]}>
        <View style={styles.flexRow}>
          <ListChecks color="#60a5fa" size={18} />
          <Text style={styles.actionTitle}>PROBABLE CAUSES</Text>
        </View>
        <Text style={styles.actionBody}>{parsedData.causes}</Text>
      </View>

      <View style={[styles.actionCard, { borderColor: 'rgba(52, 211, 153, 0.3)' }]}>
        <View style={styles.flexRow}>
          <ListChecks color="#34d399" size={18} />
          <Text style={styles.actionTitle}>RECOMMENDED ACTION</Text>
        </View>
        <Text style={styles.actionBody}>{parsedData.action}</Text>
      </View>
    </View>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const { data, status } = useTelemetry("178.128.103.197", 9001, "telemetry/ai");
  
  const [rpmHistory, setRpmHistory] = useState([0, 0, 0, 0, 0, 0]);

  const rpm = data?.engine?.rpm || 0;
  const speed = data?.speed?.vehicle_speed || 0;
  const coolant = data?.engine?.coolant_temp || 0;
  const maf = data?.engine?.maf !== undefined ? data.engine.maf.toFixed(1) : '--';
  const engineLoad = data?.engine?.load !== undefined ? data.engine.load : '--';
  const throttle = data?.engine?.throttle !== undefined ? data.engine.throttle : '--';
  const dtc = data?.diagnostics?.dtc?.[0] || 'NONE';
  const aiReport = data?.ai_analysis?.report || "";

  useEffect(() => {
    if (rpm > 0 || rpm === 0) {
      setRpmHistory(prev => {
        const newHist = [...prev, rpm];
        if (newHist.length > 20) newHist.shift();
        return newHist;
      });
    }
  }, [rpm]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>車診</Text>
              <Text style={styles.logoAI}>AI</Text>
              <Text style={styles.logoSub}>(Shashin AI)</Text>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusPill, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                <View style={[styles.statusDot, { backgroundColor: status === 'ONLINE' ? '#22d3ee' : '#ef4444' }]} />
                <Text style={[styles.statusText, { color: status === 'ONLINE' ? '#22d3ee' : '#ef4444' }]}>{status}</Text>
              </View>
              {dtc !== 'NONE' && <BlinkingDTC dtc={dtc} />}
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.inventorBadge}>
              <Text style={styles.inventorText}>発明者 - ニポナ　サハン</Text>
            </View>
          </View>
        </View>

        {data ? (
          <>
            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { width: '48%', borderColor: 'rgba(34, 211, 238, 0.3)' }]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>ENGINE SPEED</Text>
                  <Activity size={20} color="#22d3ee" />
                </View>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{rpm}</Text>
                  <Text style={styles.metricUnit}>RPM</Text>
                </View>
              </View>
              
              <View style={[styles.metricCard, { width: '48%', borderColor: 'rgba(192, 132, 252, 0.3)' }]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>VEHICLE SPEED</Text>
                  <Zap size={20} color="#c084fc" />
                </View>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{speed}</Text>
                  <Text style={styles.metricUnit}>KM/H</Text>
                </View>
              </View>

              <View style={[styles.smallMetricCard, { borderColor: 'rgba(236, 72, 153, 0.3)' }]}>
                <Thermometer size={16} color="#ec4899" />
                <Text style={styles.smallMetricValue}>{coolant}°</Text>
                <Text style={styles.metricLabel}>COOLANT</Text>
              </View>

              <View style={[styles.smallMetricCard, { borderColor: 'rgba(96, 165, 250, 0.3)' }]}>
                <Wind size={16} color="#60a5fa" />
                <Text style={styles.smallMetricValue}>{maf}</Text>
                <Text style={styles.metricLabel}>MAF (g/s)</Text>
              </View>

              <View style={[styles.smallMetricCard, { borderColor: 'rgba(52, 211, 153, 0.3)' }]}>
                <Cpu size={16} color="#34d399" />
                <Text style={styles.smallMetricValue}>{engineLoad}%</Text>
                <Text style={styles.metricLabel}>LOAD</Text>
              </View>

              <View style={[styles.smallMetricCard, { borderColor: 'rgba(148, 163, 184, 0.3)' }]}>
                <Activity size={16} color="#94a3b8" />
                <Text style={styles.smallMetricValue}>{throttle}%</Text>
                <Text style={styles.metricLabel}>THROTTLE</Text>
              </View>
            </View>

            <View style={styles.chartContainer}>
              <View style={styles.flexRow}>
                <Activity color="#22d3ee" size={20} />
                <Text style={styles.chartTitle}>TELEMETRY STREAM</Text>
              </View>
              <LineChart
                data={{ labels: [], datasets: [{ data: rpmHistory }] }}
                width={screenWidth - 32}
                height={180}
                withDots={false}
                withInnerLines={false}
                chartConfig={{
                  backgroundColor: '#121212',
                  backgroundGradientFrom: '#121212',
                  backgroundGradientTo: '#121212',
                  color: (opacity = 1) => `rgba(34, 211, 238, ${opacity})`,
                  strokeWidth: 3,
                }}
                bezier
                style={{ marginVertical: 12, borderRadius: 12 }}
              />
            </View>

            <AIBlueprintDashboard rawReport={aiReport} />
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22d3ee" />
            <Text style={styles.loadingText}>ESTABLISHING LINK...</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  scrollContent: { padding: 16 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end', justifyContent: 'center', marginTop: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoText: { color: 'white', fontSize: 26, fontWeight: '300', letterSpacing: 1 },
  logoAI: { color: '#22d3ee', fontSize: 26, fontWeight: '900', marginLeft: 4 },
  logoSub: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginLeft: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, flexWrap: 'wrap' },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 10, marginBottom: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  dtcBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#f87171', marginBottom: 5 },
  dtcDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white', marginRight: 6 },
  dtcBadgeText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  inventorBadge: { backgroundColor: '#0a0a0a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  inventorText: { color: '#c084fc', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  metricCard: { backgroundColor: '#121212', padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 12 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  metricValue: { color: 'white', fontSize: 42, fontWeight: '900', letterSpacing: -2, marginRight: 6 },
  metricUnit: { color: '#22d3ee', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  smallMetricCard: { width: '48%', backgroundColor: '#121212', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  smallMetricValue: { color: 'white', fontSize: 26, fontWeight: '900', marginTop: 12, letterSpacing: -1 },
  metricLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  chartContainer: { backgroundColor: '#121212', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16 },
  chartTitle: { color: '#cbd5e1', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginLeft: 8 },
  blueprintContainer: { marginTop: 8 },
  aiCard: { padding: 20, borderRadius: 24, backgroundColor: '#121212', borderWidth: 1, marginTop: 8 },
  aiTitle: { fontSize: 14, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
  aiBody: { color: '#94a3b8', fontSize: 14, marginTop: 12, lineHeight: 22, fontFamily: 'monospace' },
  flexRow: { flexDirection: 'row', alignItems: 'center' },
  riskCard: { padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  riskTitle: { fontSize: 16, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
  riskBody: { color: '#f8fafc', fontSize: 14, marginTop: 12, lineHeight: 24, fontFamily: 'monospace', fontWeight: 'bold' },
  drivabilityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start', marginTop: 16 },
  drivabilityText: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: 'white', marginLeft: 8 },
  riskLevelContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
  riskLevelLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  riskLevelValue: { fontSize: 36, fontWeight: '900', marginTop: 4, letterSpacing: -1 },
  strategyCard: { padding: 20, borderRadius: 24, backgroundColor: '#121212', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)', marginBottom: 12 },
  strategyTitle: { fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
  strategyBody: { color: '#cbd5e1', fontSize: 13, marginTop: 12, lineHeight: 22, fontFamily: 'monospace' },
  actionCard: { padding: 20, borderRadius: 24, backgroundColor: '#121212', borderWidth: 1, marginBottom: 12 },
  actionTitle: { color: '#fff', fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
  actionBody: { color: '#cbd5e1', fontSize: 13, marginTop: 12, lineHeight: 22, fontFamily: 'monospace' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { color: '#22d3ee', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginTop: 16 }
});