
'use client';

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";

export function FlowSheet({ flow, onUpdate }: { flow?: string[][], onUpdate: (flow: string[][]) => void }) {
    const defaultFlow = Array(4).fill(null).map(() => Array(4).fill(''));
    const [currentFlow, setCurrentFlow] = React.useState(flow || defaultFlow);

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newFlow = currentFlow.map((row, rIdx) => 
            rIdx === rowIndex ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell) : row
        );
        setCurrentFlow(newFlow);
        onUpdate(newFlow);
    };

    const columnHeaders = ["Constructive", "Rebuttal 1", "Rebuttal 2", "Final Focus/Crystallization"];

    return (
        <div className="overflow-x-auto">
            <div className="grid grid-cols-4 gap-2 min-w-[800px]">
                {columnHeaders.map((header, colIndex) => (
                    <div key={header} className="font-bold text-center text-sm p-2 bg-muted rounded-t-md">{header}</div>
                ))}
                {currentFlow.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        {row.map((cell, colIndex) => (
                            <Textarea
                                key={`${rowIndex}-${colIndex}`}
                                value={cell}
                                onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                className="h-24 resize-none"
                                placeholder=""
                            />
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

