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