import { Project, CreateProjectInput, UpdateProjectInput } from '../types/project';
import { createBrowserSupabaseClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders(): Promise<HeadersInit> {
    const supabase = createBrowserSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    return {
        'Content-Type': 'application/json',
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
