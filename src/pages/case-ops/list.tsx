import { SearchOutlined } from "@ant-design/icons";
import {
  DeleteButton,
  EditButton,
  List,
  useTable,
} from "@refinedev/antd";
import type { BaseRecord, CrudFilters, HttpError } from "@refinedev/core";
import { Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { GenericSearchForm } from "../../components/search/GenericSearchForm";

interface ICase extends BaseRecord {
  post_id: string;
  feedback_content: string;
  accuracy_rating: "accurate" | "inaccurate" | "partial";
  occurred_at: string;
  archived_at: string;
  posts: {
    id: string;
    title: string;
  };
}

interface ICaseSearch {
  title?: string;
  accuracy_rating?: "accurate" | "inaccurate" | "partial";
}

export const CaseOpsList = () => {
  const { tableProps, searchFormProps, setFilters } = useTable<ICase, HttpError, ICaseSearch>({
    resource: "case_metadata",
    meta: {
      select: "*, posts(id, title)",
    },
    sorters: {
      initial: [
        {
          field: "archived_at",
          order: "desc",
        },
      ],
    },
    onSearch: (params) => {
      const filters: CrudFilters = [];
      const { title, accuracy_rating } = params;

      if (title) {
        filters.push({
          field: "posts.title",
          operator: "contains",
          value: title,
        });
      }

      if (accuracy_rating) {
        filters.push({
          field: "accuracy_rating",
          operator: "eq",
          value: accuracy_rating,
        });
      }

      return filters;
    },
  });

  return (
    <List>
      <GenericSearchForm
        searchFormProps={searchFormProps}
        fields={[
          {
            name: "title",
            label: "帖子标题",
            type: "input",
            style: { width: 200 },
            props: {
              prefix: <SearchOutlined />,
            },
          },
          {
            name: "accuracy_rating",
            label: "准确度",
            type: "select",
            style: { width: 150 },
            options: [
              { label: "准", value: "accurate" },
              { label: "不准", value: "inaccurate" },
              { label: "部分准", value: "partial" },
            ],
          },
        ]}
        onReset={() => setFilters([], "replace")}
      />
      <Table {...tableProps} rowKey="post_id">
        <Table.Column
          dataIndex={["posts", "title"]}
          title="关联帖子"
          render={(value, record: ICase) => (
            <a
              href={`${import.meta.env.VITE_WEB_URL}/community/${record.post_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {value || record.post_id}
            </a>
          )}
        />
        <Table.Column
          dataIndex="accuracy_rating"
          title="准确度"
          render={(value) => {
            let color = "default";
            let text = "未知";
            switch (value) {
              case "accurate":
                color = "success";
                text = "准";
                break;
              case "inaccurate":
                color = "error";
                text = "不准";
                break;
              case "partial":
                color = "warning";
                text = "部分准";
                break;
            }
            return <Tag color={color}>{text}</Tag>;
          }}
        />
        <Table.Column
          dataIndex="occurred_at"
          title="应验时间"
          render={(value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-")}
        />
        <Table.Column
          dataIndex="archived_at"
          title="归档时间"
          render={(value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-")}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.post_id} />
              <DeleteButton
                hideText
                size="small"
                recordItemId={record.post_id}
                meta={{ idColumnName: "post_id" }}
              />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
