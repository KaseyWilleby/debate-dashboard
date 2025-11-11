
'use client';

import * as React from 'react';
import { initialResources, type LearningResource } from '@/lib/learning-resources';

const LEARNING_RESOURCES_KEY = 'work-session-learning-resources';

export const LearningResourcesContext = React.createContext<{
    resources: LearningResource[];
    setResources: React.Dispatch<React.SetStateAction<LearningResource[]>>;
} | null>(null);

export function useLearningResources() {
    const context = React.useContext(LearningResourcesContext);
    if (!context) {
        throw new Error('useLearningResources must be used within a LearningHubLayout');
    }
    return context;
}

export default function LearningHubLayout({ children }: { children: React.ReactNode }) {
    const [resources, setResources] = React.useState<LearningResource[]>(() => {
        if (typeof window === 'undefined') {
            return initialResources;
        }
        try {
            const stored = localStorage.getItem(LEARNING_RESOURCES_KEY);
            return stored ? JSON.parse(stored) : initialResources;
        } catch (e) {
            return initialResources;
        }
    });

    React.useEffect(() => {
        localStorage.setItem(LEARNING_RESOURCES_KEY, JSON.stringify(resources));
    }, [resources]);

    return (
        <LearningResourcesContext.Provider value={{ resources, setResources }}>
            {children}
        </LearningResourcesContext.Provider>
    );
}
