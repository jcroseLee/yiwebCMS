import { Button, DatePicker, Form, type FormProps, Input, Select, Slider, Space } from "antd";
import React from "react";

const { RangePicker } = DatePicker;

export interface SearchField {
  name: string;
  label?: string; // Placeholder
  type?: "input" | "select" | "dateRange" | "slider";
  options?: { label: string; value: string | number | boolean }[];
  style?: React.CSSProperties;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: any; // Extra props for the input component
}

export interface GenericSearchFormProps {
  searchFormProps: FormProps;
  fields: SearchField[];
  onReset?: () => void;
}

export const GenericSearchForm: React.FC<GenericSearchFormProps> = ({
  searchFormProps,
  fields,
  onReset,
}) => {
  return (
    <Form
      {...searchFormProps}
      layout="inline"
      style={{ marginBottom: 16, gap: "8px", ...searchFormProps.style }}
    >
      {fields.map((field) => (
        <Form.Item key={field.name} name={field.name} noStyle>
          {field.type === "select" ? (
            <Select
              placeholder={field.label}
              style={field.style}
              options={field.options}
              allowClear
              {...field.props}
            />
          ) : field.type === "dateRange" ? (
            <RangePicker style={field.style} {...field.props} />
          ) : field.type === "slider" ? (
             <div style={{ display: 'inline-block', width: 200, verticalAlign: 'middle', marginRight: 16, ...field.style }}>
                <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>{field.label}</span>
                <Slider range defaultValue={[0, 100]} {...field.props} />
             </div>
          ) : (
            <Input
              placeholder={field.label}
              style={field.style}
              {...field.props}
            />
          )}
        </Form.Item>
      ))}
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            搜索
          </Button>
          <Button
            onClick={() => {
              searchFormProps.form?.resetFields();
              onReset?.();
            }}
          >
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};
