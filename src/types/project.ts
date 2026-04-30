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
    frame_id: string;
    bbox: number[];
    label_id: string;
    status: "reviewed" | "needs_review";
    taxon: string | null;
    display_label: string;
    score: number;
    source_filename: string;
    frame_url: string;
    annotation_source: "machine" | "human"; 
}

export interface ProjectDetail {
    id: string;
    name: string;
    framesProcessed: number;
    detections: Detection[];
}

export type MediaType = "image" | "video" | "rosbag";
export type FileUploadStatus = "queued" | "uploading" | "done" | "failed";

export interface UploadFile {
    id: number;
    file: File;
    status: FileUploadStatus;
    progress: number;
}

