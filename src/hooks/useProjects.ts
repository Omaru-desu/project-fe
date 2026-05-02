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
        const created = await api.createProject(data);
        setProjects(prev => [created, ...prev]);
    };

    const updateProject = async (id: string, data: UpdateProjectInput) => {
        const snapshot = projects;
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
        try {
            const updated = await api.updateProject(id, data);
            setProjects(prev => prev.map(p => p.id === id ? { ...updated, frame_count: p.frame_count } : p));
        } catch (e) {
            setProjects(snapshot);
            throw e;
        }
    };

    const deleteProject = async (id: string) => {
        const snapshot = projects;
        setProjects(prev => prev.filter(p => p.id !== id));
        try {
            await api.deleteProject(id);
        } catch (e) {
            setProjects(snapshot);
            throw e;
        }
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
