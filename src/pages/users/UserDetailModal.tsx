import { FileTextOutlined, GiftOutlined, PayCircleOutlined, UserOutlined } from "@ant-design/icons";
import { Tooltip as AntdTooltip, Avatar, Card, Col, Descriptions, Modal, Row, Space, Spin, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { FilterValue, SorterResult, SortOrder } from "antd/es/table/interface";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabaseClient } from "../../utility/supabaseClient";

interface UserDetailModalProps {
  visible: boolean;
  onCancel: () => void;
  userId: string | null;
}

interface UserInfo {
  id: string;
  nickname: string;
  avatar_url?: string;
  created_at: string;
  is_banned?: boolean;
  title_level: number;
  coin_paid: number;
  coin_free: number;
  income_balance: number;
  exp: number;
  reputation: number;
  gift_balance?: number;
}

interface Stats {
  followersCount: number;
  followingCount: number;
  likedCount: number;
  postsCount: number;
}

interface ActivityItem {
  date: string;
  count: number;
}

const TITLE_LEVEL_MAP: Record<number, string> = {
  1: "白身",
  2: "学人",
  3: "术士",
  4: "方家",
  5: "先生",
  6: "国手",
};

type TableRow = Record<string, unknown> & { id?: string | number };

type FiltersState = Record<string, FilterValue | null | undefined>;

type SorterState = {
  field?: string | number | bigint | (string | number | bigint)[] | readonly (string | number | bigint)[];
  order?: SortOrder;
};

type FetchParams = {
  pagination?: TablePaginationConfig;
  sorter?: SorterResult<TableRow> | SorterResult<TableRow>[];
  filters?: FiltersState;
};

type DataTableProps = {
  url: string;
  columns: ColumnsType<TableRow>;
  defaultSortField?: string;
};

