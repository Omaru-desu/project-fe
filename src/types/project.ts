export type ProjectType = 'active' | 'test';
export type ModelType = 'pretrained' | 'custom';

export interface Project {
    id: string;
    name: string;
    description: string;
    type: ProjectType;
    model_type: ModelType;
    has_checkpoint: boolean;
    frame_count: number;
    created_at: string;
    owner: string;
    /** Optional analytics — backend may populate later. Components fall back to 0. */
    reviewed_count?: number;
    detection_count?: number;
    flagged_count?: number;
    species_count?: number;
    updated_at?: string;
}

export interface CreateProjectInput {
    name: string;
    description?: string;
    type: ProjectType;
    model_type: ModelType;
}

export interface UpdateProjectInput {
    name?: string;
    description?: string;
    type?: ProjectType;
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
    track_id?: string | null;
}

export interface SemanticResult {
    detection_id: string;
    frame_id: string;
    label_id: string;
    display_label: string;
    bbox: number[];
    score: number;
    crop_url: string | null;
    similarity: number;
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

export interface Track {
    track_id: string;
    upload_id: string;
    frame_count: number;
    representative_crop_url: string | null;
    display_label?: string | null;   // populated only if the `tracks` view exposes it; tolerate undefined
}

export type TrackEditAction =
    | { action: "assign"; track_id: string }
    | { action: "create" }
    | { action: "remove" };
