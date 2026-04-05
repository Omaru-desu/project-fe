import { ProjectDetail } from '../types/project';

const DUMMY_PROJECTS: Record<string, ProjectDetail> = {
    "1": {
        id: "1",
        name: "GBR Transect 2025",
        framesProcessed: 2847,
        detections: [
            { id: "D001", label: "Acropora", taxon: "Acropora digitifera", confidence: 0.94, status: "reviewed", frameId: "F-0142", timestamp: "00:04:42", color: "teal", bbox: { x: 25, y: 20, w: 50, h: 60 } },
            { id: "D002", label: "Sea Urchin", taxon: "Diadema antillarum", confidence: 0.41, status: "needs_review", frameId: "F-0143", timestamp: "00:04:43", color: "coral", bbox: { x: 30, y: 25, w: 40, h: 50 } },
            { id: "D003", label: "Porites", taxon: "Porites lobata", confidence: 0.87, status: "reviewed", frameId: "F-0145", timestamp: "00:04:45", color: "teal", bbox: { x: 20, y: 30, w: 60, h: 40 } },
            { id: "D004", label: "Halimeda", taxon: "Halimeda macroloba", confidence: 0.55, status: "needs_review", frameId: "F-0147", timestamp: "00:04:47", color: "ocean", bbox: { x: 35, y: 15, w: 45, h: 65 } },
            { id: "D005", label: "Crown-of-Thorns", taxon: "Acanthaster planci", confidence: 0.38, status: "needs_review", frameId: "F-0149", timestamp: "00:04:49", color: "coral", bbox: { x: 15, y: 20, w: 55, h: 55 } },
            { id: "D006", label: "Turbinaria", taxon: "Turbinaria reniformis", confidence: 0.91, status: "reviewed", frameId: "F-0152", timestamp: "00:04:52", color: "teal", bbox: { x: 28, y: 22, w: 44, h: 56 } },
            { id: "D007", label: "Lobophyllia", taxon: "Lobophyllia hemprichii", confidence: 0.62, status: "needs_review", frameId: "F-0154", timestamp: "00:04:54", color: "ocean", bbox: { x: 18, y: 28, w: 58, h: 44 } },
            { id: "D008", label: "Goniastrea", taxon: "Goniastrea retiformis", confidence: 0.96, status: "reviewed", frameId: "F-0156", timestamp: "00:04:56", color: "teal", bbox: { x: 22, y: 18, w: 52, h: 62 } },
        ],
    },
    "2": {
        id: "2",
        name: "Coral Sea Survey",
        framesProcessed: 1203,
        detections: [
            { id: "D101", label: "Favites", taxon: "Favites abdita", confidence: 0.88, status: "reviewed", frameId: "F-0021", timestamp: "00:01:21", color: "teal", bbox: { x: 20, y: 25, w: 55, h: 50 } },
            { id: "D102", label: "Tridacna", taxon: "Tridacna gigas", confidence: 0.33, status: "needs_review", frameId: "F-0022", timestamp: "00:01:22", color: "coral", bbox: { x: 30, y: 30, w: 40, h: 40 } },
            { id: "D103", label: "Cyphastrea", taxon: "Cyphastrea serailia", confidence: 0.71, status: "needs_review", frameId: "F-0025", timestamp: "00:01:25", color: "ocean", bbox: { x: 25, y: 20, w: 50, h: 60 } },
        ],
    },
};

export function getProjectDetail(id: string): ProjectDetail | null {
    return DUMMY_PROJECTS[id] ?? null;
}