const DataTable = ({ url, columns, defaultSortField = 'created_at' }: DataTableProps) => {
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10, total: 0 });
  const [sorter, setSorter] = useState<SorterState>({});
  const [filters, setFilters] = useState<FiltersState>({});

  // Use refs to break dependency cycle in useCallback
  const stateRef = useRef({ pagination, sorter, filters });
  stateRef.current = { pagination, sorter, filters };

  const fetchData = useCallback(async (params: FetchParams = {}) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      const currentPagination = params.pagination || stateRef.current.pagination;
      const currentSorter = params.sorter || stateRef.current.sorter;
      const currentFilters = params.filters || stateRef.current.filters;

      const normalizedSorter = Array.isArray(currentSorter) ? currentSorter[0] : currentSorter;
      const sortField = Array.isArray(normalizedSorter?.field)
        ? normalizedSorter.field[0]
        : normalizedSorter?.field;

      const query = new URLSearchParams({
        page: String(currentPagination.current || 1),
        pageSize: String(currentPagination.pageSize || 10),
        sortField: String(sortField || defaultSortField),
        sortOrder: normalizedSorter?.order === 'ascend' ? 'asc' : 'desc',
      });

      // Add filters to query
      Object.keys(currentFilters).forEach(key => {
        const filterValue = currentFilters[key];
        if (filterValue != null) {
          if (Array.isArray(filterValue)) {
             filterValue.forEach((val) => query.append(key, String(val)));
          } else {
             query.append(key, String(filterValue));
          }
        }
      });

      const res = await fetch(`${url}?${query.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) throw new Error("Failed to fetch data");
      
      const json = await res.json();
      setData(json.data || []);
      setPagination({ 
        ...currentPagination, 
        total: json.total || 0 
      });
      if (normalizedSorter) {
        setSorter({
          field: normalizedSorter.field,
          order: normalizedSorter.order ?? undefined,
        });
      }
      setFilters(currentFilters);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [defaultSortField, url]);

  // Initial fetch
  useEffect(() => {
    fetchData({ pagination: { current: 1, pageSize: 10 } });
  }, [fetchData, url]);

  const handleTableChange = (
    pag: TablePaginationConfig,
    filt: Record<string, FilterValue | null>,
    sort: SorterResult<TableRow> | SorterResult<TableRow>[]
  ) => {
    fetchData({ pagination: pag, filters: filt, sorter: sort });
  };

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      pagination={pagination}
      loading={loading}
      onChange={handleTableChange}
      size="small"
      scroll={{ x: true }}
    />
  );
};

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ visible, onCancel, userId }) => {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [activityData, setActivityData] = useState<ActivityItem[]>([]);
  const [giftCoinExpiry, setGiftCoinExpiry] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userId) {
      fetchSummary(userId);
    }
  }, [visible, userId]);

  const fetchSummary = async (uid: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`/api/admin/users/${uid}/summary`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error("Failed to fetch user details");

      const data = await response.json();
      setUserInfo(data.user);
      setStats(data.stats);
      setActivityData(data.activityData);
      setGiftCoinExpiry(data.giftCoinExpiry);

    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card size="small" title="粉丝数">
            <Typography.Title level={3}>{stats.followersCount || 0}</Typography.Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" title="关注数">
            <Typography.Title level={3}>{stats.followingCount || 0}</Typography.Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" title="获赞数">
            <Typography.Title level={3}>{stats.likedCount || 0}</Typography.Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" title="发帖数">
            <Typography.Title level={3}>{stats.postsCount || 0}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card size="small" title="30天活跃趋势">
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => dayjs(val).format('MM-DD')}
              />
              <YAxis allowDecimals={false} />
              <Tooltip 
                labelFormatter={(val) => dayjs(val).format('YYYY-MM-DD')}
              />
              <Line type="monotone" dataKey="count" stroke="#1890ff" strokeWidth={2} name="活跃度" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Space>
  );

  return (
    <Modal
      title="用户详情"
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {userInfo && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="头像">
                <Avatar src={userInfo.avatar_url} icon={<UserOutlined />} size={64} />
              </Descriptions.Item>
              <Descriptions.Item label="昵称">
                <Space>
                  <Typography.Text strong>{userInfo.nickname}</Typography.Text>
                  {userInfo.is_banned && <Tag color="error">已封禁</Tag>}
                  <Tag color="blue">{TITLE_LEVEL_MAP[userInfo.title_level] || "白身"}</Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="用户ID">
                <Typography.Text copyable>{userInfo.id}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {dayjs(userInfo.created_at).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
              <Descriptions.Item label="储值余额">
                {userInfo.coin_paid || 0} 币
              </Descriptions.Item>
              <Descriptions.Item label="赠币余额">
                <Space>
                  <span>{userInfo.coin_free || 0} 币</span>
                  {giftCoinExpiry && (
                    <Tag color="warning">
                      最近过期: {dayjs(giftCoinExpiry).format("YYYY-MM-DD")}
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="收益余额">
                {userInfo.income_balance || 0} 币
              </Descriptions.Item>
              <Descriptions.Item label="经验值">{userInfo.exp || 0}</Descriptions.Item>
              <Descriptions.Item label="声望值">{userInfo.reputation || 0}</Descriptions.Item>
            </Descriptions>

            <Tabs
              items={[
                {
                  key: "overview",
                  label: <span><UserOutlined /> 概览</span>,
                  children: renderOverview(),
                },
                {
                  key: "transactions",
                  label: <span><PayCircleOutlined /> 交易记录</span>,
                  children: (
                    <DataTable 
                      url={`/api/admin/users/${userId}/transactions`}
                      columns={[
                        { 
                          title: "类型", 
                          dataIndex: "type", 
                          width: 100,
                          filters: [
                            { text: '充值', value: 'recharge' },
                            { text: '消费', value: 'consume' },
                            { text: '转账', value: 'transfer' },
                            { text: '退款', value: 'refund' }
                          ]
                        },
                        { 
                          title: "金额", 
                          dataIndex: "amount", 
                          width: 100, 
                          render: (val: number) => val > 0 ? `+${val}` : val,
                          sorter: true 
                        },
                        { title: "描述", dataIndex: "description" },
                        { 
                          title: "时间", 
                          dataIndex: "created_at", 
                          width: 180, 
                          render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm:ss"),
                          sorter: true
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "posts",
                  label: <span><FileTextOutlined /> 帖子</span>,
                  children: (
                     <DataTable 
                      url={`/api/admin/users/${userId}/posts`}
                      columns={[
                        { title: "标题", dataIndex: "title" },
                        { title: "浏览", dataIndex: "view_count", width: 80, sorter: true },
                        { title: "点赞", dataIndex: "like_count", width: 80, sorter: true },
                        { title: "评论", dataIndex: "comment_count", width: 80, sorter: true },
                        { 
                          title: "发布时间", 
                          dataIndex: "created_at", 
                          width: 180, 
                          render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm:ss"),
                          sorter: true
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "comments",
                  label: <span><FileTextOutlined /> 评论</span>,
                  children: (
                    <DataTable 
                      url={`/api/admin/users/${userId}/comments`}
                      columns={[
                        { 
                          title: "内容", 
                          dataIndex: "content", 
                          width: 200, 
                          ellipsis: { showTitle: false },
                          render: (val: string) => {
                            const text = val?.replace(/<[^>]+>/g, '') || '';
                            return (
                              <AntdTooltip title={
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  {text}
                                </div>
                              }>
                                <div style={{ 
                                  overflow: 'hidden', 
                                  whiteSpace: 'nowrap', 
                                  textOverflow: 'ellipsis',
                                  width: '300px' 
                                }}>
                                  {text}
                                </div>
                              </AntdTooltip>
                            );
                          }
                        },
                        { title: "所属帖子", dataIndex: ["posts", "title"], ellipsis: true },
                        { title: "点赞", dataIndex: "like_count", width: 80, sorter: true },
                        { 
                          title: "时间", 
                          dataIndex: "created_at", 
                          width: 180, 
                          render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm:ss"),
                          sorter: true
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "gifts",
                  label: <span><GiftOutlined /> 收到礼物</span>,
                  children: (
                    <DataTable 
                      url={`/api/admin/users/${userId}/gifts`}
                      columns={[
                        { title: "礼物", dataIndex: "gift_id" },
                        { title: "金额", dataIndex: "amount", sorter: true },
                        { title: "发送者", dataIndex: ["sender", "nickname"] },
                        { 
                          title: "时间", 
                          dataIndex: "created_at", 
                          width: 180, 
                          render: (val: string) => dayjs(val).format("YYYY-MM-DD HH:mm:ss"),
                          sorter: true
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Spin>
    </Modal>
  );
};
