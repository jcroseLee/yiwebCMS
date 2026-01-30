import { DateField, MarkdownField, Show, TagField } from "@refinedev/antd";
import type { IResourceComponentsProps } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { Typography } from "antd";
import React from "react";

const { Title, Text } = Typography;

export const PostShow: React.FC<IResourceComponentsProps> = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;

  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Title</Title>
      <Text>{record?.title}</Text>

      <Title level={5}>Status</Title>
      <Text>
        <TagField value={record?.status} color={record?.status === "published" ? "green" : record?.status === "rejected" ? "red" : "blue"} />
      </Text>

      <Title level={5}>Created At</Title>
      <Text>
        <DateField value={record?.createdAt} />
      </Text>

      <Title level={5}>Content</Title>
      <MarkdownField value={record?.content} />
    </Show>
  );
};
