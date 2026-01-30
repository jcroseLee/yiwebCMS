import { ArrowRightOutlined, UserOutlined } from "@ant-design/icons";
import { useCustom, useGetIdentity, useGo } from "@refinedev/core";
import { Avatar, Card, Col, DatePicker, Grid, Row, Skeleton, Space, Statistic, Table, Tabs, Typography } from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface AnalyticsTrendRow {
    date: string;
    tool_divination_complete: number;
    ai_analysis_click: number;
    ai_pay_confirm: number;
    ai_response_complete: number;
    case_feedback_update: number;
    library_entry_click: number;
}

interface AnalyticsPayload {
    window_days?: number;
    metrics?: {
        tool_divination_complete_events: number;
        tool_divination_complete_users: number;
        ai_analysis_click_events: number;
        ai_analysis_click_users: number;
        ai_pay_confirm_events: number;
        ai_pay_confirm_users: number;
        ai_response_complete_events: number;
        ai_response_complete_users: number;
        case_feedback_update_events: number;
        case_feedback_update_users: number;
        user_checkin_events: number;
        user_checkin_users: number;
        library_entry_click_events: number;
        library_entry_click_users: number;
        ai_feedback_total: number;
    };
    north_star?: {
        ai_penetration_rate?: number;
        empirical_close_rate?: number;
    };
    trend_30d?: AnalyticsTrendRow[];
}

interface DashboardResponse {
    metrics: {
        total_users: number;
        new_users_today: number;
        pending_reports: number;
        pending_wiki_revisions: number;
        new_posts_today: number;
        new_cases_today: number;
    };
    trend: {
        date: string;
        posts: number;
        active_users: number;
    }[];
    active_users: {
        id: string;
        nickname: string;
        avatar_url: string;
        post_count: number;
        comment_count: number;
    }[];
    analytics?: AnalyticsPayload | null;
}

