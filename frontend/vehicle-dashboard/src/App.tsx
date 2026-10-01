import React, { useEffect, useState } from 'react';
import mqtt from 'mqtt';
import { Activity, Zap, Thermometer, Wind, Cpu, ShieldAlert, Wrench, ListChecks, AlertTriangle, FileSearch } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TelemetryData {
  engine: { 
    rpm: number; 
    coolant_temp: number;
    load?: number;
    maf?: number;
    throttle?: number;
  };
  speed: { vehicle_speed: number };
  diagnostics: { dtc: string[] };
  ai_analysis?: { report: string };
}

const AIBlueprintDashboard = ({ rawReport }: { rawReport: string }) => {
  const parseAIReport = (report: string) => {
    if (!report || report.includes("Optimal") || report === "Awaiting live telemetry for anomalies...") return null;

    const extract = (key: string) => {
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
      <div className="p-8 bg-[#121212] border border-white/5 rounded-3xl mt-6 shadow-[0_0_20px_rgba(6,182,212,0.1)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-50"></div>
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" size={28} />
          <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-lg font-black tracking-widest uppercase">System Optimal</h2>
        </div>
        <p className="text-slate-400 mt-3 font-mono font-bold text-base">{rawReport || "Awaiting live telemetry..."}</p>
      </div>
    );
  }

  const isCritical = parsedData.risk.toUpperCase().includes('CRITICAL');
  const riskBorder = isCritical ? 'border-red-500/50' : 'border-amber-500/50';
  const riskShadow = isCritical ? 'shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'shadow-[0_0_30px_rgba(245,158,11,0.15)]';
  const riskText = isCritical ? 'text-red-500' : 'text-amber-500';
  const riskGlow = isCritical ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]';

  return (
    <div className="flex flex-col gap-5 mt-6">
      <div className={`p-8 bg-[#121212] border rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${riskBorder} ${riskShadow} relative overflow-hidden`}>
        <div className="flex-1 z-10">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={24} className={`${riskText} ${riskGlow}`} />
            <h2 className={`text-lg font-black tracking-widest uppercase ${riskText} ${riskGlow}`}>Fault Detected</h2>
          </div>
          <p className="text-white font-mono font-bold text-base leading-relaxed mb-6 drop-shadow-md">{parsedData.diagnosis}</p>
          
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[#0a0a0a] rounded-full border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <div className={`w-3 h-3 rounded-full ${
              parsedData.drivability.includes('DO_NOT_DRIVE') ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-pulse' : 
              parsedData.drivability.includes('CAUTION') ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]'
            }`} />
            <span className="text-xs font-black tracking-widest uppercase text-white">
              {parsedData.drivability}
            </span>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0 md:pl-10 md:border-l border-white/10 z-10">
          <div className="text-xs font-black tracking-widest uppercase text-slate-500 mb-1">Risk Level</div>
          <div className={`text-5xl font-black tracking-tighter ${riskText} ${riskGlow}`}>{parsedData.risk.split('-')[0] || 'N/A'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-7 bg-[#121212] border border-white/5 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.5)] relative group hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center gap-3 text-cyan-400 mb-4">
            <Zap size={20} className="drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
            <h3 className="font-black tracking-widest text-xs uppercase text-white">Fast-Fix Tip</h3>
          </div>
          <p className="text-slate-300 text-sm font-mono leading-relaxed">{parsedData.fastFix}</p>
        </div>

        <div className="p-7 bg-[#121212] border border-white/5 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.5)] relative group hover:border-purple-500/30 transition-colors">
          <div className="flex items-center gap-3 text-purple-400 mb-4">
            <FileSearch size={20} className="drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]" />
            <h3 className="font-black tracking-widest text-xs uppercase text-white">Deep-Dive Strategy</h3>
          </div>
          <p className="text-slate-300 text-sm font-mono leading-relaxed">{parsedData.deepDive}</p>
        </div>

        <div className="p-7 bg-[#121212] border border-white/5 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.5)] relative group hover:border-pink-500/30 transition-colors">
          <div className="flex items-center gap-3 text-pink-400 mb-4">
            <Wrench size={20} className="drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]" />
            <h3 className="font-black tracking-widest text-xs uppercase text-white">Parts & Tools</h3>
          </div>
          <p className="text-slate-300 text-sm font-mono leading-relaxed">{parsedData.parts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-7 bg-[#121212] border border-white/5 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 text-blue-400 mb-4">
            <ListChecks size={20} className="drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
            <h3 className="font-black tracking-widest text-xs uppercase text-white">Probable Causes</h3>
          </div>
          <p className="text-slate-300 text-sm font-mono whitespace-pre-line leading-relaxed">{parsedData.causes}</p>
        </div>

        <div className="p-7 bg-[#121212] border border-white/5 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 text-emerald-400 mb-4">
            <ListChecks size={20} className="drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
            <h3 className="font-black tracking-widest text-xs uppercase text-white">Recommended Action</h3>
          </div>
          <p className="text-slate-300 text-sm font-mono whitespace-pre-line leading-relaxed">{parsedData.action}</p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<string>("CONNECTING...");
  const [rpmHistory, setRpmHistory] = useState<{time: string, rpm: number}[]>([]);

  useEffect(() => {
    const client = mqtt.connect('ws://178.128.103.197:9001');

    client.on('connect', () => {
      setStatus("ONLINE");
      client.subscribe('telemetry/ai'); 
    });

    client.on('message', (topic, message) => {
      try {
        const parsedData = JSON.parse(message.toString());
        setData(parsedData);

        const currentRpm = parsedData?.engine?.rpm || 0;
        const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });
        
        setRpmHistory(prev => {
          const newHistory = [...prev, { time: timeNow, rpm: currentRpm }];
          if (newHistory.length > 30) newHistory.shift();
          return newHistory;
        });
      } catch (error) {
        console.error("Data Parsing Error:", error);
      }
    });

    client.on('error', () => setStatus("ERROR"));
    client.on('offline', () => setStatus("OFFLINE"));

    return () => { client.end(); };
  }, []);

  const rpm = data?.engine?.rpm || 0;
  const speed = data?.speed?.vehicle_speed || 0;
  const coolant = data?.engine?.coolant_temp || 0;
  const maf = data?.engine?.maf !== undefined ? data.engine.maf.toFixed(1) : '--';
  const engineLoad = data?.engine?.load !== undefined ? data.engine.load : '--';
  const throttle = data?.engine?.throttle !== undefined ? data.engine.throttle : '--';
  const dtc = data?.diagnostics?.dtc?.[0] || 'NONE';
  const aiReport = data?.ai_analysis?.report || "";

  return (
    <div className="min-h-screen bg-[#000000] text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-5 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3 whitespace-nowrap">
              <span>車診</span>
              <span>AI</span>
              <span className="text-xs font-black tracking-widest uppercase opacity-90">(Shashin AI)</span>
            </h1>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-[#121212] rounded-full border border-white/5 shadow-lg">
                <div className={`w-2 h-2 rounded-full ${status === "ONLINE" ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'}`} />
                <span className={`text-xs font-black tracking-widest uppercase ${status === "ONLINE" ? 'text-cyan-400' : 'text-red-500'}`}>
                  {status}
                </span>
              </div>
              {dtc !== 'NONE' && (
                <span className="px-4 py-1.5 bg-red-600 border border-red-400 text-white text-xs font-black tracking-widest uppercase rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  DTC: {dtc} - DETECTED
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="relative group cursor-default">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-70 transition duration-500"></div>
              <div className="relative bg-[#0a0a0a] px-4 py-2 rounded-lg border border-white/10 flex items-center justify-center">
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400 font-bold tracking-widest text-sm uppercase">
                   発明者 - ニポナ サハン
                 </span>
              </div>
            </div>
          </div>
        </header>

        {data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
              <div className="col-span-2 md:col-span-2 bg-[#121212] p-8 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col justify-between border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
                <div className="flex items-center justify-between mb-8 z-10">
                  <span className="text-xs font-black text-slate-500 tracking-widest uppercase">Engine Speed</span>
                  <Activity size={24} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                </div>
                <div className="flex items-baseline gap-3 z-10">
                  <span className="text-7xl font-black tracking-tighter text-white drop-shadow-md">{rpm}</span>
                  <span className="text-sm font-black text-cyan-500 tracking-widest uppercase">RPM</span>
                </div>
              </div>

              <div className="col-span-2 md:col-span-2 bg-[#121212] p-8 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col justify-between border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]"></div>
                <div className="flex items-center justify-between mb-8 z-10">
                  <span className="text-xs font-black text-slate-500 tracking-widest uppercase">Vehicle Speed</span>
                  <Zap size={24} className="text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]" />
                </div>
                <div className="flex items-baseline gap-3 z-10">
                  <span className="text-7xl font-black tracking-tighter text-white drop-shadow-md">{speed}</span>
                  <span className="text-sm font-black text-purple-500 tracking-widest uppercase">KM/H</span>
                </div>
              </div>

              <div className="bg-[#121212] p-7 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col justify-between border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <Thermometer size={20} className="text-pink-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]" />
                </div>
                <div>
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-md">{coolant}°</div>
                  <div className="text-xs font-black text-slate-500 tracking-widest mt-2 uppercase">Coolant</div>
                </div>
              </div>

              <div className="bg-[#121212] p-7 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col justify-between border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <Wind size={20} className="text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
                </div>
                <div>
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-md">{maf}</div>
                  <div className="text-xs font-black text-slate-500 tracking-widest mt-2 uppercase">MAF (g/s)</div>
                </div>
              </div>

              <div className="bg-[#121212] p-7 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col justify-between border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <Cpu size={20} className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                </div>
                <div>
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-md">{engineLoad}%</div>
                  <div className="text-xs font-black text-slate-500 tracking-widest mt-2 uppercase">Load</div>
                </div>
              </div>

              <div className="bg-[#121212] p-7 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col justify-between border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <Activity size={20} className="text-slate-400" />
                </div>
                <div>
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-md">{throttle}%</div>
                  <div className="text-xs font-black text-slate-500 tracking-widest mt-2 uppercase">Throttle</div>
                </div>
              </div>
            </div>

            <div className="bg-[#121212] p-8 rounded-3xl mt-5 shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full"></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <Activity size={24} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                <h2 className="text-xs font-black tracking-widest text-slate-300 uppercase">Telemetry Stream</h2>
              </div>
              <div className="h-56 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rpmHistory}>
                    <defs>
                      <linearGradient id="rgbGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5}/>
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.5}/>
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.5}/>
                      </linearGradient>
                      <linearGradient id="rgbStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="50%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide={true} />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#334155', color: '#fff', borderRadius: '12px', padding: '12px', boxShadow: '0 0 15px rgba(6,182,212,0.2)' }}
                      itemStyle={{ color: '#22d3ee', fontWeight: '900', fontSize: '16px' }}
                      cursor={{ stroke: '#334155', strokeWidth: 2 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rpm" 
                      stroke="url(#rgbStroke)" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#rgbGradient)" 
                      isAnimationActive={false} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <AIBlueprintDashboard rawReport={aiReport} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[500px] border border-white/5 rounded-3xl bg-[#121212] shadow-[0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/20 blur-[60px] rounded-full"></div>
             <div className="w-14 h-14 border-t-4 border-r-4 border-cyan-400 rounded-full animate-spin mb-8 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10" />
             <p className="text-sm font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 uppercase z-10">Establishing Link...</p>
          </div>
        )}
      </div>
    </div>
  );
}