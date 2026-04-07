import { Project, CreateProjectInput, UpdateProjectInput } from '../types/project';

// mock data — replace with real API calls when backend is ready
const MOCK_PROJECTS: Project[] = [
    {
        id: '1a2b3c4d-0001-0000-0000-000000000001',
        name: 'project-reef-2025',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        type: 'active',
        frame_count: 1842,
        created_at: '2025-11-14T08:30:00Z',
        owner: 'omaru@gmail.com',
    },
    {
        id: '1a2b3c4d-0002-0000-0000-000000000002',
        name: 'project-coral-sea-2024',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        type: 'active',
        frame_count: 3210,
        created_at: '2025-08-03T14:15:00Z',
        owner: 'omaru@gmail.com',
    },
    {
        id: '1a2b3c4d-0003-0000-0000-000000000003',
        name: 'project-lord-howe-island-pilot',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        type: 'test',
        frame_count: 412,
        created_at: '2025-05-20T10:00:00Z',
        owner: 'omaru@gmail.com',
    },
    {
        id: '1a2b3c4d-0004-0000-0000-000000000004',
        name: 'project-ningaloo-deep-water-transects',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        type: 'test',
        frame_count: 677,
        created_at: '2026-01-09T09:45:00Z',
        owner: 'omaru@gmail.com',
    },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getProjects(): Promise<Project[]> {
    await delay(600);
    return [...MOCK_PROJECTS];
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
    await delay(400);
    const project: Project = {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description ?? '',
        type: data.type,
        frame_count: 0,
        created_at: new Date().toISOString(),
        owner: 'omaru@gmail.com',
    };
    MOCK_PROJECTS.push(project);
    return project;
}

export async function updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
    await delay(400);
    const index = MOCK_PROJECTS.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Project not found');
    MOCK_PROJECTS[index] = { ...MOCK_PROJECTS[index], ...data };
    return MOCK_PROJECTS[index];
}

export async function deleteProject(id: string): Promise<void> {
    await delay(400);
    const index = MOCK_PROJECTS.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Project not found');
    MOCK_PROJECTS.splice(index, 1);
}