const GeneralDashboard: React.FC<{
    data?: DashboardResponse;
    onReportsClick: () => void;
    onWikiRevisionsClick: () => void;
}> = ({ data, onReportsClick, onWikiRevisionsClick }) => (
    <>
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
            <Col xs={24} sm={6}>
                <Card bordered={false}>
                    <Statistic 
                        title="总用户数" 
                        value={data?.metrics.total_users} 
                        prefix={<UserOutlined />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={6}>
                <Card bordered={false}>
                    <Statistic 
                        title="今日新增用户" 
                        value={data?.metrics.new_users_today} 
                        valueStyle={{ color: '#3f8600' }}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={6}>
                <Card bordered={false} hoverable onClick={onReportsClick} style={{ cursor: 'pointer' }}>
                    <Statistic 
                        title="待处理举报" 
                        value={data?.metrics.pending_reports} 
                        valueStyle={{ color: '#cf1322' }}
                        suffix={<ArrowRightOutlined style={{ fontSize: 16 }} />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={6}>
                <Card bordered={false} hoverable onClick={onWikiRevisionsClick} style={{ cursor: 'pointer' }}>
                    <Statistic 
                        title="百科待审核" 
                        value={data?.metrics.pending_wiki_revisions} 
                        valueStyle={{ color: '#faad14' }}
                        suffix={<ArrowRightOutlined style={{ fontSize: 16 }} />}
                    />
                </Card>
            </Col>
            
        </Row>

        <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
                <Card title="发帖量趋势 (近30天)" bordered={false} style={{ height: '100%', minHeight: 400 }}>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={data?.trend || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="posts" stroke="#8884d8" fill="#8884d8" name="发帖数" />
                                <Area type="monotone" dataKey="active_users" stroke="#82ca9d" fill="#82ca9d" name="活跃用户" />
                                <Legend />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Col>

            <Col xs={24} lg={12}>
                <Card title="活跃用户 Top 50" bordered={false} style={{ height: '100%', minHeight: 400 }}>
                    <Table 
                        dataSource={data?.active_users || []} 
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        size="small"
                        scroll={{ x: true }}
                        columns={[
                            {
                                title: '用户',
                                key: 'user',
                                render: (_value, record) => (
                                    <Space>
                                        <Avatar src={record.avatar_url} icon={<UserOutlined />} />
                                        <span>{record.nickname || '未知'}</span>
                                    </Space>
                                )
                            },
                            {
                                title: '发帖数',
                                dataIndex: 'post_count',
                                key: 'post_count',
                                sorter: (a, b) => a.post_count - b.post_count,
                            },
                            {
                                title: '评论数',
                                dataIndex: 'comment_count',
                                key: 'comment_count',
                                sorter: (a, b) => a.comment_count - b.comment_count,
                            }
                        ]}
                    />
                </Card>
            </Col>
        </Row>
    </>
);

const AnalyticsDashboard: React.FC<{
    analytics?: AnalyticsPayload | null;
}> = ({ analytics }) => (
    <>
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
            <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                    <Statistic title={`排盘完成 (${analytics?.window_days ?? 7}天)`} value={analytics?.metrics?.tool_divination_complete_events ?? 0} />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                    <Statistic title={`AI 点击用户 (${analytics?.window_days ?? 7}天)`} value={analytics?.metrics?.ai_analysis_click_users ?? 0} />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                    <Statistic title={`AI 支付确认 (${analytics?.window_days ?? 7}天)`} value={analytics?.metrics?.ai_pay_confirm_events ?? 0} />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                    <Statistic title={`AI 输出完成 (${analytics?.window_days ?? 7}天)`} value={analytics?.metrics?.ai_response_complete_events ?? 0} />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                    <Statistic title={`实证反馈 (${analytics?.window_days ?? 7}天)`} value={analytics?.metrics?.case_feedback_update_events ?? 0} />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                    <Statistic title={`用户签到 (${analytics?.window_days ?? 7}天)`} value={analytics?.metrics?.user_checkin_events ?? 0} />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                    <Statistic title={`藏经阁点击 (${analytics?.window_days ?? 7}天)`} value={analytics?.metrics?.library_entry_click_events ?? 0} />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card bordered={false}>
                    <Statistic title={`藏经阁用户 (${analytics?.window_days ?? 7}天)`} value={analytics?.metrics?.library_entry_click_users ?? 0} />
                </Card>
            </Col>
        </Row>

        <Row gutter={[16, 16]}>
            <Col span={24}>
                <Card title="事件趋势 (近30天)" bordered={false} style={{ height: '100%', minHeight: 400 }}>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <LineChart data={analytics?.trend_30d || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="tool_divination_complete" name="排盘" stroke="#8884d8" />
                                <Line type="monotone" dataKey="ai_response_complete" name="AI 完成" stroke="#82ca9d" />
                                <Line type="monotone" dataKey="case_feedback_update" name="反馈" stroke="#ffc658" />
                                <Line type="monotone" dataKey="library_entry_click" name="藏经阁" stroke="#ff7300" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Col>
        </Row>
    </>
);

export const DashboardPage: React.FC = () => {
    const { data: identity } = useGetIdentity<{ name: string }>();
    const go = useGo();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
        dayjs().subtract(30, 'day'),
        dayjs()
    ]);

    const { data: responseData, isLoading } = useCustom<DashboardResponse>({
        url: "/api/admin/dashboard",
        method: "get",
        config: {
            query: {
                start_date: dateRange ? dateRange[0].startOf('day').toISOString() : undefined,
                end_date: dateRange ? dateRange[1].endOf('day').toISOString() : undefined,
            }
        },
        queryOptions: {
            refetchInterval: 30000,
            keepPreviousData: true,
        }
    });

    const data = responseData?.data;
    const analytics = data?.analytics;

    const handleReportsClick = () => {
        go({
            to: { resource: "reports", action: "list" },
        });
    };

    const handleWikiRevisionsClick = () => {
        go({
            to: { resource: "wikis", action: "list" },
        });
    };

    if (isLoading) {
        return <div style={{ padding: isMobile ? "10px" : "24px" }}><Skeleton active /></div>;
    }

    return (
        <div style={{ padding: isMobile ? "10px" : "24px" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>欢迎，{identity?.name || "用户"}!</Title>
                <RangePicker 
                    value={dateRange} 
                    onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} 
                    allowClear={false}
                />
            </div>
            
            <Tabs defaultActiveKey="general" items={[
                {
                    key: 'general',
                    label: '总览',
                    children: <GeneralDashboard data={data} onReportsClick={handleReportsClick} onWikiRevisionsClick={handleWikiRevisionsClick} />,
                },
                {
                    key: 'analytics',
                    label: '埋点看板',
                    children: <AnalyticsDashboard analytics={analytics} />,
                },
            ]} />
        </div>
    );
};
