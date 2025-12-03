"use client";

import React, { useState, useRef } from 'react';
import { HanoiVisualizer } from '@/components/hanoi-visualizer';
import { LogSidebar, LogEntry } from '@/components/log-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { getInitialState } from '@/lib/hanoi/hanoi-problem';
import { State } from '@/lib/maker/types';
import { Play, RotateCcw, StopCircle } from 'lucide-react';

export default function Home() {
  const [numDisks, setNumDisks] = useState(3);
  const [k, setK] = useState(3);
  const [state, setState] = useState<State>(getInitialState(3));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleReset = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setState(getInitialState(numDisks));
    setLogs([]);
  };

  const addLog = (type: LogEntry['type'], title: string, details?: any) => {
    setLogs(prev => [...prev, {
        id: Math.random().toString(36),
        step: 0, // Need to track step somewhere? Or pass it in.
        type,
        title,
        details,
        timestamp: Date.now()
    }]);
  };

  const handleStart = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]); // Clear logs on start? Or keep? Clear is better.
    
    // Initial Reset
    setState(getInitialState(numDisks));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numDisks, k }),
            signal: controller.signal
        });

        if (!response.body) throw new Error("No body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // SSE parsing (simple split)
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep last incomplete chunk

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6);
                    try {
                        const event = JSON.parse(jsonStr);
                        handleEvent(event);
                    } catch (e) {
                        console.error("Parse Error", e);
                    }
                }
            }
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            addLog('error', 'Connection Error', { error: String(error) });
        }
    } finally {
        setIsRunning(false);
        abortControllerRef.current = null;
    }
  };

  const handleEvent = (event: any) => {
    switch(event.type) {
        case 'start':
            addLog('info', 'Process Started', event.config);
            break;
        case 'step_start':
            // Don't log every step start maybe? Or do.
            // setState(event.state); // Update state on step start or complete? 
            // Step start shows the state BEFORE the move decision.
            // We probably want to visualize the updates.
            setState(event.state);
            break;
        case 'voting_update':
            // Granular logs
            const vData = event.data;
            if (vData.type === 'decision') {
                setLogs(prev => [...prev, {
                    id: Math.random().toString(36),
                    step: event.step,
                    type: 'decision',
                    title: `Decision: ${vData.reason}`,
                    details: vData.result,
                    timestamp: Date.now()
                }]);
            } else if (vData.type === 'vote_cast') {
                // Too noisy? Maybe just log progress
                setLogs(prev => [...prev, {
                    id: Math.random().toString(36),
                    step: event.step,
                    type: 'vote',
                    title: `Vote Cast (${vData.voteCount})`,
                    details: vData,
                    timestamp: Date.now()
                }]);
            } else if (vData.type === 'vote_rejected') {
                setLogs(prev => [...prev, {
                    id: Math.random().toString(36),
                    step: event.step,
                    type: 'error',
                    title: `Red Flag: ${vData.reason}`,
                    details: { raw: vData.raw, count: vData.voteCount },
                    timestamp: Date.now()
                }]);
            } else if (vData.type === 'vote_progress') {
                // Update a progress bar? Or just log.
            }
            break;
        case 'step_complete':
            setState(event.result.nextState);
            break;
        case 'solved':
            addLog('info', 'Problem Solved!', { moves: event.moves });
            break;
        case 'error':
            addLog('error', event.message);
            break;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm z-10">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">M</span>
                </div>
                <h1 className="font-bold text-xl tracking-tight">MAKER <span className="text-slate-400 font-normal">Replication</span></h1>
            </div>
            
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="sm" onClick={() => window.open('https://arxiv.org/abs/2511.09030', '_blank')}>
                    Read Paper
                 </Button>
            </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
            {/* Visualizer Area */}
            <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-light text-slate-800">Towers of Hanoi</h2>
                        <p className="text-sm text-slate-500">Massively Decomposed Agentic Process (MDAP) Demo</p>
                        <p className="text-sm text-slate-500">Objective: Rebuild the tower in the third column in as little moves as possible
                        </p>
                        <p className="text-sm text-slate-500">Instructions: Move one tile at a time, bigger tiles cannot go on top of smaller tiles</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <div className="bg-white p-2 rounded-lg border flex items-center gap-4 px-4 shadow-sm">
                            <div className="flex flex-col gap-1 min-w-[100px]">
                                <Label htmlFor="disks" className="text-xs text-slate-500">Disks ({numDisks})</Label>
                                <Slider 
                                    id="disks"
                                    min={3} max={10} step={1} 
                                    value={[numDisks]} 
                                    onValueChange={(v) => {
                                        setNumDisks(v[0]);
                                        setState(getInitialState(v[0]));
                                        setLogs([]);
                                    }}
                                    disabled={isRunning}
                                />
                            </div>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="flex flex-col gap-1 min-w-[80px]">
                                <Label htmlFor="k" className="text-xs text-slate-500">Vote K ({k})</Label>
                                <Input 
                                    id="k"
                                    type="number" 
                                    className="h-6 w-16 text-xs" 
                                    value={k} 
                                    onChange={(e) => setK(Number(e.target.value))}
                                    disabled={isRunning}
                                />
                            </div>
                         </div>

                         <div className="flex items-center gap-2 ml-4">
                            {!isRunning ? (
                                <Button onClick={handleStart} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Play className="w-4 h-4 mr-2" /> Start Solve
                                </Button>
                            ) : (
                                <Button onClick={handleReset} variant="destructive">
                                    <StopCircle className="w-4 h-4 mr-2" /> Stop
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={handleReset} disabled={isRunning}>
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                         </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <HanoiVisualizer state={state} numDisks={numDisks} />
                </div>
            </div>

            {/* Sidebar */}
            <div className="w-[400px] shrink-0 h-full border-l shadow-xl z-20">
                <LogSidebar logs={logs} />
            </div>
        </main>
    </div>
  );
}
