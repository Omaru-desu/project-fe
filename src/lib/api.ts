import { Project, CreateProjectInput, UpdateProjectInput } from '../types/project';
import { createBrowserSupabaseClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders(isFormData = false): Promise<HeadersInit> {
    const supabase = createBrowserSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    return {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        'Authorization': `Bearer ${session.access_token}`,
    };
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Request failed: ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

export async function getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_URL}/api/projects`, {
        headers: await authHeaders(),
    });
    return handleResponse<Project[]>(res);
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
    const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
            name: data.name,
            description: data.description ?? '',
            type: data.type,
            frame_count: 0,
        }),
    });
    return handleResponse<Project>(res);
}

export async function updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Project>(res);
}

export async function deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
    });
    return handleResponse<void>(res);
}

export async function uploadProject(id: string, data: FormData): Promise<{ upload_id: string; frame_count: number }> {
    const res = await fetch(`${API_URL}/api/projects/${id}/upload`, {
        method: 'POST',
        headers: await authHeaders(true),
        body: data,
    });
    return handleResponse<{ upload_id: string; frame_count: number }>(res);
}

export async function getProjectFrames(projectId: string): Promise<{
    frames: {
        id: string;
        upload_id: string;
        source_filename: string;
        frame_gcs_uri: string;
        status: string;
        detections: {
            id: string;
            bbox: number[];
            label_id: string;
            status: string;
            taxon: string | null;
            display_label: string;
            score: number;
            annotation_source: "machine" | "human"; 
        }[];
        frame_url: string;
    }[];
}> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/frames`, {
        headers: await authHeaders(),
    });
    return handleResponse(res);
}

export async function segmentUpload(projectId: string, uploadId: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/uploads/${uploadId}/segment`, {
        method: 'POST',
        headers: await authHeaders(),
    });
    return handleResponse<void>(res);
}

export async function getUploadStatus(uploadId: string): Promise<{
    status: string;
    total_frames: number;
    frames_processed: number;
    detections_found: number;
}> {
    const res = await fetch(`${API_URL}/api/uploads/${uploadId}/status`, {
        headers: await authHeaders(),
    });
    return handleResponse(res);
}

export async function getFramePreview(frameId: string): Promise<Blob> {
    const res = await fetch(`${API_URL}/api/frames/${frameId}/preview`, {
        headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch preview: ${res.status}`);
    return res.blob();
}

export async function reviewDetectionLabel(id: string, newLabel: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/detections/${id}/label`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ display_label: newLabel }),
    });
    return handleResponse<void>(res);
}

export async function getFrameDetections(projectId: string, frameId: string, signal?: AbortSignal) {
    try {
        const res = await fetch(`${API_URL}/api/projects/${projectId}/frames/${frameId}/detections`, {
            headers: await authHeaders(),
            signal
        });
        if (!res.ok) return { detections: [] };
        return res.json();
    } catch {
        return { detections: [] };
    }
}

export interface BoundingBoxPayload {
    bbox: number[];           // [x1, y1, x2, y2] in pixels — matches detections.bbox
    display_label: string;
    score?: number;
    notes?: string;
}
 
export interface BoundingBox {
    id: string;
    frame_id: string;
    project_id: string;
    upload_id: string | null;
    display_label: string;
    bbox: number[];
    score: number | null;
    status: string;
    annotation_source: "machine" | "human";
    created_at: string;
}
 
export async function getBoundingBoxes(
    projectId: string,
    frameId: string
): Promise<BoundingBox[]> {
    const res = await fetch(
        `${API_URL}/api/projects/${projectId}/frames/${frameId}/bounding-boxes`,
        { headers: await authHeaders() }
    );
    return handleResponse<BoundingBox[]>(res);
}
 
export async function createBoundingBox(
    projectId: string,
    frameId: string,
    data: BoundingBoxPayload
): Promise<BoundingBox> {
    const res = await fetch(
        `${API_URL}/api/projects/${projectId}/frames/${frameId}/bounding-boxes`,
        {
            method: 'POST',
            headers: await authHeaders(),
            body: JSON.stringify(data),
        }
    );
    return handleResponse<BoundingBox>(res);
}
 
export async function updateBoundingBox(
    projectId: string,
    frameId: string,
    bboxId: string,
    data: Partial<BoundingBoxPayload>
): Promise<BoundingBox> {
    const res = await fetch(
        `${API_URL}/api/projects/${projectId}/frames/${frameId}/bounding-boxes/${bboxId}`,
        {
            method: 'PUT',
            headers: await authHeaders(),
            body: JSON.stringify(data),
        }
    );
    return handleResponse<BoundingBox>(res);
}
 
export async function deleteBoundingBox(
    projectId: string,
    frameId: string,
    bboxId: string
): Promise<void> {
    const res = await fetch(
        `${API_URL}/api/projects/${projectId}/frames/${frameId}/bounding-boxes/${bboxId}`,
        {
            method: 'DELETE',
            headers: await authHeaders(),
        }
    );
    return handleResponse<void>(res);
}

export async function textSearchDetections(
    projectId: string,
    query: string,
    limit = 20,
): Promise<{ query: string; results: import('../types/project').SemanticResult[] }> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await fetch(`${API_URL}/api/projects/${projectId}/search?${params}`, {
        headers: await authHeaders(),
    });
    return handleResponse(res);
}

export async function getSimilarDetections(
    projectId: string,
    detectionId: string,
    limit = 20,
): Promise<{ detection_id: string; results: import('../types/project').SemanticResult[] }> {
    const params = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(`${API_URL}/api/projects/${projectId}/detections/${detectionId}/similar?${params}`, {
        headers: await authHeaders(),
    });
    return handleResponse(res);
}

export async function deleteDetection(detectionId: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/detections/${detectionId}`, {
        method: 'DELETE',
        headers: await authHeaders(),
    });
    return handleResponse<void>(res);
}