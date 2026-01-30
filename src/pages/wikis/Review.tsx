import { useTable } from "@refinedev/antd";
import { Button, Card, Descriptions, Drawer, message, Space, Table, Tabs, Tag } from "antd";
import { useState } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { supabaseClient } from "../../utility/supabaseClient";

interface WikiRevision {
  id: number;
  article_id: number;
  content: string;
  status: string;
  created_at: string;
  author_id: string;
  reason?: string;
  author?: { nickname: string; email: string };
  article?: { title: string };
}

export const WikiReviews = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const { tableProps, tableQueryResult, setFilters } = useTable<WikiRevision>({
    resource: "wiki_revisions",
    filters: {
      initial: [
        {
          field: "status",
          operator: "eq",
          value: "pending",
        },
      ],
    },
  });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<WikiRevision | null>(null);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleTabChange = (key: string) => {
    const tab = key as "pending" | "approved" | "rejected" | "all";
    setActiveTab(tab);
    
    setFilters([
      {
        field: "status",
        operator: "eq",
        value: tab === "all" ? undefined : tab,
      },
    ], "replace");
  };

  const handleReview = async (record: WikiRevision) => {
    setSelectedRevision(record);
    setDrawerVisible(true);
    setLoadingContent(true);

    try {
      // Fetch current article content
      const { data, error } = await supabaseClient
        .from("wiki_articles")
        .select("content")
        .eq("id", record.article_id)
        .single();

      if (error) throw error;
      setCurrentContent(data?.content || "");
    } catch (error) {
      if (error instanceof Error) {
        message.error("获取当前内容失败: " + error.message);
      } else {
        message.error("获取当前内容失败: 未知错误");
      }
    } finally {
      setLoadingContent(false);
    }
  };

  const handleClose = () => {
    setDrawerVisible(false);
    setSelectedRevision(null);
    setCurrentContent("");
  };

  const handleApprove = async () => {
    if (!selectedRevision) return;
    setProcessing(true);
    try {
      // 1. Update wiki_articles content
      const { error: updateError } = await supabaseClient
        .from("wiki_articles")
        .update({ content: selectedRevision.content })
        .eq("id", selectedRevision.article_id);

      if (updateError) throw updateError;

      // 2. Update revision status
      const { error: statusError } = await supabaseClient
        .from("wiki_revisions")
        .update({ status: "approved" })
        .eq("id", selectedRevision.id);

      if (statusError) throw statusError;

      message.success("审核通过，内容已更新。");
      handleClose();
      tableQueryResult.refetch();
    } catch (error) {
      if (error instanceof Error) {
        message.error("操作失败: " + error.message);
      } else {
        message.error("操作失败: 未知错误");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRevision) return;
    setProcessing(true);
    try {
      const { error } = await supabaseClient
        .from("wiki_revisions")
        .update({ status: "rejected" })
        .eq("id", selectedRevision.id);

      if (error) throw error;

      message.success("审核拒绝。");
      handleClose();
      tableQueryResult.refetch();
    } catch (error) {
      if (error instanceof Error) {
        message.error("操作失败: " + error.message);
      } else {
        message.error("操作失败: 未知错误");
      }
    } finally {
      setProcessing(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case "pending":
        return <Tag color="gold">待审核</Tag>;
      case "approved":
        return <Tag color="green">已通过</Tag>;
      case "rejected":
        return <Tag color="red">已拒绝</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const items = [
    { key: "pending", label: "待审核" },
    { key: "approved", label: "已通过" },
    { key: "rejected", label: "已拒绝" },
    { key: "all", label: "全部" },
  ];

  return (
    <>
      <Tabs activeKey={activeTab} onChange={handleTabChange} destroyOnHidden items={items} />

      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column 
          title="文章" 
          render={(record: WikiRevision) => record.article?.title || record.article_id} 
        />
        <Table.Column 
          title="提交人" 
          render={(record: WikiRevision) => record.author?.nickname || record.author?.email || record.author_id} 
        />
        <Table.Column 
          dataIndex="status" 
          title="状态" 
          render={(val) => getStatusTag(val)}
        />
        <Table.Column dataIndex="created_at" title="提交时间" render={(val) => new Date(val).toLocaleString()} />
        <Table.Column
          title="操作"
          render={(_, record: WikiRevision) => (
            <Button size="small" onClick={() => handleReview(record)}>
              {activeTab === 'pending' ? '审核' : '查看'}
            </Button>
          )}
        />
      </Table>

      <Drawer
        title={activeTab === 'pending' ? "审核修改" : "查看修改详情"}
        width="90%"
        open={drawerVisible}
        onClose={handleClose}
        extra={
          activeTab === 'pending' && (
            <Space>
              <Button danger onClick={handleReject} loading={processing}>
                拒绝
              </Button>
              <Button type="primary" onClick={handleApprove} loading={processing}>
                通过并合并
              </Button>
            </Space>
          )
        }
      >
        {selectedRevision && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="文章">{selectedRevision.article?.title || selectedRevision.article_id}</Descriptions.Item>
              <Descriptions.Item label="提交人">{selectedRevision.author?.nickname || selectedRevision.author?.email || selectedRevision.author_id}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{new Date(selectedRevision.created_at).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusTag(selectedRevision.status)}</Descriptions.Item>
            </Descriptions>

            <Card title="内容对比 (左: 当前线上内容, 右: 提交内容)" loading={loadingContent}>
              <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                <ReactDiffViewer
                  oldValue={currentContent}
                  newValue={selectedRevision.content}
                  splitView={true}
                  compareMethod={DiffMethod.WORDS}
                  styles={{
                    variables: {
                      light: {
                        diffViewerBackground: '#fff',
                        gutterBackground: '#f7f7f7',
                      }
                    }
                  }}
                />
              </div>
            </Card>
          </Space>
        )}
      </Drawer>
    </>
  );
};
