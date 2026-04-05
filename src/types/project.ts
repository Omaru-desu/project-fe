export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'completed' | 'archived' | 'test';
    frame_count: number;
    created_at: string;
    owner: string;
}

export interface CreateProjectInput {
    name: string;
    description?: string;
    status: 'active' | 'test';
}

export interface UpdateProjectInput {
    name?: string;
    description?: string;
    status?: 'active' | 'completed' | 'archived' | 'test';
}

export interface Detection {
    id: string;
    label: string;
    taxon: string;
    confidence: number;
    status: "reviewed" | "needs_review";
    frameId: string;
    timestamp: string;
    color: "teal" | "coral" | "ocean";
    bbox: { x: number; y: number; w: number; h: number };
}

export interface ProjectDetail {
    id: string;
    name: string;
    framesProcessed: number;
    detections: Detection[];
}
