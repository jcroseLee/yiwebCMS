
import {
  AlipayCircleOutlined,
  ClockCircleOutlined,
  GiftOutlined,
  PayCircleOutlined,
  SearchOutlined,
  UserOutlined,
  WechatOutlined,
} from "@ant-design/icons";
import {
  DateField,
  FilterDropdown,
  List,
  useTable,
} from "@refinedev/antd";
import { useList } from "@refinedev/core";
import {
  Avatar,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { ExportButton } from "../../components/table/ExportButton";
import {
  BalanceType,
  BalanceTypeLabels,
  type ICoinTransaction,
  TransactionType,
  TransactionTypeLabels,
} from "../../interfaces";

const { Text } = Typography;
const { RangePicker } = DatePicker;

export const RechargeRecordList = () => {
  const { tableProps, filters, tableQueryResult } = useTable<ICoinTransaction>({
    resource: "coin_transactions",
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
    meta: {
      select: "*, user:profiles(id, nickname, avatar_url, email)",
    },
  });

  // Calculate statistics for current page
  const dataSource = tableProps.dataSource || [];

  // Extract custom stats from query result
  const { totalIncome, totalExpense } = (tableQueryResult?.data as { totalIncome?: number; totalExpense?: number } & Record<string, unknown>) || {};
  
  // Extract out_trade_no from description for recharge transactions
  const outTradeNos = dataSource
    .filter((item) => item.transaction_type === TransactionType.RECHARGE && item.description?.includes(":"))
    .map((item) => item.description.split(":")[1])
    .filter(Boolean);

  // Fetch orders to get payment method
  const { data: ordersData } = useList({
    resource: "orders",
    filters: [
      {
        field: "out_trade_no",
        operator: "in",
        value: outTradeNos.length > 0 ? outTradeNos : ["dummy"],
      },
    ],
    queryOptions: {
      enabled: outTradeNos.length > 0,
    },
    meta: {
      select: "out_trade_no, payment_method",
    },
  });

  const orderMap = new Map(
    (ordersData?.data as unknown as Array<{ out_trade_no: string; payment_method: string }>)?.map((order) => [
      order.out_trade_no,
      order.payment_method,
    ]) || []
  );

  const income = dataSource
    .filter((item) => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = dataSource
    .filter((item) => item.amount < 0)
    .reduce((sum, item) => sum + item.amount, 0);

  const getTransactionTypeColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.RECHARGE:
        return "blue";
      case TransactionType.SPEND:
        return "orange";
      case TransactionType.CHECK_IN:
        return "green";
      case TransactionType.REFUND:
        return "purple";
      case TransactionType.SYSTEM_GRANT:
        return "cyan";
      default:
        return "default";
    }
  };

  return (
    <List
      headerProps={{
        extra: (
          <ExportButton
            resource="coin_transactions"
            filters={filters}
            meta={{
              select: "*, user:profiles(nickname, email)",
            }}
            mapData={(item: unknown) => {
              const transaction = item as ICoinTransaction;
              return {
                ID: transaction.id,
                User: transaction.user?.nickname || transaction.user_id,
                Email: transaction.user?.email,
                Amount: transaction.amount,
                BalanceType: BalanceTypeLabels[transaction.balance_type],
                TransactionType: TransactionTypeLabels[transaction.transaction_type],
                Description: transaction.description,
                RelatedBatchID: transaction.related_batch_id,
                CreatedAt: dayjs(transaction.created_at).format("YYYY-MM-DD HH:mm:ss"),
              };
            }}
          />
        ),
      }}
    >
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="当前页收入总计"
              value={income}
              precision={2}
              valueStyle={{ color: "#3f8600" }}
              prefix="+"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="当前页支出总计"
              value={Math.abs(expense)}
              precision={2}
              valueStyle={{ color: "#cf1322" }}
              prefix="-"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总收入"
              value={totalIncome || 0}
              precision={2}
              valueStyle={{ color: "#3f8600" }}
              prefix="+"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总支出"
              value={Math.abs(totalExpense || 0)}
              precision={2}
              valueStyle={{ color: "#cf1322" }}
              prefix="-"
            />
          </Col>
        </Row>
      </Card>

      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex={["user", "nickname"]}
          title="用户"
          filterIcon={<SearchOutlined />}
          filterDropdown={(props) => (
            <FilterDropdown {...props}>
              <Input placeholder="搜索用户昵称" />
            </FilterDropdown>
          )}
          render={(_, record: ICoinTransaction) => (
            <Space>
              <Avatar src={record.user?.avatar_url} icon={<UserOutlined />} />
              <Space direction="vertical" size={0}>
                <Text>{record.user?.nickname || "Unknown"}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.user?.email}
                </Text>
              </Space>
            </Space>
          )}
        />

        <Table.Column
          dataIndex="transaction_type"
          title="交易类型"
          filterDropdown={(props) => (
            <FilterDropdown {...props}>
              <Select
                style={{ minWidth: 200 }}
                placeholder="选择交易类型"
                mode="multiple"
                allowClear
              >
                {Object.values(TransactionType).map((type) => (
                  <Select.Option key={type} value={type}>
                    {TransactionTypeLabels[type]}
                  </Select.Option>
                ))}
              </Select>
            </FilterDropdown>
          )}
          render={(value: TransactionType) => (
            <Tag color={getTransactionTypeColor(value)}>
              {TransactionTypeLabels[value]}
            </Tag>
          )}
        />

        <Table.Column
          dataIndex="amount"
          title="金额"
          width={80}
          render={(value: number) => {
            const isIncome = value > 0;
            return (
              <Text type={isIncome ? "success" : "danger"}>
                {isIncome ? "+" : ""}
                {value}
              </Text>
            );
          }}
        />

        <Table.Column
          dataIndex="balance_type"
          title="货币类型"
          filterDropdown={(props) => (
            <FilterDropdown {...props}>
              <Select
                style={{ minWidth: 200 }}
                placeholder="选择货币类型"
                allowClear
              >
                {Object.values(BalanceType).map((type) => (
                  <Select.Option key={type} value={type}>
                    {BalanceTypeLabels[type]}
                  </Select.Option>
                ))}
              </Select>
            </FilterDropdown>
          )}
          render={(value: BalanceType, record: ICoinTransaction) => {
            let type = value;
            // Force PAID type for recharge transactions, regardless of what DB says
            if (record.transaction_type === TransactionType.RECHARGE) {
              type = BalanceType.COIN;
            } else if (!type) {
              type = BalanceType.FREE_COIN;
            }

            return (
              <Space>
                {type === BalanceType.COIN ? (
                  <>
                    {record.transaction_type === TransactionType.RECHARGE ? (
                      (() => {
                        const outTradeNo = record.description?.split(":")[1];
                        const paymentMethod = orderMap.get(outTradeNo);
                        if (paymentMethod === "ALIPAY") {
                          return <AlipayCircleOutlined style={{ color: "#1677ff" }} />;
                        } else if (paymentMethod === "WECHAT") {
                          return <WechatOutlined style={{ color: "#52c41a" }} />;
                        }
                        return <PayCircleOutlined style={{ color: "#faad14" }} />;
                      })()
                    ) : (
                      <PayCircleOutlined style={{ color: "#faad14" }} />
                    )}
                  </>
                ) : (
                  <GiftOutlined style={{ color: "#52c41a" }} />
                )}
                <Text>
                  {BalanceTypeLabels[type]}
                  {type === BalanceType.FREE_COIN && (
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                      (有效期)
                    </Text>
                  )}
                </Text>
              </Space>
            );
          }}
        />

        <Table.Column
          dataIndex="description"
          title="描述"
          render={(value: string) => (
            <Text ellipsis={{ tooltip: value }} style={{ maxWidth: 300 }}>
              {value}
            </Text>
          )}
        />

        <Table.Column
          dataIndex="created_at"
          title="时间"
          defaultSortOrder="descend"
          sorter
          filterDropdown={(props) => (
            <FilterDropdown {...props} mapValue={(selectedKeys) => [selectedKeys?.[0], selectedKeys?.[1]]}>
              <RangePicker />
            </FilterDropdown>
          )}
          render={(value: string) => (
            <Space>
              <ClockCircleOutlined />
              <DateField value={value} format="YYYY-MM-DD HH:mm:ss" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

