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
