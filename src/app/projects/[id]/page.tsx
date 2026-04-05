import ProjectPage from "./ProjectPage";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
    const { id } = await params;
    return <ProjectPage projectId={id} />;
}