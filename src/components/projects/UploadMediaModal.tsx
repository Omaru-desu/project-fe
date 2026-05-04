"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { MediaType, UploadFile } from "../../types/project";
import styles from "./UploadMediaModal.module.css";
import * as api from "./../../lib/api";

interface Props {
    projectId: string;
    onClose: () => void;
    onUploadComplete: (uploadId: string, totalFrames: number) => void;
}

export default function UploadMediaModal({ projectId, onClose, onUploadComplete }: Props) {
    const [mediaType, setMediaType] = useState<MediaType>("image");
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFiles([]);
    }, [mediaType]);

    const accept =
        mediaType === "image"
            ? "image/*"
            : mediaType === "video"
                ? "video/*"
                : ".bag";

    const pills =
        mediaType === "image"
            ? ["JPEG", "PNG", "TIFF", "RAW"]
            : mediaType === "video"
                ? ["MP4", "MOV", "AVI", "MKV"]
                : ["ROSBAG", ".BAG"];

    const dropSub =
        mediaType === "image"
            ? "Drag and drop multiple image files at once · Up to 500MB per batch"
            : mediaType === "video"
                ? "Drag and drop one video file · Frames extracted automatically"
                : "Drag and drop one rosbag file · Frames extracted automatically";

    function addFiles(rawFiles: FileList) {
        let filteredFiles = [...rawFiles];

        if (mediaType === "image") {
            filteredFiles = filteredFiles.filter(f => f.type.startsWith("image"));
        } else if (mediaType === "video") {
            filteredFiles = filteredFiles.filter(
                f => f.type.startsWith("video")
            ).slice(0, 1);
        } else if (mediaType === "rosbag") {
            filteredFiles = filteredFiles.filter(
                f => f.name.toLowerCase().endsWith(".bag")
            ).slice(0, 1);
        }

        const incoming: UploadFile[] = filteredFiles
            .filter(f => !files.find(x => x.file.name === f.name && x.file.size === f.size))
            .map(f => ({
                id: Date.now() + Math.random(),
                file: f,
                status: "queued" as const,
                progress: 0
            }));

        if (mediaType === "video" || mediaType === "rosbag") {
            setFiles(incoming.slice(0, 1));
        } else {
            setFiles(prev => [...prev, ...incoming]);
        }
    }

    function removeFile(id: number) {
        setFiles(prev => prev.filter(f => f.id !== id));
    }

    function clearAll() {
        if (uploading) return;
        setFiles([]);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
    }


    async function startUpload() {
        if (!files.length) return;
        try {
            setUploading(true);
            setFiles(prev => prev.map(f => ({ ...f, status: "uploading" as const, progress: 50 })));

            const formData = new FormData();
            files.forEach((file) => {
                formData.append("files", file.file);
            });

            const response = await api.uploadProject(projectId, formData);

            setFiles(prev => prev.map(f => ({ ...f, status: "done" as const, progress: 100 })));   
            // api.segmentUpload(projectId, response.upload_id);
            onUploadComplete(response.upload_id, response.frame_count);

        } catch (err) {
            console.error(err);
            setFiles(prev => prev.map(f => ({ ...f, status: "failed" as const })));
        } finally {
            setUploading(false);
        }
    }

    // The number of files that have been processed (successfully or unsuccessfully). Used for the overall progress bar and the "X of Y files uploaded" text
    const done = files.filter(f => f.status === "done" || f.status === "failed").length;
    // All done when every file is either done or failed (can't upload if no files or if still uploading)
    const allDone = files.length > 0 && files.every(f => f.status === "done" || f.status === "failed");
    // Can upload when there's at least one file, not currently uploading
    const canUpload = files.length > 0 && !uploading && !allDone;

    function formatSize(b: number) {
        return b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
    }

    function footerHint() {
        if (!files.length) return "No files selected";
        if (uploading) return `Uploading ${files.length} file${files.length > 1 ? "s" : ""}…`;
        if (allDone) return "All files processed";
        return `${files.length} file${files.length > 1 ? "s" : ""} ready to upload`;
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.card}>

                    {/* STEP 1 */}
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionNum}>1</div>
                        <span className={styles.sectionTitle}>Select media type</span>
                        <button className={styles.closeBtn} onClick={onClose} style={{ marginLeft: "auto" }}>
                            <X size={16} />
                        </button>
                    </div>
                    <div className={styles.mediaTypeBody}>
                        <div className={styles.radioGrid}>
                            <div className={`${styles.radioCard} ${mediaType === "image" ? styles.radioCardActive : ""}`} onClick={() => setMediaType("image")}>
                                <div className={styles.radioIcon}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--ocean-lt)" strokeWidth="1.8" />
                                        <circle cx="8.5" cy="8.5" r="1.5" fill="var(--ocean-lt)" />
                                        <path d="M3 16l5-5 4 4 3-3 6 6" stroke="var(--ocean-lt)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className={styles.radioText}>
                                    <div className={styles.radioLabel}>Upload Images</div>
                                    <div className={styles.radioSub}>JPEG, PNG, TIFF, RAW</div>
                                </div>
                                <div className={styles.radioCheck}>
                                    <div className={`${styles.radioCheckInner} ${mediaType === "image" ? styles.radioCheckInnerActive : ""}`} />
                                </div>
                            </div>

                            <div className={`${styles.radioCard} ${mediaType === "video" ? styles.radioCardActive : ""}`} onClick={() => setMediaType("video")}>
                                <div className={styles.radioIcon}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--coral)" strokeWidth="1.8" />
                                        <path d="M10 9l7 3-7 3V9z" fill="var(--coral)" />
                                    </svg>
                                </div>
                                <div className={styles.radioText}>
                                    <div className={styles.radioLabel}>Upload Video</div>
                                    <div className={styles.radioSub}>MP4, MOV, AVI, MKV</div>
                                </div>
                                <div className={styles.radioCheck}>
                                    <div className={`${styles.radioCheckInner} ${mediaType === "video" ? styles.radioCheckInnerActive : ""}`} />
                                </div>
                            </div>

                            <div className={`${styles.radioCard} ${mediaType === "rosbag" ? styles.radioCardActive : ""}`} onClick={() => setMediaType("rosbag")}>
                                <div className={styles.radioIcon}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--teal)" strokeWidth="1.8" />
                                        <path d="M8 7h8M8 11h8M8 15h5" stroke="var(--teal)" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <div className={styles.radioText}>
                                    <div className={styles.radioLabel}>Upload Rosbag</div>
                                    <div className={styles.radioSub}>ROS bag file (.bag)</div>
                                </div>
                                <div className={styles.radioCheck}>
                                    <div className={`${styles.radioCheckInner} ${mediaType === "rosbag" ? styles.radioCheckInnerActive : ""}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2 */}
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionNum}>2</div>
                        <span className={styles.sectionTitle}>Add files</span>
                    </div>
                    <div className={styles.dropzoneBody}>
                        <div
                            className={`${styles.dropZone} ${dragOver ? styles.dropZoneDragover : ""}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            <div className={styles.dropIconWrap}>
                                <svg viewBox="0 0 28 28" fill="none">
                                    <path d="M14 4v14M9 9l5-5 5 5" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M4 20v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className={styles.dropTitle}>Drop files here or <span className={styles.dropBrowse}>browse files</span></div>
                            <div className={styles.dropSub}>{dropSub}</div>
                            <div className={styles.fileTypesRow}>
                                {pills.map(p => <span key={p} className={styles.typePill}>{p}</span>)}
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" style={{ display: "none" }} multiple accept={accept} onChange={e => e.target.files && addFiles(e.target.files)} />
                    </div>

                    {/* STEP 3 */}
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionNum}>3</div>
                        <span className={styles.sectionTitle}>Files queued</span>
                        {files.length > 0 && <span className={styles.fileCountBadge}>{files.length} file{files.length > 1 ? "s" : ""}</span>}
                    </div>
                    <div className={styles.filelistBody}>
                        {files.length === 0 ? (
                            <div className={styles.filelistEmpty}>No files added yet. Use the drop zone above to get started.</div>
                        ) : (
                            <div className={styles.fileList}>
                                {files.map(f => {
                                    const ext = f.file.name.split(".").pop()?.toUpperCase() ?? "";
                                    const isVid = f.file.type.startsWith("video") || ["MP4", "MOV", "AVI", "MKV", "WEBM"].includes(ext);
                                    const isRosbag = ext === "BAG";
                                    const statusLabel: Record<string, string> = { queued: "Queued", uploading: "Uploading", done: "Done", failed: "Failed" };

                                    let itemClass = styles.fileItem;
                                    if (f.status === "uploading") itemClass += " " + styles.fileItem_uploading;
                                    if (f.status === "done") itemClass += " " + styles.fileItem_done;
                                    if (f.status === "failed") itemClass += " " + styles.fileItem_failed;
                                    return (
                                        <div key={f.id} className={itemClass}>
                                            <div
                                                className={`${styles.fileIconBox} ${
                                                    isRosbag ? styles.fileIconRosbag : isVid ? styles.fileIconVid : styles.fileIconImg
                                                }`}
                                            >
                                                {isRosbag ? (
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--teal)" strokeWidth="1.2" />
                                                        <path d="M5 5h6M5 8h6M5 11h4" stroke="var(--teal)" strokeWidth="1.2" strokeLinecap="round" />
                                                    </svg>
                                                ) : isVid ? (
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--coral)" strokeWidth="1.2" />
                                                        <path d="M7 6l4 2-4 2V6z" fill="var(--coral)" />
                                                    </svg>
                                                ) : (
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--ocean-lt)" strokeWidth="1.2" />
                                                        <circle cx="5.5" cy="5.5" r="1" fill="var(--ocean-lt)" />
                                                        <path d="M2 11l4-4 3 3 2-2 3 3" stroke="var(--ocean-lt)" strokeWidth="1.2" strokeLinecap="round" />
                                                    </svg>
                                                )}
                                            </div>

                                            <div className={styles.fileInfo}>
                                                <div className={styles.fileName}>{f.file.name}</div>
                                                <div className={styles.fileMeta}>{formatSize(f.file.size)} · {ext}</div>
                                                {f.status === "failed" && <div className={styles.fileError}>Failed to upload — check file format or size</div>}
                                            </div>
                                            {f.status === "uploading" && (
                                                <div className={styles.spinner} />
                                            )}
                                            <span className={`${styles.fileStatusBadge} ${styles[`fileStatusBadge_${f.status}`]}`}>{statusLabel[f.status]}</span>
                                            {f.status !== "uploading" && (
                                                <button className={styles.fileRemoveBtn} onClick={() => removeFile(f.id)}>
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className={styles.footerActions}>
                        <span className={`${styles.footerHint} ${files.length > 0 ? styles.footerHintActive : ""}`}>{footerHint()}</span>
                        <div className={styles.footerRight}>
                            <button className={styles.btnClear} onClick={clearAll} disabled={!files.length || uploading}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                Clear all
                            </button>
                            <button className={styles.btnUploadMain} onClick={startUpload} disabled={!canUpload}>
                                <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><rect x="2" y="10" width="12" height="4" rx="2" stroke="currentColor" strokeWidth="1.5" /></svg>
                                <span>{uploading ? "Uploading…" : "Upload Files"}</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
}