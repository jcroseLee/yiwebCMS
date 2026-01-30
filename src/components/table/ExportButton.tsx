import { DownloadOutlined } from "@ant-design/icons";
import { type CrudFilters, type CrudSorting, useExport } from "@refinedev/core";
import { Button, Tooltip } from "antd";
import React from "react";

interface ExportButtonProps {
    resource?: string; // Optional: resource name, defaults to current resource context
    meta?: Record<string, unknown>; // Optional: meta data for the data provider
    filters?: CrudFilters; // Optional: filters to apply to the export
    sorters?: CrudSorting; // Optional: sorters to apply to the export
    mapData?: (item: unknown) => Record<string, unknown>; // Optional: function to map data before export
    filename?: string; // Optional: filename for the exported file
}

export const ExportButton: React.FC<ExportButtonProps> = ({
    resource,
    meta,
    filters,
    sorters,
    mapData,
    filename,
}) => {
    const { isLoading, triggerExport } = useExport({
        resource,
        meta,
        filters,
        sorters,
        mapData,
        maxItemCount: 1000, // Limit to 1000 items for safety, adjustable
        pageSize: 50, // Fetch in chunks of 50
        download: true,
        exportOptions: {
            filename: filename || "export",
        },
    });

    return (
        <Tooltip title="导出数据 (CSV)">
            <Button
                icon={<DownloadOutlined />}
                loading={isLoading}
                onClick={triggerExport}
            >
                导出
            </Button>
        </Tooltip>
    );
};
