
import {
    AlignCenterOutlined,
    AlignLeftOutlined,
    AlignRightOutlined,
    BoldOutlined,
    CodeOutlined,
    FileImageOutlined,
    ItalicOutlined,
    LinkOutlined,
    OrderedListOutlined,
    RedoOutlined,
    StrikethroughOutlined,
    UnderlineOutlined,
    UndoOutlined,
    UnorderedListOutlined
} from '@ant-design/icons';
import Code from '@tiptap/extension-code';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Strike from '@tiptap/extension-strike';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Input, message, Modal, Tooltip, Upload } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseClient } from '../utility/supabaseClient';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value?: string;
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  content,
  onChange,
  placeholder = '请输入内容...',
  className = ''
}) => {
  const initialContent = value || content;
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Underline,
      Strike,
      Code,
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Dropcursor,
      Gapcursor,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
      },
    },
  });

  // Sync content updates from parent
  const lastAppliedContentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editor) return;
    const nextContent = value || content || '';
    const currentContent = editor.getHTML();
    
    // Avoid re-rendering if content is effectively the same or if it was just updated by the editor itself
    if (nextContent === currentContent) return;
    if (lastAppliedContentRef.current === nextContent) return;
    
    // Only update if the content is truly different and not empty vs <p></p>
    if (nextContent === '' && currentContent === '<p></p>') return;

    lastAppliedContentRef.current = nextContent;
    editor.commands.setContent(nextContent, { emitUpdate: false });
  }, [value, content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setIsLinkModalVisible(true);
  }, [editor]);

  const handleLinkOk = () => {
    if (!editor) return;
    
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    
    setIsLinkModalVisible(false);
    setLinkUrl('');
  };

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `cms-uploads/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('images') // Ensure this bucket exists or use a common one
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabaseClient.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`图片上传失败: ${errorMessage}`);
      return null;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleImageUpload = async (options: { file: any; onSuccess?: (body: any) => void; onError?: (error: any) => void }) => {
    const { file, onSuccess, onError } = options;
    try {
      const url = await uploadImage(file as File);
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run();
        onSuccess?.(url);
      } else {
        onError?.(new Error('Upload failed'));
      }
    } catch (err) {
      onError?.(err);
    }
  };

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    isActive = false, 
    onClick, 
    icon, 
    tooltip 
  }: { 
    isActive?: boolean; 
    onClick: () => void; 
    icon: React.ReactNode; 
    tooltip: string 
  }) => (
    <Tooltip title={tooltip}>
      <button
        type="button"
        onClick={onClick}
        className={isActive ? 'is-active' : ''}
      >
        {icon}
      </button>
    </Tooltip>
  );

  return (
    <div className={`rich-text-editor-container ${className}`}>
      <div className="rich-text-editor-toolbar">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={<BoldOutlined />}
          tooltip="加粗"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={<ItalicOutlined />}
          tooltip="斜体"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          icon={<StrikethroughOutlined />}
          tooltip="删除线"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          icon={<UnderlineOutlined />}
          tooltip="下划线"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          icon={<CodeOutlined />}
          tooltip="代码"
        />
        
        <div className="divider" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          icon={<span>H1</span>}
          tooltip="标题 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={<span>H2</span>}
          tooltip="标题 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          icon={<span>H3</span>}
          tooltip="标题 3"
        />
        
        <div className="divider" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={<UnorderedListOutlined />}
          tooltip="无序列表"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={<OrderedListOutlined />}
          tooltip="有序列表"
        />
        
        <div className="divider" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          icon={<AlignLeftOutlined />}
          tooltip="左对齐"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          icon={<AlignCenterOutlined />}
          tooltip="居中对齐"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          icon={<AlignRightOutlined />}
          tooltip="右对齐"
        />

        <div className="divider" />

        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          icon={<LinkOutlined />}
          tooltip="链接"
        />
        <Tooltip title="插入图片">
            <Upload 
                accept="image/*" 
                showUploadList={false} 
                customRequest={handleImageUpload}
            >
                <button type="button">
                    <FileImageOutlined />
                </button>
            </Upload>
        </Tooltip>

        <div className="divider" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          icon={<UndoOutlined />}
          tooltip="撤销"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          icon={<RedoOutlined />}
          tooltip="重做"
        />
      </div>

      <EditorContent editor={editor} />

      <Modal
        title="设置链接"
        open={isLinkModalVisible}
        onOk={handleLinkOk}
        onCancel={() => {
            setIsLinkModalVisible(false);
            setLinkUrl('');
        }}
      >
        <Input 
            placeholder="请输入链接地址" 
            value={linkUrl} 
            onChange={(e) => setLinkUrl(e.target.value)} 
        />
      </Modal>
    </div>
  );
};
