"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Terminal, CheckCircle2, AlertCircle, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: string;
  step: number;
  type: 'info' | 'vote' | 'decision' | 'error';
  title: string;
  details?: any;
  timestamp: number;
}

interface LogSidebarProps {
  logs: LogEntry[];
  className?: string;
}

export function LogSidebar({ logs, className }: LogSidebarProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }
  }, [logs]);

  return (
    <div className={cn("flex flex-col h-full border-l bg-white", className)}>
      <div className="p-4 border-b bg-slate-50">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          System Internals
        </h2>
        <p className="text-xs text-muted-foreground">Real-time MDAP process log</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {logs.length === 0 && (
            <div className="text-center text-muted-foreground py-10 text-sm">
              Ready to initialize...
            </div>
          )}
          
          {logs.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function LogItem({ log }: { log: LogEntry }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const getIcon = () => {
    switch (log.type) {
      case 'vote': return <BrainCircuit className="w-4 h-4 text-purple-500" />;
      case 'decision': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Terminal className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <Card className={cn("border-l-4", 
        log.type === 'decision' ? "border-l-green-500" : 
        log.type === 'error' ? "border-l-red-500" : 
        log.type === 'vote' ? "border-l-purple-500" : "border-l-slate-300"
    )}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
           <div className="flex items-start gap-2 overflow-hidden">
                <div className="mt-1 shrink-0">{getIcon()}</div>
                <div>
                    <div className="text-sm font-medium leading-none mb-1">
                        <span className="text-xs text-muted-foreground mr-2 font-mono">Step {log.step}</span>
                        {log.title}
                    </div>
                    {/* Brief preview if any */}
                    {log.type === 'vote' && (
                        <div className="text-xs text-muted-foreground">
                            Candidate: {log.details?.raw?.substring(0, 50)}...
                        </div>
                    )}
                </div>
           </div>
           {log.details && (
             <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-slate-600">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
             </button>
           )}
        </div>

        {isOpen && log.details && (
            <div className="mt-3 pt-2 border-t text-xs font-mono bg-slate-50 p-2 rounded overflow-x-auto">
                <pre>{JSON.stringify(log.details, null, 2)}</pre>
            </div>
        )}
      </div>
    </Card>
  );
}

