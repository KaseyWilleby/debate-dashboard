
'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { ResourceCard } from '@/components/dashboard/learning/resource-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLearningResources } from '@/app/dashboard/learning-hub/layout';

export default function ResourceDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { resources } = useLearningResources();
    const resourceId = params.id as string;

    const resource = React.useMemo(() => {
        return resources.find(r => r.id === resourceId);
    }, [resourceId, resources]);

    if (!resource) {
        return notFound();
    }

    return (
        <div className="flex flex-col gap-6">
             <div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Resources
                </Button>
            </div>
            <ResourceCard resource={resource} />
        </div>
    );
}
