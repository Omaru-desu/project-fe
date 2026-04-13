export type ProjectType = 'active' | 'test';

export interface Project {
    id: string;
    name: string;
    description: string;
    type: ProjectType;
    frame_count: number;
    created_at: string;
    owner: string;
}

export interface CreateProjectInput {
    name: string;
    description?: string;
    type: ProjectType;
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

export type MediaType = "image" | "video";
export type FileUploadStatus = "queued" | "uploading" | "done" | "failed";

export interface UploadFile {
    id: number;
    file: File;
    status: FileUploadStatus;
    progress: number;
}

