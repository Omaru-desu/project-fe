"use client";

import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import { Project, CreateProjectInput, UpdateProjectInput } from '../types/project';

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getProjects();
            setProjects(data);
        } catch {
            setError('Failed to load projects.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const createProject = async (data: CreateProjectInput) => {
        await api.createProject(data);
        await fetchProjects();
    };

    const updateProject = async (id: string, data: UpdateProjectInput) => {
        await api.updateProject(id, data);
        await fetchProjects();
    };

    const deleteProject = async (id: string) => {
        await api.deleteProject(id);
        await fetchProjects();
    };

    return {
        projects,
        loading,
        error,
        createProject,
        updateProject,
        deleteProject,
        refetch: fetchProjects,
    };
}
