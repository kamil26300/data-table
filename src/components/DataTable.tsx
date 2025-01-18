import React, { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Card,
  Drawer,
  Form,
  InputNumber,
  Select,
} from "antd";
import type { TableProps } from "antd";
import { Filter, Search } from "lucide-react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

interface TableData {
  [key: string]: any;
}

interface FilterParams {
  [key: string]: any;
}

const removeDuplicateDomains = (data: TableData[]) => {
  const uniqueDomains = new Map();

  // Keep only the first occurrence of each domain
  return data.filter((item) => {
    if (item.domain && !uniqueDomains.has(item.domain)) {
      uniqueDomains.set(item.domain, true);
      return true;
    }
    return false;
  });
};

const DataTable: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<TableData[]>([]);
  const [allData, setAllData] = useState<TableData[]>([]);
  const [filteredData, setFilteredData] = useState<TableData[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [searchText, setSearchText] = useState("");
  const [sortInfo, setSortInfo] = useState<{
    field: string;
    order: "ascend" | "descend" | undefined;
  }>({
    field: "",
    order: undefined,
  });
  const [pagination, setPagination] = useState({
    current: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 20,
    total: 0,
  });

  // Extract unique values for filter options
  const getUniqueValues = (field: string) => {
    return [...new Set(allData.map((item) => item[field]))].filter(Boolean);
  };

  // Parse URL search parameters
  useEffect(() => {
    const newFilters: FilterParams = {};
    const newPagination = { ...pagination };

    // Parse filters and other params from URL
    searchParams.forEach((value, key) => {
      if (key === "sortField") {
        setSortInfo((prev) => ({ ...prev, field: value }));
      } else if (key === "sortOrder") {
        setSortInfo((prev) => ({
          ...prev,
          order: value as "ascend" | "descend",
        }));
      } else if (key === "page") {
        newPagination.current = Number(value);
      } else if (key === "pageSize") {
        newPagination.pageSize = Number(value);
      } else if (key === "searchText") {
        setSearchText(value);
      } else {
        newFilters[key] = value;
      }
    });

    setFilters(newFilters);
    setPagination(newPagination);
  }, [searchParams]);

  const updateURL = (
    newFilters: FilterParams,
    newPagination: typeof pagination,
    newSearchText?: string,
    newSortInfo?: typeof sortInfo
  ) => {
    const params = new URLSearchParams(searchParams);

    // Update pagination params
    params.set("page", newPagination.current.toString());
    params.set("pageSize", newPagination.pageSize.toString());

    // Update filters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });

    // Update search text
    if (newSearchText) {
      params.set("searchText", newSearchText);
    } else {
      params.delete("searchText");
    }

    // Update sort information
    if (newSortInfo?.field) {
      params.set("sortField", newSortInfo.field);
      if (newSortInfo.order) {
        params.set("sortOrder", newSortInfo.order);
      } else {
        params.delete("sortOrder");
      }
    } else {
      params.delete("sortField");
      params.delete("sortOrder");
    }

    setSearchParams(params);
  };

  const applyDataTransformations = (sourceData: TableData[]) => {
    let result = [...sourceData];

    // Apply filters
    if (Object.keys(filters).length > 0) {
      result = result.filter((item) => {
        return Object.keys(filters).every((key) => {
          if (!filters[key]) return true;
          if (typeof item[key] === "number") {
            if (key.includes("min")) {
              return item[key.replace("min", "")] >= filters[key];
            }
            if (key.includes("max")) {
              return item[key.replace("max", "")] <= filters[key];
            }
            return item[key] === filters[key];
          }
          return item[key]
            ?.toString()
            .toLowerCase()
            .includes(filters[key].toLowerCase());
        });
      });
    }

    // Apply search
    if (searchText) {
      result = result.filter((item) =>
        item.domain.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply sorting
    if (sortInfo.field && sortInfo.order) {
      result.sort((a, b) => {
        const aVal = a[sortInfo.field];
        const bVal = b[sortInfo.field];
        const modifier = sortInfo.order === "ascend" ? 1 : -1;

        if (typeof aVal === "string") {
          return aVal.localeCompare(bVal) * modifier;
        }
        return (aVal - bVal) * modifier;
      });
    }

    setFilteredData(result);
    return result;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "https://docs.google.com/spreadsheets/d/1vwc803C8MwWBMc7ntCre3zJ5xZtG881HKkxlIrwwxNs/gviz/tq?sheet=Sheet1&range=A1:I36592"
      );

      const jsonStr = response.data.substring(
        response.data.indexOf("{"),
        response.data.lastIndexOf("}") + 1
      );
      const jsonData = JSON.parse(jsonStr);

      // Create columns dynamically
      const dynamicColumns = jsonData.table.cols.map((col: any) => {
        const column: any = {
          title: col.label,
          dataIndex: col.label.toLowerCase().replace(/\s+/g, ""),
          sorter: true,
        };

        if (col.pattern === '"$"#,##0.00') {
          column.render = (value: number) => `$${value?.toFixed(2)}`;
        } else if (col.pattern === "0%") {
          column.render = (value: number) => `${(value * 100)?.toFixed(0)}%`;
        } else if (col.type === "number") {
          column.render = (value: number) => value?.toLocaleString() || 0;
        }

        return column;
      });

      setColumns(dynamicColumns);

      // Transform the data
      let transformedData: TableData[] = jsonData.table.rows.map((row: any) => {
        const rowData: TableData = {};
        jsonData.table.cols.forEach((col: any, index: number) => {
          const key = col.label.toLowerCase().replace(/\s+/g, "");
          rowData[key] = row.c[index]?.v ?? null;
        });
        return rowData;
      });

      // Remove duplicate domains
      transformedData = removeDuplicateDomains(transformedData);

      console.log(
        `Removed ${
          jsonData.table.rows.length - transformedData.length
        } duplicate domains`
      );

      setAllData(transformedData);

      // Apply transformations and update filtered data
      const processedData = applyDataTransformations(transformedData);

      // Update pagination
      const total = processedData.length;
      const start = (pagination.current - 1) * pagination.pageSize;
      const paginatedData = processedData.slice(
        start,
        start + pagination.pageSize
      );

      setData(paginatedData);
      setPagination((prev) => ({
        ...prev,
        total,
      }));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allData.length > 0) {
      const processedData = applyDataTransformations(allData);
      const start = (pagination.current - 1) * pagination.pageSize;
      const paginatedData = processedData.slice(
        start,
        start + pagination.pageSize
      );

      setData(paginatedData);
      setPagination((prev) => ({
        ...prev,
        total: processedData.length,
      }));
    }
  }, [searchText, filters, pagination.current, pagination.pageSize, sortInfo]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleTableChange: TableProps<TableData>["onChange"] = (
    newPagination,
    _,
    sorter: any
  ) => {
    const newSortInfo = {
      field: sorter.field,
      order: sorter.order,
    };

    setPagination({
      ...pagination,
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 20,
    });

    setSortInfo(newSortInfo);

    updateURL(
      filters,
      {
        ...pagination,
        current: newPagination.current || 1,
        pageSize: newPagination.pageSize || 20,
      },
      searchText,
      newSortInfo
    );
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
    updateURL(filters, { ...pagination, current: 1 }, value);
  };

  const handleFiltersSubmit = (values: FilterParams) => {
    setFilters(values);
    setPagination((prev) => ({ ...prev, current: 1 }));
    updateURL(values, { ...pagination, current: 1 }, searchText);
    setFilterDrawerVisible(false);
  };

  return (
    <div className="p-4">
      <Card className="mb-4">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <Input
              placeholder="Search by domain name..."
              prefix={<Search className="h-5 w-5 text-gray-400" />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Button
            type="primary"
            icon={<Filter className="h-4 w-4" />}
            onClick={() => setFilterDrawerVisible(true)}
            className="bg-blue-600"
          >
            Filters
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="domain"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          onChange={handleTableChange}
          loading={loading}
          scroll={{ x: true }}
        />
      </Card>

      <Drawer
        title="Filter Data"
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        visible={filterDrawerVisible}
        width={320}
      >
        <Form
          layout="vertical"
          onFinish={handleFiltersSubmit}
          initialValues={filters}
        >
          {columns.map((column) => {
            const fieldName = column.dataIndex;
            if (["niche1", "language"].includes(fieldName)) {
              return (
                <Form.Item
                  key={fieldName}
                  name={fieldName}
                  label={column.title}
                >
                  <Select allowClear>
                    {getUniqueValues(fieldName).map((value) => (
                      <Select.Option key={value} value={value}>
                        {value}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }
            return null;
          })}

          <Form.Item label="Traffic Range">
            <Input.Group compact>
              <Form.Item name="trafficMin" noStyle>
                <InputNumber placeholder="Min" style={{ width: "50%" }} />
              </Form.Item>
              <Form.Item name="trafficMax" noStyle>
                <InputNumber placeholder="Max" style={{ width: "50%" }} />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item label="Price Range">
            <Input.Group compact>
              <Form.Item name="priceMin" noStyle>
                <InputNumber
                  placeholder="Min"
                  style={{ width: "50%" }}
                  prefix="$"
                />
              </Form.Item>
              <Form.Item name="priceMax" noStyle>
                <InputNumber
                  placeholder="Max"
                  style={{ width: "50%" }}
                  prefix="$"
                />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setFilters({});
                setPagination((prev) => ({ ...prev, current: 1 }));
                updateURL({}, { ...pagination, current: 1 }, "");
                setFilterDrawerVisible(false);
              }}
            >
              Reset
            </Button>
            <Button type="primary" htmlType="submit" className="bg-blue-600">
              Apply Filters
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  );
};

export default DataTable;
