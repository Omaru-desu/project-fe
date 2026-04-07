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
}
