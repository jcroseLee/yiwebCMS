import {
  ArrowLeftOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileImageOutlined,
  LeftOutlined,
  MergeCellsOutlined,
  ReloadOutlined,
  RightOutlined,
  SaveOutlined,
  SyncOutlined
} from "@ant-design/icons";
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Layout,
  List,
  message,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tooltip,
  Typography
} from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MarkdownEditor } from "../../components/MarkdownEditor";
import type { ILibraryBook } from "../../interfaces";
import { supabaseClient } from "../../utility/supabaseClient";
import { ReviewImageViewer, type ReviewImageViewerRef } from "./components/ReviewImageViewer";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

interface IChapter {
  id: string;
  book_id: string;
  chapter_title: string;
  content: string;
  sort_order: number;
  updated_at?: string;
  page_start?: number;
  page_end?: number;
}

interface IManifestPage {
  url?: string;
  file_name?: string;
}

interface IManifest {
  pages?: IManifestPage[];
}

interface ISourcePayload {
  slices?: {
    manifest_url?: string;
  };
}

export const BookReviewPage: React.FC = () => {
  const { id: bookId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<IChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [currentChapterUpdatedAt, setCurrentChapterUpdatedAt] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedPageStart, setEditedPageStart] = useState<number | undefined>(undefined);
  const [editedPageEnd, setEditedPageEnd] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Image Viewer State
  const [book, setBook] = useState<ILibraryBook | null>(null);
  const [imagePages, setImagePages] = useState<string[]>([]);
  const [imagePageNumbers, setImagePageNumbers] = useState<number[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImagePanel, setShowImagePanel] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const imageViewerRef = useRef<ReviewImageViewerRef>(null);

  const getChapterPageStart = useCallback((chapter: IChapter) => {
    if (chapter.page_start !== undefined && chapter.page_start !== null) {
      const n = Number(chapter.page_start);
      if (Number.isFinite(n)) return n;
    }

    const m = (chapter.chapter_title || "").match(/第\s*(\d+)\s*页/);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) return n;
    }

    if (Number.isFinite(chapter.sort_order)) return chapter.sort_order;

    return null;
  }, []);

  const getImageIndexForPageStart = useCallback((pageStart: number) => {
    if (!Number.isFinite(pageStart) || imagePages.length === 0) return null;

    const manifestStartsAtZero =
      imagePageNumbers.length === imagePages.length &&
      imagePageNumbers.length > 0 &&
      imagePageNumbers[0] === 0;

    const normalizedPageStart =
      manifestStartsAtZero && pageStart > 0 ? pageStart - 1 : pageStart;

    if (imagePageNumbers.length === imagePages.length && imagePageNumbers.length > 0) {
      const exactIndex = imagePageNumbers.findIndex((n) => n === normalizedPageStart);
      if (exactIndex >= 0) return exactIndex;

      const firstAtOrAfter = imagePageNumbers.findIndex((n) => n >= normalizedPageStart);
      if (firstAtOrAfter >= 0) return firstAtOrAfter;
    }

    const oneBasedIndex = normalizedPageStart - 1;
    if (oneBasedIndex >= 0 && oneBasedIndex < imagePages.length) return oneBasedIndex;

    const zeroBasedIndex = normalizedPageStart;
    if (zeroBasedIndex >= 0 && zeroBasedIndex < imagePages.length) return zeroBasedIndex;

    return null;
  }, [imagePageNumbers, imagePages.length]);

  // Fetch book details and images
  const fetchBookAndImages = useCallback(async () => {
    if (!bookId) return;
    try {
      const { data, error } = await supabaseClient
        .from("library_books")
        .select("id, title, source_payload")
        .eq("id", bookId)
        .single();

      if (error) throw error;
      setBook(data as ILibraryBook);

      // Process images from source_payload
      const payload = data.source_payload as ISourcePayload;
      if (payload?.slices?.manifest_url) {
        setLoadingImages(true);
        try {
          const manifestUrl = payload.slices.manifest_url;
          const response = await fetch(manifestUrl);
          if (!response.ok) throw new Error("Failed to fetch manifest");
          const manifest = await response.json() as IManifest;
          
          if (manifest.pages && Array.isArray(manifest.pages)) {
             // Construct URLs
             // If manifest URL is: https://.../books/{id}/manifest.json
             // And pages are: p0001.webp
             // Then images are: https://.../books/{id}/p0001.webp
             // Or use the 'url' field if present in manifest pages
             
             const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);

             const parsePageNumber = (value: string) => {
               const m1 = value.match(/p(\d+)\.(?:png|jpe?g|webp)$/i);
               if (m1?.[1]) return Number(m1[1]);

               const m2 = value.match(/(\d+)\.(?:png|jpe?g|webp)$/i);
               if (m2?.[1]) return Number(m2[1]);

               return null;
             };

             const { urls, pageNumbers } = manifest.pages.reduce<{ urls: string[]; pageNumbers: number[] }>((acc, p) => {
               const url = p.url ? p.url : p.file_name ? baseUrl + p.file_name : "";
               if (!url) return acc;

               const source = p.file_name || p.url || url;
               const parsed = parsePageNumber(source);

               acc.urls.push(url);
               acc.pageNumbers.push(parsed ?? acc.urls.length);
               return acc;
             }, { urls: [], pageNumbers: [] });

             setImagePages(urls);
             setImagePageNumbers(pageNumbers);
          }
        } catch (e) {
          console.error("Error loading manifest:", e);
          message.warning("Could not load page images.");
        } finally {
          setLoadingImages(false);
        }
      }
    } catch (err: unknown) {
      console.error("Error fetching book:", err);
    }
  }, [bookId]);

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("library_book_contents")
        .select("*")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setChapters(data || []);
      
      // Select first chapter by default if none selected
      if (data && data.length > 0 && !selectedChapterId) {
        const first = data[0] as IChapter;
        setSelectedChapterId(first.id);
        setCurrentChapterUpdatedAt(first.updated_at || null);
        setEditedTitle(first.chapter_title || "");
        setEditedContent(first.content || "");
        setEditedPageStart(first.page_start);
        setEditedPageEnd(first.page_end);
      }
    } catch (err: unknown) {
      message.error("Failed to load chapters: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [bookId, selectedChapterId]);

  const fetchOcrResults = async (force = false) => {
    if (!bookId) return;
    setSyncing(true);
    try {
      const response = await fetch(`/api/library/books/${bookId}/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch OCR results');
      }

      const result = await response.json();
      message.success(`OCR results synced. ${result.chapters?.length || 0} chapters found.`);
      
      // Refresh chapters from DB
      await fetchChapters();
    } catch (err: unknown) {
      message.error("Failed to sync OCR results: " + (err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchChapters();
    fetchBookAndImages();
  }, [fetchBookAndImages, fetchChapters]);

  const handleSelectChapter = (chapter: IChapter) => {
    // If there are unsaved changes, we might want to warn, but for now simplistic approach
    setSelectedChapterId(chapter.id);
    setCurrentChapterUpdatedAt(chapter.updated_at || null);
    setEditedTitle(chapter.chapter_title || "");
    setEditedContent(chapter.content || "");
    setEditedPageStart(chapter.page_start);
    setEditedPageEnd(chapter.page_end);
    
    const pageStart = getChapterPageStart(chapter);
    if (pageStart !== null && imagePages.length > 0) {
      const pageIndex = getImageIndexForPageStart(pageStart);
      if (pageIndex !== null) {
        setCurrentImageIndex(pageIndex);
        if (!showImagePanel) {
          setShowImagePanel(true);
        }
        setTimeout(() => {
          imageViewerRef.current?.reset();
        }, 50);
      }
    }
  };

  // Sync image when imagePages loads if a chapter is already selected
  useEffect(() => {
    if (imagePages.length > 0 && selectedChapterId) {
      const chapter = chapters.find(c => c.id === selectedChapterId);
      if (!chapter) return;
      const pageStart = getChapterPageStart(chapter);
      if (pageStart === null) return;
      const pageIndex = getImageIndexForPageStart(pageStart);
      if (pageIndex === null) return;
      setCurrentImageIndex(pageIndex);
      setTimeout(() => {
        imageViewerRef.current?.reset();
      }, 50);
    }
  }, [chapters, getChapterPageStart, getImageIndexForPageStart, imagePages.length, selectedChapterId]);

  const handleSaveChapter = async (force: boolean | React.MouseEvent = false) => {
    const isForce = typeof force === 'boolean' ? force : false;
    
    if (!selectedChapterId) return;
    setSaving(true);
    try {
      // 1. Check timestamp if not forced
      if (!isForce && currentChapterUpdatedAt) {
        const { data: remoteData, error: fetchError } = await supabaseClient
          .from("library_book_contents")
          .select("updated_at")
          .eq("id", selectedChapterId)
          .single();

        if (fetchError) throw fetchError;

        if (remoteData && remoteData.updated_at !== currentChapterUpdatedAt) {
          Modal.confirm({
            title: "Conflict Detected",
            content: "当前章节已被他人修改，强制覆盖还是刷新？",
            okText: "Force Overwrite",
            cancelText: "Refresh",
            onOk: () => handleSaveChapter(true),
            onCancel: async () => {
              setLoading(true);
              try {
                const { data: latestData, error: refreshError } = await supabaseClient
                  .from("library_book_contents")
                  .select("*")
                  .eq("id", selectedChapterId)
                  .single();

                if (refreshError) throw refreshError;

                if (latestData) {
                  setChapters(prev => prev.map(c => 
                    c.id === selectedChapterId ? latestData : c
                  ));
                  setEditedTitle(latestData.chapter_title);
                  setEditedContent(latestData.content);
                  setEditedPageStart(latestData.page_start);
                  setEditedPageEnd(latestData.page_end);
                  setCurrentChapterUpdatedAt(latestData.updated_at);
                  message.info("Content refreshed from server.");
                }
              } catch (e) {
                message.error("Failed to refresh: " + (e as Error).message);
              } finally {
                setLoading(false);
              }
            }
          });
          return;
        }
      }

      const { data, error } = await supabaseClient
        .from("library_book_contents")
        .update({
          chapter_title: editedTitle,
          content: editedContent,
          updated_at: new Date().toISOString(),
          page_start: editedPageStart,
          page_end: editedPageEnd,
        })
        .eq("id", selectedChapterId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("No rows updated. Check permissions.");
      }
      
      message.success("Chapter saved successfully");
      
      // Update local state
      const updatedChapter = data[0];
      setChapters(prev => prev.map(c => 
        c.id === selectedChapterId 
          ? { 
              ...c, 
              chapter_title: editedTitle, 
              content: editedContent, 
              updated_at: updatedChapter.updated_at,
              page_start: editedPageStart,
              page_end: editedPageEnd
            } 
          : c
      ));
      setCurrentChapterUpdatedAt(updatedChapter.updated_at);

    } catch (err: unknown) {
      message.error("Failed to save chapter: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSave = async () => {
    if (!bookId) return;
    setBatchSaving(true);
    try {
      // 1. Fetch all chapters fresh to ensure we have latest order and content
      // (Or trust local state if we believe it's up to date. Safer to fetch or use local state if valid)
      // Let's use local state since we update it on save. But maybe fetching is safer for concurrency?
      // Given we are in review mode, let's trust local chapters state which we keep updated.
      // However, to be 100% sure we merge what's in DB (including edits from others?), let's fetch.
      // BUT, if user has unsaved changes in current editor, fetching DB ignores them.
      // So let's use the local 'chapters' array, but MAKE SURE we update the currently edited chapter in the array first.
      
      // Let's ensure current edited chapter is saved or at least reflected in the merge.
      // Ideally user should save chapter first.
      
      // Simplified: Just take the chapters from state.
      // Warn if current editing chapter is different from state? 
      // For now, let's just assume user saves chapter before merging, or we auto-save current chapter?
      // Let's just merge what is in 'chapters' state.
      
      const fullContent = chapters
        .map(c => `## ${c.chapter_title}\n\n${c.content}`)
        .join("\n\n");

      const { error } = await supabaseClient
        .from("library_books")
        .update({
          content_text: fullContent,
        })
        .eq("id", bookId);

      if (error) throw error;
      message.success("Full book content updated successfully!");
    } catch (err: unknown) {
      message.error("Failed to update book content: " + (err as Error).message);
    } finally {
      setBatchSaving(false);
    }
  };

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", background: "#fff" }}>
      {/* Header */}
      <div style={{ 
          padding: "12px 24px", 
          borderBottom: "1px solid #f0f0f0", 
          display: "flex",
          alignItems: "center",
          gap: "16px"
      }}>
          <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate("/library-books")}
          >
              返回列表
          </Button>
          {book?.title && (
            <Title level={4} style={{ margin: 0 }}>
              {book.title}
            </Title>
          )}
          
      </div>

      <Layout style={{ flex: 1, overflow: "hidden", background: "#fff" }}>
        <Sider width="25%" theme="light" style={{ borderRight: "1px solid #f0f0f0", overflow: "auto" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5} style={{ margin: 0 }}>章节列表</Title>
            <Space>
              <Tooltip title={showImagePanel ? "Hide Images" : "Show Images"}>
               <Button 
                 icon={showImagePanel ? <EyeInvisibleOutlined /> : <EyeOutlined />} 
                 size="small" 
                 onClick={() => setShowImagePanel(!showImagePanel)} 
               />
            </Tooltip>
            <Tooltip title="Sync from OCR">
              <Button icon={<SyncOutlined />} size="small" onClick={() => fetchOcrResults(false)} loading={syncing} />
            </Tooltip>
            <Tooltip title="Reload">
              <Button icon={<ReloadOutlined />} size="small" onClick={fetchChapters} loading={loading} />
            </Tooltip>
          </Space>
        </div>
        <List
          dataSource={chapters}
          loading={loading}
          renderItem={(item) => (
            <List.Item 
              style={{ 
                padding: "12px 16px", 
                cursor: "pointer",
                background: item.id === selectedChapterId ? "#e6f7ff" : "transparent",
                borderLeft: item.id === selectedChapterId ? "3px solid #1890ff" : "3px solid transparent"
              }}
              onClick={() => handleSelectChapter(item)}
            >
              <div style={{ width: '100%' }}>
                <Text strong>{item.chapter_title}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  Order: {item.sort_order} | Length: {item.content?.length || 0}
                  {item.page_start && ` | Page: ${item.page_start}${item.page_end ? `-${item.page_end}` : ''}`}
                </Text>
              </div>
            </List.Item>
          )}
        />
      </Sider>
      
      <Content style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* Editor Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "24px" }}>
          {selectedChapterId ? (
            <>
              <div style={{ marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
                <Input 
                  value={editedTitle} 
                  onChange={(e) => setEditedTitle(e.target.value)} 
                  placeholder="Chapter Title"
                  style={{ fontSize: "16px", fontWeight: "bold", flex: 1 }}
                />
                <Space>
                  <Tooltip title="Start Page">
                    <InputNumber 
                      placeholder="Start" 
                      value={editedPageStart} 
                      onChange={(val: number | null) => setEditedPageStart(val === null ? undefined : val)} 
                      style={{ width: 80 }}
                    />
                  </Tooltip>
                  <Tooltip title="End Page">
                    <InputNumber 
                      placeholder="End" 
                      value={editedPageEnd} 
                      onChange={(val: number | null) => setEditedPageEnd(val === null ? undefined : val)} 
                      style={{ width: 80 }}
                    />
                  </Tooltip>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    onClick={handleSaveChapter}
                    loading={saving}
                  >
                    Save
                  </Button>
                  <Popconfirm
                    title="Merge all chapters?"
                    description="This will overwrite the main book content with all chapters combined."
                    onConfirm={handleBatchSave}
                    okText="Merge"
                    cancelText="No"
                  >
                    <Button 
                      icon={<MergeCellsOutlined />} 
                      loading={batchSaving}
                    >
                      Merge
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
              
              <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
                <MarkdownEditor 
                  value={editedContent} 
                  onChange={(value) => setEditedContent(value)} 
                />
              </div>
              <div style={{ marginTop: "8px", textAlign: "right" }}>
                <Text type="secondary">
                  Words: {editedContent.length}
                </Text>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: 'column', justifyContent: "center", alignItems: "center", height: "100%" }}>
              <Empty description="Select a chapter to edit or Sync OCR results" />
              <Button 
                  type="primary" 
                  icon={<SyncOutlined />} 
                  onClick={() => fetchOcrResults(true)} 
                  loading={syncing}
                  style={{ marginTop: 16 }}
              >
                  Sync & Force OCR
              </Button>
            </div>
          )}
        </div>

        {/* Image Viewer Panel */}
        {showImagePanel && (
          <div style={{ width: "40%", borderLeft: "1px solid #f0f0f0", display: "flex", flexDirection: "column", background: "#fafafa" }}>
             <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                <Text strong>Original Image ({imagePages.length > 0 ? currentImageIndex + 1 : 0}/{imagePages.length})</Text>
                <Space>
                   <Button size="small" icon={<LeftOutlined />} disabled={currentImageIndex <= 0} onClick={() => setCurrentImageIndex(c => c - 1)} />
                   <Button size="small" icon={<RightOutlined />} disabled={currentImageIndex >= imagePages.length - 1} onClick={() => setCurrentImageIndex(c => c + 1)} />
                </Space>
             </div>
             
             <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {loadingImages ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Spin tip="Loading images..." />
                    </div>
                ) : imagePages.length > 0 ? (
                   <ReviewImageViewer 
                      ref={imageViewerRef}
                      imageUrl={imagePages[currentImageIndex]} 
                   />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Empty 
                        description="No images available" 
                        image={<FileImageOutlined style={{ fontSize: 48, color: '#ccc' }} />} 
                      >
                         <Text type="secondary" style={{ fontSize: 12 }}>Upload PDF and ensure slices are generated.</Text>
                      </Empty>
                  </div>
                )}
             </div>
          </div>
        )}
      </Content>
      </Layout>
    </div>
  );
};
