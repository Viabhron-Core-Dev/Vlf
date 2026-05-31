import React, { useState, useEffect } from 'react';
import { SettingsOverlay } from './SettingsOverlay';
import { Download, Copy, Trash2, Power, Terminal } from 'lucide-react';
import { logger, LogEntry } from '../../lib/logger';

export const LogsOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isEnabled, setIsEnabled] = useState(logger.isEnabled);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLogs(logger.getLogs());
  }, []);

  const handleToggle = () => {
    const newState = !isEnabled;
    logger.setEnabled(newState);
    setIsEnabled(newState);
    setLogs(logger.getLogs());
  };

  const handleClear = () => {
    logger.clear();
    setLogs([]);
  };

  const handleCopy = async () => {
    const success = await logger.copyToClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <SettingsOverlay title="Debug Logs" onClose={onClose}>
      <div className="space-y-6">
        
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between border border-gray-100">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
               <Power size={20} />
             </div>
             <div>
               <p className="font-bold text-gray-900 text-sm">Log Keeper</p>
               <p className="text-xs text-gray-500 font-medium">{isEnabled ? 'Active and recording app activity' : 'Recording is paused'}</p>
             </div>
          </div>
          <button 
            onClick={handleToggle}
            className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-5 shadow-sm' : 'translate-x-0 shadow-sm'}`} />
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={handleCopy} className="flex-1 bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Copy size={16} className="text-gray-600" />
            <span className="font-bold text-xs uppercase tracking-tight text-gray-700">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button onClick={() => logger.download()} className="flex-1 bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Download size={16} className="text-gray-600" />
            <span className="font-bold text-xs uppercase tracking-tight text-gray-700">Download</span>
          </button>
          <button onClick={handleClear} className="w-12 flex-shrink-0 bg-red-50 border border-red-100 p-3 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-100 active:bg-red-200 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="bg-[#1E1E1E] rounded-2xl border border-black p-4 shadow-inner min-h-[300px] flex flex-col">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
            <Terminal size={14} /> Console Output
          </p>
          
          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 select-text pb-10">
            {logs.length === 0 ? (
              <p className="text-gray-600 italic">No logs recorded.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`flex flex-col gap-1 pb-2 border-b border-white/5 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                   <div className="flex gap-2 items-start">
                     <span className="opacity-50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                     <span className="font-bold shrink-0">[{log.level.toUpperCase()}]</span>
                     {log.component && <span className="opacity-70 shrink-0">[{log.component}]</span>}
                     <span className="break-all whitespace-pre-wrap">{log.message}</span>
                   </div>
                   {log.stack && (
                     <div className="pl-6 mt-1 opacity-50 overflow-x-auto whitespace-pre">
                       {log.stack.split('\n').slice(0, 3).join('\n')}
                     </div>
                   )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </SettingsOverlay>
  );
};
