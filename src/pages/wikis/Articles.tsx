import {
  DeleteOutlined,
  ImportOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import { WIKI_ARTICLE_TEMPLATE } from "./templates";
import {
  CreateButton,
  DateField,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { type BaseRecord, useDeleteMany, useList } from "@refinedev/core";
import { App, Button, Space, Table, Tag, Upload } from "antd";
import type { RcFile } from "antd/es/upload";
import matter from "gray-matter";
import { useState } from "react";
import { supabaseClient } from "../../utility/supabaseClient";

interface IWikiArticle {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface IWikiCategory {
  id: string;
  name: string;
}

export const WikiArticleList = () => {
  const { message } = App.useApp();
  const { tableProps, tableQueryResult } = useTable<IWikiArticle>({
    resource: "wiki_articles",
    meta: {
      select: "*, wiki_categories(id, name)",
    },
    sorters: {
        initial: [
            {
                field: "created_at",
                order: "desc",
            },
        ],
    },
  });

  const { mutate: deleteMany } = useDeleteMany();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Fetch all categories for import mapping
  // We fetch strictly needed fields to minimize payload
  const { data: categoriesData } = useList<IWikiCategory>({
    resource: "wiki_categories",
    pagination: { mode: "off" },
  });

  const handleImport = async (file: RcFile) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const { data, content } = matter(text);
        
        // 1. Resolve Category
        let categoryId = null;
        if (data.category && categoriesData?.data) {
          const category = categoriesData.data.find(
            (c) => c.name === data.category
          );
          if (category) {
            categoryId = category.id;
          } else {
             // Optional: Create category if not exists? For now, leave null or default.
             console.warn(`Category ${data.category} not found.`);
          }
        }

        // 2. Resolve Related Books
        let relatedBookIds: string[] = [];
        if (data.related_books && Array.isArray(data.related_books)) {
           const { data: books } = await supabaseClient
             .from('library_books')
             .select('id, title')
             .in('title', data.related_books);
           
           if (books) {
             relatedBookIds = books.map(b => b.id);
           }
        }

        // 3. Insert Article
        const { data: insertedArticle, error } = await supabaseClient.from("wiki_articles").insert({
          title: data.title,
          slug: data.slug,
          category_id: categoryId,
          summary: data.summary,
          content: content, // Markdown content
          related_book_ids: relatedBookIds,
          status: "published", // Default to published on import
        }).select().single();

        if (error) {
            console.error("Import error:", error);
            message.error(`导入失败: ${file.name}: ${error.message}`);
        } else {
            // 4. Handle Tags
            if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
                 const { data: existingTags } = await supabaseClient
                    .from('tags')
                    .select('id, name')
                    .in('name', data.tags);
                    
                 if (existingTags && existingTags.length > 0) {
                     const tagLinks = existingTags.map(tag => ({
                         article_id: insertedArticle.id,
                         tag_id: tag.id
                     }));
                     
                     const { error: tagError } = await supabaseClient
                        .from('wiki_article_tags')
                        .insert(tagLinks);
                        
                     if (tagError) {
                         console.error("Tag link error:", tagError);
                         message.warning(`文章导入成功，但标签添加失败: ${file.name}`);
                     }
                 }
            }

            message.success(`已导入 ${file.name}`);
            tableQueryResult.refetch();
        }

      } catch (err) {
        console.error("Parse error:", err);
        message.error(`解析失败: ${file.name}`);
      }
    };
    reader.readAsText(file);
    return false; // Prevent auto upload
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const handleBatchDelete = () => {
    deleteMany(
      {
        resource: "wikis",
        ids: selectedRowKeys.map((key) => key.toString()),
      },
      {
        onSuccess: () => {
          setSelectedRowKeys([]);
          message.success("批量删除成功");
        },
      }
    );
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([WIKI_ARTICLE_TEMPLATE], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "article-template.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <List
      headerProps={{
        extra: (
          <Space>
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
            )}
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              下载模版
            </Button>
            <Upload
                beforeUpload={handleImport}
                showUploadList={false}
                multiple
                accept=".md"
            >
                <Button icon={<ImportOutlined />}>导入 Markdown</Button>
            </Upload>
            <CreateButton />
          </Space>
        ),
      }}
    >
      <Table {...tableProps} rowKey="id" rowSelection={rowSelection}>
        <Table.Column dataIndex="title" title="标题" />
        <Table.Column dataIndex="slug" title="标识符 (Slug)" />
        <Table.Column
          dataIndex={["wiki_categories", "name"]}
          title="分类"
        />
        <Table.Column
          dataIndex="status"
          title="状态"
          render={(value) => (
            <Tag color={value === "published" ? "green" : "orange"}>
              {value === "published" ? "已发布" : (value === "draft" ? "草稿" : value)}
            </Tag>
          )}
        />
        <Table.Column
          dataIndex="created_at"
          title="创建时间"
          render={(value) => <DateField value={value} format="YYYY-MM-DD HH:mm" />}
        />
        <Table.Column
          title="操作"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

